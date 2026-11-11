"""Read-only access to the normalized JSON snapshots produced by the crawler.

The dashboard still imports the same files at build time.  This module gives a
running Django process a small, allow-listed HTTP surface over the files so a
deployment can refresh them without rebuilding the frontend.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from django.conf import settings

SNAPSHOT_NAMES = ("weather", "quake", "heritage", "news")

SNAPSHOT_MAX_AGE_SECONDS = {
    "weather": 3 * 60 * 60,
    "quake": 24 * 60 * 60,
    "heritage": 7 * 24 * 60 * 60,
    "news": 24 * 60 * 60,
}


class SnapshotError(Exception):
    """Base class for snapshot lookup failures."""


class UnknownSnapshot(SnapshotError):
    """The requested name is not in the allow-list."""


class SnapshotUnavailable(SnapshotError):
    """The snapshot file has not been generated yet."""


class SnapshotCorrupt(SnapshotError):
    """The snapshot file exists but is not valid UTF-8 JSON."""


@dataclass(frozen=True)
class Snapshot:
    name: str
    path: Path
    payload: Any
    content: bytes
    sha256: str
    modified_at: datetime
    fetched_at: str | None
    records: int | None

    @property
    def etag(self) -> str:
        return '"%s"' % self.sha256[:32]

    @property
    def modified_timestamp(self) -> float:
        return self.modified_at.timestamp()


def snapshot_root() -> Path:
    configured = getattr(settings, "SNAPSHOT_DIR", None)
    if configured:
        return Path(configured)
    return Path(settings.BASE_DIR) / "data" / "normalized"


def manifest_path() -> Path:
    configured = getattr(settings, "SNAPSHOT_MANIFEST", None)
    if configured:
        return Path(configured)
    return snapshot_root().parent / "manifest.json"


def _path_for(name: str) -> Path:
    if name not in SNAPSHOT_NAMES:
        raise UnknownSnapshot(name)
    return snapshot_root() / ("%s.json" % name)


def _record_count(payload: Any) -> int | None:
    if not isinstance(payload, dict):
        return None
    if isinstance(payload.get("count"), int):
        return payload["count"]
    if isinstance(payload.get("cityCount"), int):
        return payload["cityCount"]
    for key in ("items", "events", "cities"):
        value = payload.get(key)
        if isinstance(value, list):
            return len(value)
    return None


def load_snapshot(name: str) -> Snapshot:
    path = _path_for(name)
    try:
        content = path.read_bytes()
    except FileNotFoundError:
        raise SnapshotUnavailable(name) from None
    except OSError as exc:
        raise SnapshotUnavailable("%s: %s" % (name, exc)) from exc

    try:
        payload = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SnapshotCorrupt(name) from exc

    fetched_at = payload.get("fetchedAt") if isinstance(payload, dict) else None
    if not isinstance(fetched_at, str):
        fetched_at = None

    return Snapshot(
        name=name,
        path=path,
        payload=payload,
        content=content,
        sha256=hashlib.sha256(content).hexdigest(),
        modified_at=datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc),
        fetched_at=fetched_at,
        records=_record_count(payload),
    )


def _manifest_runs() -> dict[str, dict[str, Any]]:
    try:
        raw = manifest_path().read_text(encoding="utf-8")
        manifest = json.loads(raw)
    except (OSError, ValueError):
        return {}

    runs = manifest.get("runs") if isinstance(manifest, dict) else None
    if not isinstance(runs, list):
        return {}

    ordered = sorted(
        (run for run in runs if isinstance(run, dict)),
        key=lambda run: str(run.get("startedAt") or ""),
        reverse=True,
    )
    latest: dict[str, dict[str, Any]] = {}
    for run in ordered:
        sources = run.get("sources")
        if not isinstance(sources, list):
            continue
        for source in sources:
            if not isinstance(source, dict):
                continue
            source_id = source.get("id")
            if source_id in SNAPSHOT_NAMES and source_id not in latest:
                latest[source_id] = source
    return latest


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def snapshot_status(now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    latest_runs = _manifest_runs()
    items = []

    for name in SNAPSHOT_NAMES:
        item: dict[str, Any] = {
            "name": name,
            "available": False,
            "endpoint": "/api/snapshots/%s/" % name,
            "maxAgeSeconds": SNAPSHOT_MAX_AGE_SECONDS[name],
        }
        try:
            snapshot = load_snapshot(name)
        except SnapshotError as exc:
            item["error"] = type(exc).__name__
        else:
            observed_at = _parse_datetime(snapshot.fetched_at) or snapshot.modified_at
            age = max(0.0, (now - observed_at).total_seconds())
            item.update(
                {
                    "available": True,
                    "bytes": len(snapshot.content),
                    "sha256": snapshot.sha256,
                    "etag": snapshot.etag,
                    "modifiedAt": snapshot.modified_at.isoformat().replace("+00:00", "Z"),
                    "fetchedAt": snapshot.fetched_at,
                    "records": snapshot.records,
                    "ageSeconds": round(age, 3),
                    "ageBasis": "fetchedAt" if snapshot.fetched_at else "modifiedAt",
                    "stale": age > SNAPSHOT_MAX_AGE_SECONDS[name],
                }
            )

        run = latest_runs.get(name)
        if run is not None:
            item["lastRun"] = {
                "status": run.get("status"),
                "records": run.get("records"),
                "elapsedMs": run.get("elapsedMs"),
                "problems": run.get("problems") or [],
            }
        items.append(item)

    return {
        "generatedAt": now.isoformat().replace("+00:00", "Z"),
        "snapshots": items,
        "staleCount": sum(1 for item in items if item.get("stale")),
    }
