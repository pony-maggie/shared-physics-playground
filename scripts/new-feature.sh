#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: ./scripts/new-feature.sh <feature-slug>" >&2
  exit 1
fi

slug="$1"
spec_path="specs/features/${slug}.md"

if [[ -e "$spec_path" ]]; then
  echo "feature spec already exists: $spec_path" >&2
  exit 1
fi

cat >"$spec_path" <<EOF
# ${slug}

## Scope

-

## Files

-

## Verification

-
EOF

echo "created $spec_path"
