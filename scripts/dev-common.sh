#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.dev-runtime"

SERVER_PORT=2567
WEB_PORT=4173

SERVER_PID_FILE="$RUNTIME_DIR/server.pid"
WEB_PID_FILE="$RUNTIME_DIR/web.pid"

SERVER_LOG_FILE="$RUNTIME_DIR/server.log"
WEB_LOG_FILE="$RUNTIME_DIR/web.log"

WEB_VITE_BIN="$ROOT_DIR/apps/web/node_modules/.bin/vite"
SERVER_TSX_BIN="$ROOT_DIR/apps/server/node_modules/.bin/tsx"

function ensure_runtime_dir() {
  mkdir -p "$RUNTIME_DIR"
}

function load_env_file() {
  local env_file="$1"

  if [[ ! -f "$env_file" ]]; then
    return
  fi

  set -a
  # shellcheck source=/dev/null
  source "$env_file"
  set +a
}

function load_local_environment() {
  load_env_file "$ROOT_DIR/.env"
  load_env_file "$ROOT_DIR/.env.local"
}

function require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

function require_executable() {
  local executable_path="$1"
  local install_hint="$2"

  if [[ ! -x "$executable_path" ]]; then
    echo "Missing executable: $executable_path" >&2
    echo "$install_hint" >&2
    exit 1
  fi
}

function verify_dev_prerequisites() {
  require_command node
  require_command curl
  require_executable "$SERVER_TSX_BIN" "Install server dependencies with: cd apps/server && npm install"
  require_executable "$WEB_VITE_BIN" "Install web dependencies with: cd apps/web && npm install"
}

function remove_pid_file() {
  local pid_file="$1"

  if [[ -f "$pid_file" ]]; then
    rm -f "$pid_file"
  fi
}

function stop_pid_file() {
  local pid_file="$1"

  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local pid
  pid="$(tr -d '[:space:]' < "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true

    for _ in $(seq 1 20); do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi

      sleep 0.25
    done

    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi

  remove_pid_file "$pid_file"
}

function stop_port_processes() {
  local port="$1"

  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi

  local pids
  pids="$(lsof -ti "tcp:$port" 2>/dev/null | sort -u || true)"

  if [[ -z "$pids" ]]; then
    return
  fi

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"

  sleep 0.5

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done <<< "$(lsof -ti "tcp:$port" 2>/dev/null | sort -u || true)"
}

function wait_for_url() {
  local url="$1"
  local name="$2"
  local log_file="$3"

  for _ in $(seq 1 60); do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "Failed to start $name." >&2
  echo "Last 40 lines from $log_file:" >&2
  if [[ -f "$log_file" ]]; then
    tail -n 40 "$log_file" >&2 || true
  fi
  return 1
}

function start_background_process() {
  local work_dir="$1"
  local pid_file="$2"
  local log_file="$3"
  shift 3

  : > "$log_file"

  (
    cd "$work_dir"
    nohup "$@" < /dev/null >> "$log_file" 2>&1 &
    echo $! > "$pid_file"
    disown "$!" 2>/dev/null || true
  )
}

function open_web_app() {
  if [[ "${SKIP_OPEN:-0}" == "1" ]]; then
    return
  fi

  if command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:${WEB_PORT}" >/dev/null 2>&1 || true
  fi
}

function stop_dev_environment() {
  ensure_runtime_dir
  stop_pid_file "$SERVER_PID_FILE"
  stop_pid_file "$WEB_PID_FILE"
  stop_port_processes "$SERVER_PORT"
  stop_port_processes "$WEB_PORT"
  remove_pid_file "$SERVER_PID_FILE"
  remove_pid_file "$WEB_PID_FILE"
}
