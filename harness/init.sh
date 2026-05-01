#!/usr/bin/env bash

set -euo pipefail

echo "==> harness init"

required_paths=(
  "AGENTS.md"
  "CLAUDE.md"
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
echo "  1. Read README.md"
echo "  2. Read LOCAL-SETUP.md"
echo "  3. Run ./scripts/dev-up.sh"
