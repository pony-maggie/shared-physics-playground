#!/usr/bin/env bash

set -euo pipefail

./harness/verify.sh
./harness/smoke.sh
