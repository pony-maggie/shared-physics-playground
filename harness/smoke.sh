#!/usr/bin/env bash

set -euo pipefail

echo "==> harness smoke"

./harness/init.sh >/dev/null
./harness/verify.sh >/dev/null

echo "Harness smoke checks passed."
