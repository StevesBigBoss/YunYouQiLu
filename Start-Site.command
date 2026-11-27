#!/usr/bin/env bash
# macOS double-click entry: double-click this file in Finder to open the site.
# It runs Start-Site.sh from the same folder, so both share one implementation.
cd "$(dirname "$0")"
exec /bin/bash "./Start-Site.sh"
