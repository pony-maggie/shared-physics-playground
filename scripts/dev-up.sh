#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/dev-common.sh"

ensure_runtime_dir
load_local_environment
verify_dev_prerequisites

echo "==> restarting local playground environment"
stop_dev_environment

echo "==> starting server on http://127.0.0.1:${SERVER_PORT}"
start_background_process \
  "$ROOT_DIR/apps/server" \
  "$SERVER_PID_FILE" \
  "$SERVER_LOG_FILE" \
  node \
  --import \
  tsx \
  src/index.ts
wait_for_url "http://127.0.0.1:${SERVER_PORT}/healthz" "server" "$SERVER_LOG_FILE"

echo "==> starting web on http://127.0.0.1:${WEB_PORT}"
start_background_process \
  "$ROOT_DIR/apps/web" \
  "$WEB_PID_FILE" \
  "$WEB_LOG_FILE" \
  "$WEB_VITE_BIN" \
  --host \
  127.0.0.1 \
  --port \
  "$WEB_PORT"
if ! wait_for_url "http://127.0.0.1:${WEB_PORT}" "web" "$WEB_LOG_FILE"; then
  stop_dev_environment
  exit 1
fi

echo "==> local playground is ready"
echo "server log: $SERVER_LOG_FILE"
echo "web log:    $WEB_LOG_FILE"
echo "open:       http://127.0.0.1:${WEB_PORT}"

open_web_app
