#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
host="${NORMA_VPS_HOST:-89.221.203.88}"
user="${NORMA_SSH_USER:-deploy}"
remote_dir="${NORMA_REMOTE_DIR:-/opt/norma}"
key="${NORMA_SSH_KEY:-$root/artifacts/deploy/id_ed25519}"
known_hosts="${NORMA_KNOWN_HOSTS:-$root/artifacts/deploy/known_hosts}"
archive="$root/artifacts/deploy/norma-release.tar.gz"

if [[ ! -f "$key" || ! -f "$known_hosts" ]]; then
  echo "Не найдены SSH-ключ или known_hosts. Сначала выполните первоначальную настройку из README.md." >&2
  exit 1
fi

cd "$root"
npm run build
npm run lint
mkdir -p "$(dirname "$archive")"
trap 'rm -f "$archive"' EXIT

tar \
  --exclude='./.git' \
  --exclude='./.idea' \
  --exclude='./node_modules' \
  --exclude='./dist' \
  --exclude='./artifacts' \
  --exclude='./.env' \
  --exclude='./backups' \
  -czf "$archive" .

ssh_options=(
  -i "$key"
  -o IdentitiesOnly=yes
  -o "UserKnownHostsFile=$known_hosts"
  -o StrictHostKeyChecking=yes
)

scp "${ssh_options[@]}" "$archive" "$user@$host:/tmp/norma-release.tar.gz"
ssh "${ssh_options[@]}" "$user@$host" \
  "set -eu; cd '$remote_dir'; ./scripts/backup.sh; tar -xzf /tmp/norma-release.tar.gz -C '$remote_dir'; rm -f /tmp/norma-release.tar.gz; chmod +x scripts/backup.sh; test -f .env; docker compose --profile public config --quiet; docker compose build app; docker compose --profile public up -d app caddy; docker compose --profile public ps"
