import json
import tempfile
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import SimpleTestCase

from app.snapshots import SNAPSHOT_NAMES


class SnapshotApiTests(SimpleTestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.root = Path(self.folder.name)
        self.manifest = self.root / "manifest.json"
        self.fetched_at = (
            datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )
        self.weather = {
            "source": "test",
            "fetchedAt": self.fetched_at,
            "cityCount": 1,
            "cities": [{"city": "济南"}],
        }
        (self.root / "weather.json").write_text(
            json.dumps(self.weather, ensure_ascii=False), encoding="utf-8"
        )

    def tearDown(self):
        self.folder.cleanup()

    def _settings(self):
        return self.settings(SNAPSHOT_DIR=self.root, SNAPSHOT_MANIFEST=self.manifest)

    def test_index_reports_available_and_missing_snapshots(self):
        with self._settings():
            response = self.client.get("/api/snapshots/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual([item["name"] for item in payload["snapshots"]], list(SNAPSHOT_NAMES))

        weather = payload["snapshots"][0]
        self.assertTrue(weather["available"])
        self.assertEqual(weather["records"], 1)
        self.assertEqual(weather["fetchedAt"], self.fetched_at)
        self.assertEqual(weather["ageBasis"], "fetchedAt")
        self.assertFalse(weather["stale"])
        self.assertTrue(weather["etag"].startswith('"'))

        quake = payload["snapshots"][1]
        self.assertFalse(quake["available"])
        self.assertEqual(quake["error"], "SnapshotUnavailable")

    def test_status_uses_fetched_at_for_staleness(self):
        old = dict(self.weather)
        old["fetchedAt"] = "2020-01-01T00:00:00Z"
        (self.root / "weather.json").write_text(
            json.dumps(old, ensure_ascii=False), encoding="utf-8"
        )
        with self._settings():
            response = self.client.get("/api/snapshots/")
        weather = response.json()["snapshots"][0]
        self.assertTrue(weather["stale"])
        self.assertEqual(weather["ageBasis"], "fetchedAt")

    def test_detail_returns_payload_and_honours_conditional_requests(self):
        with self._settings():
            response = self.client.get("/api/snapshots/weather/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), self.weather)
            self.assertEqual(response["X-Snapshot-Fetched-At"], self.fetched_at)
            self.assertIn("max-age=60", response["Cache-Control"])
            etag = response["ETag"]
            last_modified = response["Last-Modified"]

            not_modified = self.client.get(
                "/api/snapshots/weather/", HTTP_IF_NONE_MATCH=etag
            )
            self.assertEqual(not_modified.status_code, 304)

            by_date = self.client.get(
                "/api/snapshots/weather/", HTTP_IF_MODIFIED_SINCE=last_modified
            )
            self.assertEqual(by_date.status_code, 304)

            head = self.client.head("/api/snapshots/weather/")
            self.assertEqual(head.status_code, 200)
            self.assertEqual(head.content, b"")

    def test_detail_rejects_unknown_and_unavailable_names(self):
        with self._settings():
            self.assertEqual(self.client.get("/api/snapshots/unknown/").status_code, 404)
            missing = self.client.get("/api/snapshots/news/")
        self.assertEqual(missing.status_code, 503)
        self.assertEqual(missing.json()["error"], "snapshot_unavailable")

    def test_detail_reports_corrupt_files(self):
        (self.root / "news.json").write_text("{not json", encoding="utf-8")
        with self._settings():
            response = self.client.get("/api/snapshots/news/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"], "snapshot_corrupt")

    def test_status_uses_the_latest_manifest_run_per_source(self):
        manifest = {
            "updatedAt": "2026-11-10T09:00:00Z",
            "runs": [
                {
                    "startedAt": "2026-11-10T09:00:00Z",
                    "sources": [
                        {
                            "id": "weather",
                            "status": "ok",
                            "records": 1,
                            "elapsedMs": 10,
                            "problems": [],
                        }
                    ],
                },
                {
                    "startedAt": "2026-11-10T08:00:00Z",
                    "sources": [
                        {"id": "weather", "status": "failed", "records": 0}
                    ],
                },
            ],
        }
        self.manifest.write_text(json.dumps(manifest), encoding="utf-8")
        with self._settings():
            response = self.client.get("/api/snapshots/")
        weather = response.json()["snapshots"][0]
        self.assertEqual(weather["lastRun"]["status"], "ok")
        self.assertEqual(weather["lastRun"]["records"], 1)

    def test_refresh_command_reports_status(self):
        out = StringIO()
        with self._settings():
            call_command("refresh_snapshots", stdout=out)
        self.assertIn('"name": "weather"', out.getvalue())
        self.assertIn('"available": true', out.getvalue())
