# Forward plan — living doc

Started: 2026-11-12 (overnight session). Replaces the direction in older specs where they conflict. Older specs stay as history; they're not rewritten.

## Product loop

**Record → tag (Pass 1) → Review → Work on → Clips → (optional) fix tags → Review again.**

Tagging is the means. The output is **insights + video clips of what needs work**. Every screen should get a player to "what should I work on?" and "show me the clips" in as few clicks as possible.

## What's obsolete

- The two-part "Match Framework → Rally Detail (Phase 2)" flow and the Essential/Full mode split. Pass 1 Focus is the tagger; Pass 2 is an optional detail run that unlocks locked cards.
- The mock Dashboard home page and the standalone Analytics page as entry points. Match Review is the hub.
- "Videos are a blob URL for this session only" (LocalVideoHandling.md). Videos are now durable assets.
- `SetSelectionModal` as the way into tagging. Sets are started/continued from Match Review.

## Architecture decision — video and data (2026-11-12)

**Chosen path: local-first web app + Supabase (Auth, Postgres, private Storage) as the sync/backup layer.** Native shells (Capacitor / Tauri) stay the long-term route for heavy exports, behind the same interfaces.

Why:

1. **Tagging must never wait on the network.** Dexie (IndexedDB) stays the source of truth on each device. Cloud is a mirror you push to and pull from.
2. **One document per match.** The sync unit is a *match bundle*: match + sets + rallies + shots + players + the video asset manifest, with `schemaVersion` and `revision`. Same JSON is the portable archive file, so cloud backup and "export to file" share one format and one migration path. Matches have a single editor, so per-match last-writer-wins (by revision/updated_at) is honest and simple. Normalised server tables can come later if we need cross-user analytics.
3. **Supabase** was already the planned backend (Architecture.md). It gives auth + Postgres RLS + private storage + signed URLs in one stack, works locally in Docker for development, and hosted with only an env change.
4. **Videos are assets, not paths.** Each video gets a stable asset id + fingerprint + metadata in `video_assets`. Device copies live in OPFS (Origin Private File System: durable, no 2 GB IndexedDB copy). Cloud copies are object keys in a private bucket; signed URLs are made at play time and never stored. An asset resolver tries local → cloud → "missing" (an honest state, not a broken link).
5. **Rally/shot times stay in source-video time.** Clips and reels are built from an edit decision list (EDL) of source intervals. A *gameplay reel* (rallies only, padded, overlaps merged) is exported in-browser with ffmpeg.wasm **stream copy** — no re-encode, so it's fast and small (typically 15–30 % of the original). The reel stores its segment map (source → reel time, measured from the output) so tags can be played from the reel after the original is gone.
6. **Upload the reel, not the original, by default.** Keeps storage/egress costs bounded (the review spec's cost concern). Originals can still be uploaded explicitly.

Not chosen (for now): re-encoding to 720p/1080p in the browser (wasm encode is too slow for an hour of 4K); Dropbox/Drive providers (behind the same interface later); normalised per-table sync.

## Clip playlists

Clips are generated from rules, not stored: `deriveClips(matches, filter)` → clips → `deriveEdl()` (merge overlaps per source). Filters: highlights, review shots (technical/tactical × wing × stroke × side), opening attacks by a side (won/lost), errors by side, serve points, any evidence list of rallies. Works for one match or across all matches.

## Next phases

1. **Now (this session):** asset registry + OPFS, clip rules + Clips UI (match + all matches), gameplay reel export, Supabase sign-in + push/pull bundles + video upload/stream, navigation reset (Home → Matches → Review hub → Clips), resume/re-tag from a rally, Section B/C cards from Pass 1 data.
2. **Next:** resumable (TUS) uploads for big originals; sync status per match on the list; conflict prompt when both devices edited; portable folder export via File System Access.
3. **Later:** Capacitor iOS/Android shell with native AVFoundation / Media3 export behind the `VideoEngine` interface; Tauri desktop; Pass 2 detail cards.

## How to run the cloud locally

- `npx supabase start` from the repo root (Docker). Studio: http://127.0.0.1:54323. Email inbox: http://127.0.0.1:54324.
- `app/.env.local`: `VITE_SUPABASE_URL=http://127.0.0.1:54321` and `VITE_SUPABASE_ANON_KEY=<anon key from supabase status>`.
- Hosted: create a project, run `supabase/migrations/*.sql`, put the project URL + anon key in env.
