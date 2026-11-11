#!/bin/bash
# Publish Daily Kava checked drafts using the signed-in Mac and Netlify.
# No GitHub Actions runner; held/withdrawn content is never forced through.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG=en_US.UTF-8
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
STATE="$HOME/Library/Application Support/TribalKava/DailyKava"
mkdir -p "$STATE"
exec >>"$STATE/publisher.log" 2>&1
printf '\n=== Daily Kava start %s ===\n' "$(date -Iseconds)"
LOCK="$STATE/lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Another publisher process is active; skipping."
  exit 0
fi
WORK=""
finish() {
  code=$?
  trap - EXIT
  if [ -n "$WORK" ] && [ -d "$WORK" ]; then
    if [ "$code" -ne 0 ] && [ -e "$WORK/.daily-kava-manifest.json" ]; then
      mkdir -p "$STATE/recovery"
      cp "$WORK/.daily-kava-manifest.json" "$STATE/recovery/last-failed-manifest.json" || true
    fi
    git -C "$ROOT" worktree remove --force "$WORK" >/dev/null 2>&1 || true
    rmdir "$WORK" >/dev/null 2>&1 || true
  fi
  rmdir "$LOCK" >/dev/null 2>&1 || true
  echo "=== Daily Kava finish $(date -Iseconds) status=$code ==="
  exit "$code"
}
trap finish EXIT

if [ "$(git -C "$ROOT" remote get-url origin)" != "https://github.com/JD-Vane-Ai-Dev/tribal-kava-lounge.git" ]; then
  echo "Unexpected repository remote. No publication." ; exit 10
fi
git -C "$ROOT" fetch --quiet origin master
WORK="$(mktemp -d "$STATE/run.XXXXXXXX")"
git -C "$ROOT" worktree add --detach "$WORK" origin/master >/dev/null
cd "$WORK"
python3 daily-engine/auto_publish.py stage --manifest "$WORK/.daily-kava-manifest.json"
python3 - <<'PY'
import json
from pathlib import Path
d=json.loads(Path(".daily-kava-manifest.json").read_text())
print("Eligible passing posts:",len(d["posts"]),"Held or rejected:",len(d["held"]))
PY

if [ "$#" -gt 0 ] && [ "$1" = "--dry-run" ]; then
  echo "Dry run verified: no push or Netlify deploy."
  exit 0
fi

COUNT="$(python3 -c 'import json;print(len(json.load(open(".daily-kava-manifest.json"))["posts"]))')"
if [ "$COUNT" -eq 0 ]; then
  echo "No passing unpublished drafts; leaving production untouched."
  exit 0
fi

python3 daily-engine/auto_publish.py check-catalog
npm ci --no-audit --no-fund
npm test
git add daily-kava.js daily-engine/state/
if git diff --cached --quiet; then
  echo "No source changes after staging; aborting." ; exit 11
fi
git -c user.name="Tribal Daily Publisher" -c user.email="f.ckaemail@gmail.com" \
  commit -m "chore: stage validated Daily Kava posts" >/dev/null
git fetch --quiet origin master
if [ "$(git rev-parse origin/master)" != "$(git rev-parse HEAD^)" ]; then
  echo "Concurrent website changes; stale push refused." ; exit 12
fi
git push origin HEAD:master
git fetch --quiet origin master
if [ "$(git rev-parse origin/master)" != "$(git rev-parse HEAD)" ]; then
  echo "Remote advanced before Netlify deployment; stale publish refused." ; exit 13
fi
netlify deploy --prod --dir dist --functions netlify/functions --no-build \
  --site 1296a8dc-a399-4fa4-9be8-13963f335311 \
  --message "Daily Kava validated Mac publisher" --json > "$STATE/latest-deploy.json"
python3 - <<'PY'
from pathlib import Path
import json
d=json.loads((Path.home()/"Library/Application Support/TribalKava/DailyKava/latest-deploy.json").read_text())
if not d.get("deploy_id"):raise SystemExit("Netlify deployment confirmation missing")
print("Netlify production deployment:",d["deploy_id"])
PY
OK=0
for i in 1 2 3 4; do
  if python3 daily-engine/auto_publish.py verify-live --manifest "$WORK/.daily-kava-manifest.json" \
      --origin https://www.thetribalkavalounge.com; then OK=1; break; fi
  echo "Waiting for new catalog propagation ($i/4)"
  sleep 5
done
if [ "$OK" -ne 1 ]; then
  echo "Live catalog not verified; publication remains unacknowledged." ; exit 14
fi
python3 daily-engine/auto_publish.py finalize --manifest "$WORK/.daily-kava-manifest.json"
git add daily-engine/state/
if ! git diff --cached --quiet; then
  git -c user.name="Tribal Daily Publisher" -c user.email="f.ckaemail@gmail.com" \
    commit -m "chore: acknowledge live Daily Kava posts" >/dev/null
  git push origin HEAD:master
fi
echo "Published and verified $COUNT Daily Kava posts."
