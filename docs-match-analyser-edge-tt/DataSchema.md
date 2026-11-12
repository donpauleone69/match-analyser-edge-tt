# Data Schema – Edge TT Match Analyser

> **Version:** 3.0 (Current Implementation)  
> **Last Updated:** 2025-12-11  
> **Status:** ✅ Single Source of Truth

---

## Overview

This document describes the **actual implemented schema** in the Edge TT Match Analyser codebase. It is reverse-engineered from the TypeScript types in `app/src/data/entities/`.

How the tables connect, and a looser video-first shape that is not built yet: [TableMap.md](TableMap.md).

### Architecture Context

- **Current Storage:** IndexedDB via Dexie.js (local-first)
- **ID Strategy:** Human-readable slugs (e.g., `john-doe-a1b2`, `match-xyz-s1-r3`)
- **Future Migration:** Designed to be compatible with Supabase/PostgreSQL
- **Timestamps:** ISO 8601 strings (for serialization compatibility)

### Key Design Principles

1. **Local-First:** All data persists in browser storage
2. **Slug-Based IDs:** Human-readable, debuggable identifiers
3. **Multi-Video Support:** Matches can have multiple video segments
4. **Three-Phase Workflow:**
   - Phase 1: Timestamp tagging (match framework)
   - Phase 2: Shot detail entry
   - Phase 3: Inference/analytics
5. **Top-Down + Bottom-Up:** Match results entered top-down, verified by tagging bottom-up

---

## Entities

### 1. Players

Represents an individual table tennis player.

**File:** `app/src/data/entities/players/player.types.ts`

```typescript
interface DBPlayer {
  id: string                    // Slug format: {first}-{last}-{id4}
  first_name: string
  last_name: string
  handedness: 'right' | 'left'
  playstyle: 'attacker' | 'all_rounder' | 'defender' | 'disruptive' | null
  club_id: string | null        // FK to clubs (slug)
  is_archived: boolean
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
}
```

**Notes:**
- Slug ID example: `john-smith-a1b2`
- `playstyle` nullable for flexibility
- `is_archived` for soft deletes (preserve historical data)

**Supabase Migration Notes:**
- Convert `id` to UUID, add slug as separate indexed field
- Convert timestamps to `TIMESTAMPTZ`
- Add CHECK constraint on `handedness` and `playstyle`

---

### 2. Clubs

Represents a table tennis club or organization.

**File:** `app/src/data/entities/clubs/club.types.ts`

```typescript
interface DBClub {
  id: string                    // Slug format: {name}-{city}-{id4}
  name: string
  city: string | null
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
}
```

**Notes:**
- Slug ID example: `edge-tt-london-x7y3`
- City is optional for location flexibility

---

### 3. Tournaments

Represents a tournament or competition event.

**File:** `app/src/data/entities/tournaments/tournament.types.ts`

```typescript
type TournamentType = 
  | 'friendly' 
  | 'club' 
  | 'local' 
  | 'regional' 
  | 'national' 
  | 'international'

interface DBTournament {
  id: string                        // Slug format: {name}-{yyyy}-{mm}-{id4}
  name: string
  location: string | null
  start_date: string                // ISO date string (YYYY-MM-DD)
  end_date: string | null           // ISO date string
  tournament_type: TournamentType
  tournament_host_club_id: string | null  // FK to clubs (slug)
  notes: string | null
  created_at: string                // ISO timestamp
  updated_at: string                // ISO timestamp
}
```

**Notes:**
- Slug ID example: `summer-open-2025-06-a1b2`
- Supports matches without tournament context (friendly games)
- Host club tracks organizing entity

---

### 4. Matches

Represents a single match between two players.

**File:** `app/src/data/entities/matches/match.types.ts`

