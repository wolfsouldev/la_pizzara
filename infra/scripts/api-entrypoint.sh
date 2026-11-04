#!/bin/sh
set -eu
umask 077
node dist/scripts/check-runtime.js
if [ "${1:-}" = node ] && [ "${2:-}" = dist/main.js ]; then
  # Kernel lock survives exec, prevents two APIs and concurrent offline restore.
  exec flock --nonblock --conflict-exit-code 75 --no-fork /data/.university.lock \
    sh -c 'node dist/scripts/prepare-runtime.js && exec node dist/main.js'
fi
if [ "${1:-}" = node ] && [ "${2:-}" = dist/scripts/restore.js ]; then
  exec flock --nonblock --conflict-exit-code 75 --no-fork /data/.university.lock \
    env UNIVERSITY_RESTORE_LOCKED=1 "$@"
fi
exec "$@"
