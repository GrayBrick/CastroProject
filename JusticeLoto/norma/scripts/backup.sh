#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
mkdir -p backups

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary="backups/.norma-${timestamp}.dump.tmp"
destination="backups/norma-${timestamp}.dump"
trap 'rm -f "$temporary"' EXIT INT TERM

docker compose exec -T db pg_dump -U norma -d norma -Fc > "$temporary"
test -s "$temporary"
mv "$temporary" "$destination"
chmod 600 "$destination"
find backups -maxdepth 1 -type f -name 'norma-*.dump' -mtime +14 -delete

echo "Backup created: $destination"
