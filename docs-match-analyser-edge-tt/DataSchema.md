# Data Schema – Edge TT Match Analyser

> **Version:** 3.0 (Current Implementation)  
> **Last Updated:** 2025-12-11  
> **Status:** ✅ Single Source of Truth

---

## Overview

This document describes the **actual implemented schema** in the Edge TT Match Analyser codebase. It is reverse-engineered from the TypeScript types in `app/src/data/entities/`.

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

Represents a single rally (point) within a set.

**File:** `app/src/data/entities/rallies/rally.types.ts`

```typescript
interface DBRally {
  id: string                        // Slug format: {set_id}-r{num}
  set_id: string                    // FK (slug)
  rally_index: number               // 1-based within set
  
  // Video reference (MULTI-VIDEO)
  video_id: string | null           // Which video segment is this rally in? (FK slug)
  has_video_data: boolean           // False if score-only (no video coverage)
  
  // Rally timing
  timestamp_start: number | null    // First shot's timestamp_start
  timestamp_end: number | null      // Last shot's timestamp_end  
  end_of_point_time: number | null  // Timestamp WITHIN the video_id video (rally end) - LEGACY
  
  // Participants
  server_id: string                 // FK (slug)
  receiver_id: string               // FK (slug)
  
  // Outcome
  is_scoring: boolean               // Did this rally result in a point?
  winner_id: string | null          // FK (slug)
  
  // Score progression (WITHIN SET)
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number
  
  // Rally end details
  point_end_type: 
    | 'serviceFault' 
    | 'receiveError' 
    | 'forcedError' 
    | 'unforcedError' 
    | 'winnerShot' 
    | null
  
  // Workflow
  is_highlight: boolean             // User-marked highlight
  framework_confirmed: boolean      // Phase 1 complete
  detail_complete: boolean          // Phase 2 complete
  
  // Manual corrections
  server_corrected: boolean
  score_corrected: boolean
  correction_notes: string | null
  
  // Stub rally flag (for pre-populated rallies from setup)
  is_stub_rally: boolean            // True if created from top-down setup, not tagged yet
}
```

**Notes:**
- **Stub rallies:** Pre-created from top-down score entry, awaiting tagging
- **is_scoring:** False for service faults (no point awarded)
- **Corrections:** User can manually fix server/score errors
- `end_of_point_time` is LEGACY - use `timestamp_end` instead

---

### 8. Shots

Represents a single shot within a rally.

**File:** `app/src/data/entities/shots/shot.types.ts`

```typescript
// Enums
type ShotIntent = 'defensive' | 'neutral' | 'aggressive'
type ShotResult = 'in_net' | 'missed_long' | 'missed_wide' | 'in_play' | 'fault'
type ShotQuality = 'high' | 'average'
type TablePosition = 'left' | 'mid' | 'right'
type RallyEndRole = 'winner' | 'forced_error' | 'unforced_error' | 'none'
type PressureLevel = 'low' | 'medium' | 'high'
type IntentQuality = 'correct' | 'over_aggressive' | 'over_passive' | 'misread'
type ServeSpinFamily = 'under' | 'top' | 'no_spin' | 'side'
type ShotLength = 'short' | 'half_long' | 'long'
type ServeType = 
  | 'serve' 
  | 'pendulum' 
  | 'backhand' 
  | 'reverse_tomahawk' 
  | 'tomahawk' 
  | 'hook' 
  | 'lolipop'
type ShotLabel = 'serve' | 'receive' | 'third_ball' | 'rally_shot'
type ShotContactTiming = 'early' | 'peak' | 'late'
type PlayerPosition = 'left' | 'middle' | 'right'
type PlayerDistance = 'close' | 'mid' | 'far'
type ShotSpeed = 'slow' | 'medium' | 'fast'
type ShotArc = 'low' | 'medium' | 'high'

interface DBShot {
  // ============================================================================
  // IDENTITY & REFERENCES
  // ============================================================================
  
  id: string                        // Slug format: {rally_id}-sh{num}
  rally_id: string                  // FK (slug)
  video_id: string | null           // Which video segment is this shot in? (FK slug)
  player_id: string                 // FK (slug)
  
  // ============================================================================
  // POSITION & TIMING
  // ============================================================================
  
  shot_index: number                // 1-based within rally
  timestamp_start: number           // Seconds into video_id video (SHOT CONTACT, not rally end)
  timestamp_end: number | null      // Timestamp of next shot or rally end
  
  // ============================================================================
  // SUBJECTIVE DATA (human judgment / interpretation)
  // ============================================================================
  
  intent: ShotIntent | null
  intent_quality: IntentQuality | null
  pressure_level: PressureLevel | null
  shot_quality: ShotQuality | null
  
  // Derived (computed from context)
  rally_end_role: RallyEndRole
  
  // ============================================================================
  // OBJECTIVE DATA (observable facts / deterministic derivation)
  // ============================================================================
  
  serve_spin_family: ServeSpinFamily | null   // NULL for non-serves
  serve_type: ServeType | null                // NULL for non-serves
  shot_length: ShotLength | null              // NULL for rally shots beyond receive
  shot_wing: 'FH' | 'BH' | null               // NULL for serves
  shot_result: ShotResult                     // NOT NULL - defaults to 'in_play'
  shot_origin: TablePosition | null           // Where player hits from
  shot_target: TablePosition | null           // Intended target (even for errors)
  shot_type: string | null                    // 'serve', 'fh_loop_vs_under', 'bh_flick', etc.
  shot_contact_timing: ShotContactTiming | null
  player_position: PlayerPosition | null
  player_distance: PlayerDistance | null
  shot_spin: string | null                    // 'heavy_topspin', 'topspin', 'no_spin', 'backspin', 'heavy_backspin'
  shot_speed: ShotSpeed | null
  shot_arc: ShotArc | null
  
  // Derived (computed from context)
  shot_label: ShotLabel                       // serve, receive, third_ball, rally_shot
  is_rally_end: boolean
  is_third_ball_attack: boolean
  is_receive_attack: boolean
  
  // ============================================================================
  // WORKFLOW
  // ============================================================================
  
  is_tagged: boolean
}
```

