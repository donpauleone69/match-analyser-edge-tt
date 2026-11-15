#!/bin/sh
# Rule fixes after the pass 3 rule review (faults 1, 2, 3, 6, 7), then the reviewer's own cases.
# No browser, under a second. Run from anywhere: sh proto/scripts/rules-fixes.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(dirname "$HERE")"
OUT="${TMPDIR:-/tmp}/rules-fixes-check.mjs"
cd "$PROTO"
npx esbuild "$HERE/rules-fixes.check.ts" --bundle --platform=node --format=esm \
  --alias:@="$PROTO/src" --log-level=warning --outfile="$OUT"
node "$OUT"
