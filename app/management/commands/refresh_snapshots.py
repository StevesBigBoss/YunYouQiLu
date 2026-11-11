"""Refresh the normalized snapshots by invoking the existing Node crawler."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from app.snapshots import SNAPSHOT_NAMES, snapshot_status


class Command(BaseCommand):
    help = (
        "Print the status of data/normalized snapshots, or run the Node crawler "
        "to refresh them. This command is scheduler-agnostic: cron, systemd "
        "timers, and Windows Task Scheduler can call it on any cadence."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--run",
            action="store_true",
            help="Run scripts/crawler/crawl.mjs instead of only reporting status.",
        )
        parser.add_argument(
            "--check",
            action="store_true",
            help="Only print snapshot status (the default when --run is omitted).",
        )
        parser.add_argument(
            "--source",
            action="append",
            choices=SNAPSHOT_NAMES,
            dest="sources",
            help="Limit a refresh to one source; repeat for multiple sources.",
        )
        parser.add_argument(
            "--timeout",
            type=int,
            default=300,
            help="Crawler timeout in seconds (default: 300).",
        )

    def handle(self, *args, **options):
        if options["run"]:
            self._run_crawler(options["sources"], options["timeout"])

        status = snapshot_status()
        self.stdout.write(json.dumps(status, ensure_ascii=False, indent=2))
        if status["staleCount"] and not options["run"]:
            self.stdout.write(
                self.style.WARNING(
                    "%d snapshot(s) are older than their configured freshness window."
                    % status["staleCount"]
                )
            )

    def _run_crawler(self, sources, timeout):
        node = os.environ.get("NODE_BINARY", "node")
        if shutil.which(node) is None:
            raise CommandError(
                "Node.js was not found (looked for %r). Install Node.js or set "
                "NODE_BINARY to its executable." % node
            )

        script = Path(settings.BASE_DIR) / "scripts" / "crawler" / "crawl.mjs"
        if not script.exists():
            raise CommandError("Crawler script not found: %s" % script)

        command = [node, str(script)]
        if sources:
            command.extend(sources)

        try:
            completed = subprocess.run(
                command,
                cwd=str(settings.BASE_DIR),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise CommandError(
                "Crawler timed out after %s seconds." % timeout
            ) from exc
        except OSError as exc:
            raise CommandError("Could not start the crawler: %s" % exc) from exc

        if completed.stdout:
            self.stdout.write(completed.stdout.rstrip())
        if completed.stderr:
            self.stderr.write(completed.stderr.rstrip())
        if completed.returncode != 0:
            raise CommandError(
                "Crawler exited with status %s." % completed.returncode
            )
