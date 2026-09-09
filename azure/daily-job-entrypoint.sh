#!/bin/sh

set -eu
umask 077

: "${GITHUB_DEPLOY_KEY_B64:?GITHUB_DEPLOY_KEY_B64 is required}"

repository="${GITHUB_REPOSITORY:-fckaemail-cyber/tribal-kava-lounge}"
branch="${GITHUB_BRANCH:-master}"
workspace="/tmp/tribal-kava-workspace"
key_file="/tmp/github-deploy-key"

case "$repository" in
  *[!A-Za-z0-9._/-]*|*/*/*|/*|*/|"")
    echo "Invalid GITHUB_REPOSITORY value" >&2
    exit 2
    ;;
esac

case "$branch" in
  *[!A-Za-z0-9._/-]*|/*|*/|"")
    echo "Invalid GITHUB_BRANCH value" >&2
    exit 2
    ;;
esac

printf '%s' "$GITHUB_DEPLOY_KEY_B64" | base64 --decode > "$key_file"
chmod 0600 "$key_file"
ssh-keygen -y -f "$key_file" >/dev/null

export GIT_SSH_COMMAND="ssh -i $key_file -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/ssh/ssh_known_hosts -o StrictHostKeyChecking=yes"

git clone --depth 1 --branch "$branch" "git@github.com:$repository.git" "$workspace/repository"
cd "$workspace/repository"

git config user.name "fckaemail-cyber"
git config user.email "f.ckaemail@gmail.com"

cd daily-engine
python3 run_daily.py run
cd ..

git add daily-engine/state/ daily-engine/drafts/
if git diff --cached --quiet; then
  echo "Daily engine completed with no repository changes."
  exit 0
fi

git commit -m "chore: daily draft $(date -u +%Y-%m-%d) - awaiting review"
git push origin "HEAD:$branch"
