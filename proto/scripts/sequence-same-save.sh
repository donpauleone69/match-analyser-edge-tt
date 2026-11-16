#!/bin/sh
# Shot by shot: the saved rally matches the current mode for the same answers.
# Run from anywhere: sh proto/scripts/sequence-same-save.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(dirname "$HERE")"
OUT="${TMPDIR:-/tmp}/sequence-same-save.mjs"
cd "$PROTO"
npx esbuild "$HERE/sequence-same-save.check.ts" --bundle --platform=node --format=esm \
  --alias:@="$PROTO/src" --log-level=warning --outfile="$OUT"
node "$OUT"
