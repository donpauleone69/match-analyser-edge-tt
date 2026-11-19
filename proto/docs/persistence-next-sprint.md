# Persistence — next sprint (advisory)

**Audience:** Paul + agents. **No impl tonight.** Code reviewed on `team/review-ready-2026-11-12`.

## Goal (club app)

Survive reload, browser restart, and (later) a second device/coach laptop — without making tagging wait on the network.

| Layer | What | Where |
|-------|------|--------|
| Tags / match graph | matches, sets, rallies, shots, players, tournaments, `video_assets` rows | Dexie → IndexedDB (`EdgeTTMatchAnalyser`) |
| Video bytes | source / reel / trimmed files | OPFS `videos/` (fallback: legacy IDB `tt-match-videos`) |
| Optional backup | same match JSON + object keys | Supabase `match_bundles` + private bucket `match-videos` |
| Portable escape hatch | one file per match | “Save match file” / import (same bundle schema as cloud) |

**Invariant already in code:** Dexie is source of truth on-device. Cloud is a mirror. Resolve play as **device → signed cloud URL → missing** (honest empty state).

## What the stack already does well

- Local-first tagging: write path never requires Supabase.
- Stable `video_assets` ids + fingerprint; OPFS for multi‑GB without stuffing blobs into Dexie.
- Legacy per-set IDB keys adopted lazily; `navigator.storage.persist()` requested on store.
- Match **bundle** (`schemaVersion` 1) = sync unit **and** portable archive — one migration story.
- Cloud stubs are real code, not vapor: Auth, RLS owner-only rows, revision conflict → user picks device vs cloud, resumable TUS upload, signed URLs at play time, archive-local-bytes-keep-row.
- “Continue on this device” for LAN/dev without hanging on unreachable `:54321`.

## Gaps (club-ready)

- **Origin-bound:** `localhost` vs LAN IP = separate IndexedDB/OPFS. Empty library on phone IP is expected, not a hang.
- **Eviction / clear-site-data** still wipes local tags + video unless cloud or a match file exists.
- **Cloud is optional and env-gated** (`VITE_SUPABASE_*`). Without auth + hosted project, no cross-device restore.
- **Videos do not auto-follow bundles:** push syncs JSON + manifest; bytes need explicit `uploadVideoAsset` (or pull then download). Plan of record: prefer uploading **reels**, not full originals, by default.
- **Owner-only RLS** — no coach share / club multi-user yet.
- **Schema upgrades historically cleared shots/rallies** (Dexie v4/v5). Additive versions since; still a migration hazard if someone ships a destructive upgrade with real Paul data.
- Fingerprint via `crypto.subtle` is null on insecure HTTP LAN — reuse/dedupe weaker there.

## Recommended approach (next sprint — not tonight)

1. **Keep** Dexie + OPFS + `videoAssetService` as the product path. Do not add a second video DB or move tag rows into OPFS.
2. **Harden optional cloud backup** on the existing `match_bundles` + `match-videos` design:
   - Hosted Supabase project + migration already in `supabase/migrations/`.
   - Per-match sync status on Matches list; conflict UX already started in Match Review storage strip.
   - Default backup policy: **bundle always**; **video = reel (or trimmed) first**; original upload opt-in / “keep for edit”.
   - After pull: if `remote_path` set and no local bytes → play via signed URL; offer “Download to device” for offline tagging.
3. **Treat match file export/import as the zero-infra backup** for Paul until hosted cloud is routine.
4. **Defer** Capacitor/Tauri, Dropbox/Drive, field-level CRDT merge, normalised per-table sync.

### Migration risks to plan for

- Never clear `shots`/`rallies` in a Dexie upgrade once Paul has live data; use additive fields + readers that tolerate nulls.
- Bundle `schemaVersion` bumps must stay backward-compatible on pull (reject newer; migrate older → current on write).
- OPFS rewrite drops `File.lastModified` — keep using `file_last_modified_ms` on the asset row.
- Quota: surface `getStorageEstimate()` + persisted flag; guide user to backup before browser cleanup.

## Do this / don’t do this (next sprint)

**Do**

- Keep tagging offline-first; sync is explicit (Sync now / per-match backup).
- Finish sync-status + “cloud-only match → pull → play” UX on the existing APIs.
- Prefer reel upload for cost/size; document original-upload as optional.
- Keep one asset resolver and one bundle format.
- Smoke: second browser profile / second origin → sign-in → Sync → tags restore → video from signed URL or download.

**Don’t**

- Don’t implement cloud “for completeness” before the Pass 1 → playlist loop is solid (product priority).
- Don’t replace Dexie with Supabase-as-primary or store match graph only in Postgres.
- Don’t put multi‑GB video back into IndexedDB/Dexie as the happy path.
- Don’t invent CRDT / per-field merge; one editor per match + revision pick is enough.
- Don’t build coach sharing / multi-tenant RLS until single-user backup works for Paul → coach laptop.
- Don’t ship a destructive Dexie version upgrade against real libraries.
- Don’t assume LAN URL shares local data with localhost — teach origin isolation or use cloud/file transfer.

## Pointers (code)

- Dexie schema: `app/src/data/db.ts` (v7)
- Video bytes: `app/src/helpers/videoStorage.ts`
- Resolve/store: `app/src/data/services/videoAssetService.ts`
- Sync: `app/src/data/cloud/cloudSync.ts`, `supabaseClient.ts`, `stores/cloudStore.ts`
- SQL: `supabase/migrations/20261112010000_match_bundles.sql`
- Prior architecture note: `docs-match-analyser-edge-tt/chat_notes/forward_plan_overnight.md` § Architecture decision
