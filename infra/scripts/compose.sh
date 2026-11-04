#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
ENV_FILE=${DEPLOY_ENV_FILE:-$ROOT/infra/env/production.env}
if [ ! -f "$ENV_FILE" ]; then
  echo 'Falta production.env. Copia el ejemplo, configura valores reales y protege sus permisos.' >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" -f "$ROOT/infra/docker-compose.yml" "$@"
