# Edge TT Match Analyser — Glossary

> **Version:** 1.0  
> **Last Updated:** 2026-11-13  
> **Status:** Source of Truth for terms

Concise terms for the current product. Older Essential/Full / Match Framework / Phase 2 / inference wording is obsolete.

---

## Product & flow

| Term | Meaning |
|------|---------|
| **Pass 1 (Focus)** | The live tagger: tap contacts, mark first attack / end / flags, save rallies. Primary tagging path. |
| **Pass 2** | Optional future *detail* run for extra shot attributes. Not required for Review/Clips. |
| **Match Review** | Hub at `/matches/:id` — Summary, Details, Work on, Clips, Highlights, Rallies. |
| **Work on** | Hero-first patterns from tags; opens evidence and playlists. |
| **Clips / playlist** | Derived list of rally or shot windows from a filter (errors, opening attacks, review flags, …). |
| **Highlight** | User-starred rally for a **show-reel** (enjoyment), not a work-on queue. Keep the label “Highlight”. |
| **Home / Library** | Landing: continue tagging, recent matches, clip shortcuts. |
| **Scope review** | `/review` — same payoff across opponent / tournament / all matches. |
| **Hero** | Focal player (`player1_id` on most matches). User-facing name; durable IDs unchanged. |
| **Inference engine** | Retired. Do not design new flows around it. |

---

## Match structure

| Term | Meaning |
|------|---------|
| **Match** | Competitive encounter; best of N sets. |
| **Set** | Game to 11 (win by 2) unless configured otherwise. |
| **Rally / point** | Serve through end of point; sequence of shots. |
| **Shot / contact** | One strike; tagged at contact time (with capture latency buffer). |
| **Server** | Rally-level; rotate every two points (every point at deuce). |
| **Let** | Replay with no score — redo contacts; do not save a point. |
| **First attack** | First aggressive opening after serve/receive exchange; tagged explicitly. |
| **End of point** | How the rally finished (winner, error, air, fault, …). |
| **Air** | Swung and missed the ball (miss/result). |
| **Review flag** | “Tag to view” for later Work on grouping (optional tech/tactical detail when selected). |

---

## Video & data

| Term | Meaning |
|------|---------|
| **Video asset** | Durable video identity (`video_assets`) with device OPFS copy; not a disposable blob URL. |
| **Source time** | All tags and clip windows are in original video seconds. |
| **EDL** | Edit decision list — merged source intervals for play/export. |
| **Reel** | Exported concatenation (ffmpeg.wasm stream copy) with segment map. |
| **Dexie / IndexedDB** | On-device source of truth for match data. |
| **Match bundle** | Portable JSON of one match (+ manifest) for backup/sync formats. |

---

## Table tennis (short)

| Term | Meaning |
|------|---------|
| **Loop** | Aggressive topspin attack. |
| **Push** | Controlled backspin keep-ball. |
| **Block** | Compact return of an attack. |
| **Wing** | Forehand / backhand side. |
| **Placement / landing** | Where the ball went (incl. net / long / wide). |
| **Forced / unforced error** | Error under pressure vs without. |
| **Deuce** | 10–10+; serve every point. |

---

## Obsolete (do not use in new docs)

Match Framework · Rally Detail · Essential Mode · Full Mode · Phase 1/2/3 tagging · ShotInferences · standalone Analytics dashboard as the product entry.