```typescript
type MatchRound = 
  | 'groups' 
  | 'last_32' 
  | 'last_16' 
  | 'quarter_final' 
  | 'semi_final' 
  | 'final' 
  | 'other'

type TaggingMode = 'essential' | 'full'
type BestOf = 1 | 3 | 5 | 7
type MatchDetailLevel = 'result_only' | 'sets' | 'rallies' | 'shots'

interface DBMatch {
  id: string                            // Slug format: {p1}-vs-{p2}-{yyyymmdd}-{id4}
  
  // Tournament context (nullable)
  tournament_id: string | null          // FK (slug)
  round: MatchRound | null
  
  // Players
  player1_id: string                    // FK (slug)
  player2_id: string                    // FK (slug)
  first_server_id: string               // FK (slug)
  
  // Match result (TOP-DOWN ENTRY)
  winner_id: string | null              // FK (slug)
  player1_sets_final: number
  player2_sets_final: number
  
  // Match parameters
  best_of: BestOf                       // 1, 3, 5, or 7 sets
  match_date: string                    // ISO date
  
  // Tagging configuration
  tagging_mode: TaggingMode | null
  match_detail_level: MatchDetailLevel  // Auto-detected based on data
  
  // Video tracking (MULTI-VIDEO SUPPORT)
  has_video: boolean                    // True if ANY video exists
  video_count: number                   // Number of video segments
  total_coverage: 'full' | 'partial'    // Are all sets/rallies covered?
  
  // Workflow state
  step1_complete: boolean               // Match framework tagging done
  step2_complete: boolean               // Rally detail tagging done
  
  created_at: string                    // ISO timestamp
}
```

**Notes:**
- Slug ID example: `john-smith-vs-jane-doe-20251211-x7y3`
- **Top-down result entry:** User enters match result before tagging (if known)
- **Bottom-up verification:** Tagging validates/corrects the entered result
- **Multi-video support:** A match can have multiple video files (e.g., one per set)
- `match_detail_level` auto-computed: are we tracking just results? Sets? Rally timestamps? Shot details?

**Tagging Modes:**
- `essential`: 4 questions per shot (faster)
- `full`: 5+ questions per shot (comprehensive)

---

### 5. Match Videos

Represents a video file associated with a match (multi-video support).

**File:** `app/src/data/entities/matchVideos/matchVideo.types.ts`

```typescript
type MatchCoverageType = 'full_match' | 'single_set' | 'multi_set'

interface DBMatchVideo {
  id: string                    // Slug format: {match_id}-v{num}
  match_id: string              // FK (slug)
  player1_id: string            // FK (slug)
  player2_id: string            // FK (slug)
  set_number: number | null
  set_id: string | null         // FK (slug)
  coverage_type: MatchCoverageType
  video_url: string             // Blob URL (local file)
  created_at: Date
  updated_at: Date
}
```

**Notes:**
- Slug ID example: `match-123-v1`, `match-123-v2`
- `video_url` is a blob URL from local file picker (not uploaded to server)
- A match can have multiple videos covering different sets
- Videos stored locally in IndexedDB, referenced by blob URL
- **Superseded for playback by `video_assets` (5b).** Kept for history.

---

### 5b. Video Assets (Dexie v6)

Durable record of every source video and exported reel. The file lives on the device (OPFS, else IndexedDB) and/or in the private cloud bucket.

**File:** `app/src/data/entities/videoAssets/videoAsset.types.ts`

```typescript
interface DBVideoAsset {
  id: string                       // va_<16 hex>
  match_id: string
  set_number: number | null        // source videos: the set it covers; reels: null
  kind: 'source' | 'reel'
  label: string | null             // reel name, e.g. "Hero · opening attacks lost"
  file_name: string
  mime_type: string
  size_bytes: number
  duration_s: number | null
  width: number | null
  height: number | null
  fingerprint: string | null       // sha-256 of size + first/last MiB
  local_store: 'opfs' | 'idb' | null   // device-only; stripped from cloud bundles
  remote_path: string | null       // {uid}/{matchId}/{assetId}.ext in bucket match-videos
  remote_uploaded_at: string | null
  source_asset_ids: string[] | null  // reels: sources they were cut from
  segments: EdlSegment[] | null    // reels: source interval → reel time (measured)
  created_at: string
  updated_at: string
}
```

**Indexes:** `id, match_id, [match_id+set_number], kind`

**Notes:** Rally/shot timestamps stay in source-video time; reels map back through `segments`. Signed URLs are created at play time and never stored.

---

### 6. Sets

Represents a single set within a match.

**File:** `app/src/data/entities/sets/set.types.ts`

