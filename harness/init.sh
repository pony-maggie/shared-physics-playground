#!/usr/bin/env bash

set -euo pipefail

echo "==> harness init"

required_paths=(
  "AGENTS.md"
  "CLAUDE.md"
  "state/feature-list.json"
  "state/progress.md"
  "state/handoff.md"
  "harness/verify.sh"
  "harness/smoke.sh"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "missing required path: $path" >&2
    exit 1
  fi
done

echo "Repository scaffold is present."
echo "Next:"
echo "  1. Read state/progress.md"
echo "  2. Read state/handoff.md"
echo "  3. Pick one scoped feature or follow-up from state/feature-list.json"
