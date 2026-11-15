#!/bin/sh
# Item 4 rule checks (Add contact, Delete last, Re-tap). No browser, under a second.
# Run from anywhere: sh proto/scripts/add-contact.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(dirname "$HERE")"
OUT="${TMPDIR:-/tmp}/add-contact-check.mjs"
cd "$PROTO"
npx esbuild "$HERE/add-contact.check.ts" --bundle --platform=node --format=esm \
  --alias:@="$PROTO/src" --log-level=warning --outfile="$OUT"
node "$OUT"