```typescript
interface DBSetVideoContext {
  video_id: string
  video_start_player1_score: number | null
  video_start_player2_score: number | null
  first_server_in_video: string
}

interface DBSet {
  id: string                            // Slug format: {match_id}-s{num}
  match_id: string                      // FK (slug)
  set_number: number                    // 1-based
  
  // TOP-DOWN: Entered scores (expected outcomes)
  player1_score_final: number
  player2_score_final: number
  winner_id: string | null              // FK (slug)
  
  // Set counts before and after this set
  player1_sets_before: number
  player2_sets_after: number
  player2_sets_before: number
  player2_sets_after: number
  
  // Set-level first server (derived from match service order)
  set_first_server_id: string           // Who serves first point of this set (FK slug)
  
  // Video coverage (MULTI-VIDEO SUPPORT)
  has_video: boolean                    // Is this set covered by ANY video?
  video_segments: string[]              // Array of video IDs that cover this set
  video_contexts: DBSetVideoContext[] | null  // Per-video context (may have multiple)
  end_of_set_timestamp: number | null   // Seconds (in which video? - use video_contexts)
  
  // Tagging workflow status
  is_tagged: boolean
  tagging_started_at: string | null     // ISO timestamp
  tagging_completed_at: string | null   // ISO timestamp
  
  // Enhanced tagging progress tracking (for pause/resume)
  tagging_phase: 
    | 'not_started' 
    | 'phase1_in_progress' 
    | 'phase1_complete' 
    | 'phase2_in_progress' 
    | 'phase2_complete'
  phase1_last_rally: number | null      // Last rally number saved in Phase 1
  phase1_total_rallies: number | null   // Expected total (for progress %)
  phase2_last_shot_index: number | null // Last shot detailed in Phase 2  
  phase2_total_shots: number | null     // Total shots (for progress %)
  
  // Setup tracking (for Phase 1 set setup flow)
  setup_starting_score_p1: number | null
  setup_starting_score_p2: number | null
  setup_next_server_id: string | null
  setup_completed_at: string | null
  
  // Phase 3 (Inference) tracking
  inference_complete: boolean | null
  inference_completed_at: string | null // ISO timestamp
}
```

**Notes:**
- **Multi-video context:** A set can span multiple videos (e.g., camera battery change mid-set)
- **Setup flow:** Before tagging, user configures starting score and server if video doesn't start at 0-0
- **Progress tracking:** Supports pause/resume workflow
- **Three phases:**
  1. Phase 1: Mark timestamps of shots (match framework)
  2. Phase 2: Answer questions about each shot (detail entry)
  3. Phase 3: Run inference engine (analytics derivation)

---

### 7. Rallies

Represents a single rally (point) within a set. Written by Rally Focus on Save.

**File:** pp/src/data/entities/rallies/rally.types.ts

`	ypescript
type PointEnding = 'winner' | 'lucky' | 'error_net' | 'error_long' | 'error_wide'
type PointMissReason = 'technical' | 'timing' | 'footwork' | 'positioning' | 'misread' | 'forced'

interface DBRally {
  id: string                        // Slug format: {set_id}-r{num}
  set_id: string                    // FK (slug)
  rally_index: number               // 1-based within set

  // Video reference (MULTI-VIDEO)
  video_id: string | null
  has_video_data: boolean

  // Rally timing
  timestamp_start: number | null    // First shot contact
  timestamp_end: number | null      // Last shot contact
  end_of_point_time: number | null  // Legacy alias of timestamp_end

  // Participants
  server_id: string
  receiver_id: string

  // Outcome
  is_scoring: boolean
  winner_id: string | null          // Derived from point_ending + last shot player

  // Score progression (WITHIN SET)
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number

  // Rally Focus end tags
  first_attack_index: number | null // null = no attack in this rally
  point_ending: PointEnding
  point_miss_reason: PointMissReason | null // Pass 1 Focus; null until tagged after an error

  // Workflow
  is_highlight: boolean
  framework_confirmed: boolean
  detail_complete: boolean

  // Manual corrections
  server_corrected: boolean
  score_corrected: boolean
  correction_notes: string | null

  is_stub_rally: boolean
}
`

**Notes:**
- **first_attack_index:** FOS stamp from Rally Focus; phase is derived from this + shot_index
- **point_ending:** Tagged ending only (winner / lucky / error_net / error_long / error_wide)
- **point_miss_reason:** Optional miss reason after an error ending; default null (Pass 1 Focus)
- **Service fault / receive error:** Derived — last shot_index 1 + error → service fault; shot 2 + error → receive error
- **winner_id:** winner/lucky → last-shot player; either error → opponent
- **Removed:** point_end_type (forced/unforced/serviceFault/receiveError/winnerShot)

---

### 8. Shots

Represents a single contact within a rally. Stores Rally Focus tags only.

**File:** `app/src/data/entities/shots/shot.types.ts`