**Notes:**
- **Subjective vs Objective:** Clear separation of human judgment vs observable facts
- **shot_type:** String for extensibility (allows any shot type, not enum-constrained)
- **shot_result:** Defaults to `in_play`, only set to error/fault when rally ends
- **Derived fields:** `shot_label`, `rally_end_role`, `is_rally_end`, `is_third_ball_attack`, `is_receive_attack` are computed from context
- **Timestamps:** `timestamp_start` is the shot contact moment, `timestamp_end` is the next shot or rally end

**Shot Classification Logic:**
- `shot_label` determined by position in rally (1st shot = serve, 2nd = receive, 3rd = third_ball, 4+ = rally_shot)
- `rally_end_role` computed from shot result + context (was it the last shot? Did it win/lose the point?)

---

### 9. Shot Inferences

Tracks which shot fields were inferred by AI/ML vs manually entered.

**File:** `app/src/data/entities/shotInferences/shotInference.types.ts`

```typescript
interface DBShotInference {
  id: string                    // Slug format: {shot_id}-{field_name}-{id4}
  shot_id: string               // FK to shots (slug)
  field_name: string            // e.g., 'player_position', 'shot_speed', 'shot_type'
  inferred: boolean             // true = AI inferred, false = manually verified
  confidence: number | null     // NULL for now, populate later with ML (0.0 - 1.0)
  created_at: string            // ISO timestamp
}
```

**Notes:**
- **Sparse strategy:** Only create rows for fields that were inferred
- **Absence of row = manually entered** (100% confidence)
- **Future ML integration:** Confidence scores will be populated when ML models are trained

**Trackable inference fields:**
- `shot_type`
- `shot_contact_timing`
- `player_position`
- `player_distance`
- `shot_spin`
- `shot_speed`
- `shot_arc`
- `is_third_ball_attack`
- `is_receive_attack`

**NOT typically inferred:**
- Subjective fields: `intent`, `intent_quality`, `pressure_level` (human judgment)

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
  └─> ShotInferences (via shot_id)
```

---

## Data Flow & Workflow

### Top-Down Entry (Optional)

1. User creates **Match** with expected result (player scores)
2. User creates **Sets** with expected scores (e.g., 11-9, 11-7)
3. System pre-populates **stub Rallies** based on score progression
4. User tags video to fill in timestamps and details (bottom-up verification)

### Bottom-Up Tagging (Video Analysis)

#### Phase 1: Match Framework
1. User marks timestamps for each shot contact
2. System creates **Rallies** and **Shots** with timestamps
3. System derives rally winners, scores, server alternation

#### Phase 2: Shot Detail Entry
1. User reviews each shot one-by-one
2. User answers questions: intent, quality, shot type, etc.
3. System updates **Shots** with detailed attributes

#### Phase 3: Inference & Analytics
1. System runs inference engine on tagged shots
2. System populates **ShotInferences** for derived fields
3. System calculates analytics (serve %, error rates, etc.)

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
CREATE INDEX idx_shots_intent ON shots(intent);
CREATE INDEX idx_shots_result ON shots(shot_result);
```

---

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
