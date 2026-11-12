#!/usr/bin/env bash
# Build passing Daily Kava stories in the existing Netlify site.
set -euo pipefail
umask 077
manifest="$(mktemp /tmp/tribal-daily-kava.XXXXXXXX)"
trap 'rm -f "$manifest"' EXIT
python3 daily-engine/auto_publish.py stage --manifest "$manifest"
npm ci --no-audit --no-fund
npm --prefix api ci --no-audit --no-fund
npm test
node scripts/write-cloud-build-state.mjs "$manifest"