```typescript
type ShotSpin = 'under' | 'top' | 'side'
type ShotWing = 'FH' | 'BH'
type ShotStroke = 'flick' | 'loop' | 'drive' | 'smash' | 'lob' | 'block' | 'push' | 'chop'
type ShotDepth = 'short' | 'half' | 'long'
type ShotPlacement = 'BH' | 'middle' | 'FH'
type ShotContact = 'over_table' | 'off_table'
type ShotInitiative = 'behind' | 'level' | 'ahead'
type ShotQuality = 'good' | 'normal' | 'poor'

interface DBShot {
  id: string                        // Slug format: {rally_id}-sh{num}
  rally_id: string
  video_id: string | null
  player_id: string                 // Derived from server + shot_index, stored for filters

  shot_index: number                // 1-based within rally
  timestamp_start: number           // Contact time in video seconds

  // Choices — null until selected (or when the role does not ask)
  shot_spin: ShotSpin | null             // Serve only
  shot_wing: ShotWing | null
  shot_stroke: ShotStroke | null         // Attack and shots after it (push/chop for Pass 1 Focus)
  shot_placement: ShotPlacement | null   // Serve and balls before the attack
  shot_depth: ShotDepth | null           // Serve and balls before the attack
  shot_contact: ShotContact | null       // First attack only
  shot_initiative: ShotInitiative | null // Reply / next while point continues
  shot_quality: ShotQuality | null       // First attack only (legacy Rally Focus)

  // Attribute toggles — default false, never null
  shot_is_weak: boolean
  shot_is_high: boolean
  shot_is_heavy: boolean
  shot_is_safe: boolean                  // First attack only (Pass 1 Focus); default false
  shot_is_pivot: boolean                 // Crossed wing (Pass 1 Focus); default false
  shot_review_kind: 'technical' | 'tactical' | null  // Pass 1 Focus review flag
}
```

**Notes:**
- **Phase is never stored.** Derive with `deriveShotPhase(shot_index, first_attack_index)`.
- **Role allow-list** (`deriveShotTagRole` / `allowListForRole`) strips tags the shot's role may not keep. Serve and pre-offensive may set the three switches; first attack may set quality and contact; later shots get neither attributes nor quality.
- **shot_is_safe:** Pass 1 Focus first-attack toggle; Rally Focus keeps `shot_quality` and leaves this false.
- UI standing maps to `shot_initiative` on save.
- Do not store `timestamp_end`, `is_rally_end`, or `is_first_attack`.

**Removed (Dexie v5 clears shots + rallies):**
`spin`, `wing`, `stroke`, `length`, `strength`, `placement`, `table_contact`, `attackable`, `initiative`, plus earlier Phase 1/2 columns.

---

### 9. Shot Inferences — REMOVED

The shot_inferences table and entity module were dropped in Dexie **version 4**.
Phase 3 never wrote it for Rally Focus; first attack and initiative are tagged directly.

---

## Entity Relationships

```
Clubs
  └─> Players (via club_id)
  └─> Tournaments (via tournament_host_club_id)

Tournaments
  └─> Matches (via tournament_id)

Players
  └─> Matches (as player1_id, player2_id, first_server_id)

Matches
  └─> MatchVideos (via match_id)
  └─> Sets (via match_id)

MatchVideos
  └─> Sets (via set_id, optional)
  └─> Rallies (via video_id)
  └─> Shots (via video_id)

Sets
  └─> Rallies (via set_id)

Rallies
  └─> Shots (via rally_id)

Shots
```

---

## Data Flow & Workflow

### Top-Down Entry (Optional)

1. User creates **Match** with expected result (player scores)
2. User creates **Sets** with expected scores (e.g., 11-9, 11-7)
3. System pre-populates **stub Rallies** based on score progression
4. User tags video to fill in timestamps and details (bottom-up verification)

### Bottom-Up Tagging (Video Analysis)

#### Rally Focus (primary)
1. User tags contacts, first attack, shot pills, and point ending
2. **Save** writes that rally + its shots in one transaction
3. System derives phase, winner, scores, service fault / receive error class
4. Analytics cards read the new fields (first-attack conversion, error-by-phase)

Legacy Phase 1 / Phase 2 screens remain reachable for experiments but do not write the new shot columns.

### Validation & Reconciliation

- **Tagged data = source of truth**
- If top-down scores conflict with tagged rallies, tagged data wins
- User can manually correct server/score errors via UI

