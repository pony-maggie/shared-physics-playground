#!/usr/bin/env bash

set -euo pipefail

echo "==> harness verify"

required_paths=(
  "AGENTS.md"
  "CLAUDE.md"
  "README.md"
  "package.json"
  "pnpm-workspace.yaml"
  "tsconfig.base.json"
  "harness/init.sh"
  "harness/smoke.sh"
  "harness/session-checklist.md"
  "docs/development/workflow.md"
  "docs/development/definition-of-done.md"
  "docs/development/verification.md"
  "apps/web/README.md"
  "apps/server/README.md"
  "packages/shared/README.md"
  "packages/physics-schema/README.md"
  "packages/prompt-contracts/README.md"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "missing required path: $path" >&2
    exit 1
  fi
done

echo "Required scaffold files are present."
