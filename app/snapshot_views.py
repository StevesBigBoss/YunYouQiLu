"""HTTP views for the optional normalized-snapshot API."""

from django.http import (
    Http404,
    HttpResponseNotModified,
    JsonResponse,
)
from django.utils.http import http_date, parse_http_date_safe
from django.views.decorators.http import require_safe

from app.snapshots import (
    SnapshotCorrupt,
    SnapshotError,
    SnapshotUnavailable,
    UnknownSnapshot,
    load_snapshot,
    snapshot_status,
)


def _json(payload, **kwargs):
    return JsonResponse(payload, safe=False, json_dumps_params={"ensure_ascii": False}, **kwargs)


@require_safe
def snapshot_index(request):
    return _json(snapshot_status())


@require_safe
def snapshot_detail(request, name):
    try:
        snapshot = load_snapshot(name)
    except UnknownSnapshot:
        raise Http404("Unknown snapshot")
    except SnapshotUnavailable:
        return _json(
            {"error": "snapshot_unavailable", "name": name},
            status=503,
        )
    except SnapshotCorrupt:
        return _json(
            {"error": "snapshot_corrupt", "name": name},
            status=503,
        )
    except SnapshotError:
        return _json(
            {"error": "snapshot_error", "name": name},
            status=500,
        )

    if_none_match = request.headers.get("If-None-Match")
    if if_none_match and if_none_match.strip() == snapshot.etag:
        response = HttpResponseNotModified()
    else:
        if_modified_since = parse_http_date_safe(request.headers.get("If-Modified-Since"))
        if (
            not if_none_match
            and if_modified_since is not None
            and int(snapshot.modified_timestamp) <= if_modified_since
        ):
            response = HttpResponseNotModified()
        else:
            response = _json(snapshot.payload)

    response["ETag"] = snapshot.etag
    response["Last-Modified"] = http_date(snapshot.modified_timestamp)
    response["Cache-Control"] = "public, max-age=60, must-revalidate"
    response["X-Snapshot-Sha256"] = snapshot.sha256
    if snapshot.fetched_at:
        response["X-Snapshot-Fetched-At"] = snapshot.fetched_at
    return response