---

## Migration to Supabase (Future)

### ID Strategy
- Keep slugs as indexed fields for human readability
- Add UUIDs as primary keys for performance
- Foreign keys reference UUIDs, not slugs

### Timestamp Conversion
- Convert ISO strings to PostgreSQL `TIMESTAMPTZ`
- Add automatic `updated_at` triggers

### Enum Constraints
- Add CHECK constraints for all enum types
- Consider using PostgreSQL ENUMs for stricter typing

### Indexes to Add
```sql
-- Players
CREATE INDEX idx_players_club ON players(club_id);
CREATE INDEX idx_players_name ON players(first_name, last_name);

-- Matches
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_players ON matches(player1_id, player2_id);

-- Sets
CREATE INDEX idx_sets_match ON sets(match_id);
CREATE INDEX idx_sets_video ON sets USING GIN(video_segments);

-- Rallies
CREATE INDEX idx_rallies_set ON rallies(set_id);
CREATE INDEX idx_rallies_video ON rallies(video_id);

-- Shots
CREATE INDEX idx_shots_rally ON shots(rally_id);
CREATE INDEX idx_shots_player ON shots(player_id);
CREATE INDEX idx_shots_video ON shots(video_id);
CREATE INDEX idx_shots_initiative ON shots(initiative);
CREATE INDEX idx_shots_wing ON shots(wing);
```

---

## Changelog

### 2026-11-12 — Video assets (Dexie v6)
- New table `video_assets` (see 5b). Cloud mirror: Supabase `match_bundles` (one JSONB bundle per match: match, sets, rallies, shots, players, tournament, video asset manifest; `schemaVersion` 1) + private bucket `match-videos`

### 2026-11-11 — Shot review flag (no Dexie bump)
- `shot_review_kind`: `technical` | `tactical` | null. Technical review also stores wing + stroke even off the role allow-list

### 2026-11-11 — Pass 1 Pivot + miss reasons (no Dexie bump)
- Shot toggle `shot_is_pivot` (default false). With wing set, previous shot's `shot_placement` is inferred (same side if pivot off, opposite if on)
- `point_miss_reason` is `technical` | `timing` | `footwork` | `positioning` | `misread` | `forced` | null (`tactical` removed)

### 2026-11-11 — Pass 1 Focus additive fields (no Dexie bump)
- `ShotStroke` adds `push` | `chop`
- Shot toggle `shot_is_safe` (default false; first attack only for Pass 1 Focus)
- `PointEnding` adds `error_wide`; rally `point_miss_reason` (`technical` | `timing` | `footwork` | `positioning` | `misread` | `forced` | null)
- Rally Focus unchanged beyond writing defaults for the new fields

### 2026-11-11 — Shot tag alignment (Dexie v5)
- Renamed tags to `shot_*`; depth replaces length; contact is `over_table` / `off_table`
- Attribute switches `shot_is_weak` / `shot_is_high` / `shot_is_heavy` (default false)
- First-attack `shot_quality` (`good` | `normal` | `poor` | null); Strong / attackable / strength dropped
- Role allow-list strips contradictory tags on save; upgrade clears shots and rallies

### 2026-11-10 — Rally Focus schema pivot (Dexie v4)
- Shots store Rally Focus tags (spin, wing, stroke, length, strength, placement, table_contact, attackable, initiative)
- Rallies store first_attack_index and point_ending; drop point_end_type
- Drop shot_inferences; clear old point rows on upgrade
- Phase / service-fault / receive-error derived at read time

## Changelog

### v3.0 - 2025-12-11
- **BREAKING:** Complete documentation rewrite from actual code
- Reverse-engineered from TypeScript types in `app/src/data/entities/`
- Reflects current local-first implementation with slug IDs
- Added Shot Inferences entity
- Added multi-video support architecture
- Added three-phase tagging workflow documentation
- Added top-down/bottom-up data flow explanation

### v2.0 - 2025-12-05
- See `DatabaseSchema_PrototypeV2.md` (now deprecated)

### v1.0
- Initial MVP schema (deprecated)

---

## Related Documentation

- **Architecture:** `Architecture.md`
- **Glossary:** `Glossary.md`
- **Current Spec:** `specs/MVP_flowchange_spec.md`
- **Changelog:** `specs/specAddendumMVP.md`

---

*This document is the single source of truth for the Edge TT Match Analyser data model.*
*Last updated: 2025-12-11*
