#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/shared_physics_playground/app}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
COMPOSE_PROJECT=${COMPOSE_PROJECT:-shared-physics}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is not available" >&2
  exit 1
fi

mkdir -p "${APP_DIR}" /opt/shared_physics_playground/data /opt/shared_physics_playground/logs "${APP_DIR}/config"
cd "${APP_DIR}"

if [[ ! -f .env ]]; then
  echo ".env is missing in ${APP_DIR}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "${COMPOSE_FILE} is missing in ${APP_DIR}" >&2
  exit 1
fi

if [[ ! -f config/playground-access.json ]]; then
  echo "config/playground-access.json is missing in ${APP_DIR}" >&2
  exit 1
fi

docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE}" config >/dev/null
docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE}" pull
docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker image prune -f
