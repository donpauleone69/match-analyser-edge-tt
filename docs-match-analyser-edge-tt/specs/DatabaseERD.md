# Edge TT Match Analyser - Database Entity Relationship Diagram

> **Version:** 1.1.0  
> **Date:** 2025-12-02  
> **Status:** Design Document (Pre-Supabase Migration)

---

## Overview

This document defines the complete database schema for the Edge TT Match Analyser application. It shows **two schemas**:

1. **Current Implementation** - localStorage structure (v0.9.x)
2. **Future Database** - Supabase/PostgreSQL schema with Player Profiles

---

## Current Implementation (localStorage v0.9.x)

**Status:** ✅ Implemented and Working

**Storage:** Browser localStorage, key: `tt-tagger-session`

**Player Handling:** Simple strings (no player table)

```mermaid
erDiagram
    MATCHES ||--|{ SETS : "contains"
    SETS ||--|{ RALLIES : "contains"
    RALLIES ||--|{ SHOTS : "contains"

    MATCHES {
        string matchId PK
        string player1Name "NOT NULL"
        string player2Name "NOT NULL"
        enum firstServerId "player1 | player2"
        string matchFormat
        string tournament
        date matchDate
        enum taggingMode "essential | full"
        enum videoCoverage
        enum matchResult
        string finalSetScore
        string finalPointsScore
        int player1Score "Sets won"
        int player2Score "Sets won"
        boolean step1Complete
        boolean step2Complete
    }

    SETS {
        string id PK
        string matchId FK
        int setNumber
        int player1FinalScore
        int player2FinalScore
        string winnerId "player1 | player2"
        boolean hasVideo
        decimal endOfSetTimestamp
    }

    RALLIES {
        string id PK
        string setId FK
        int rallyIndex
        enum serverId "player1 | player2"
        enum receiverId "player1 | player2"
        boolean isScoring
        enum winnerId "player1 | player2"
        int player1ScoreAfter
        int player2ScoreAfter
        decimal endOfPointTime
        enum pointEndType
        enum luckType
        boolean hasVideoData
        boolean isHighlight
        boolean frameworkConfirmed
        boolean detailComplete
    }

    SHOTS {
        string id PK
        string rallyId FK
        decimal time
        int shotIndex
        enum playerId "player1 | player2"
        enum serveType
        enum serveSpin
        enum wing "FH | BH"
        enum shotType "serve | push | loop etc"
        enum shotQuality
        enum landingZone
        enum landingType "DERIVED"
        enum inferredSpin "DERIVED"
        boolean isTagged
    }
```

**Note:** Player Profiles are stored separately but not yet linked:
```typescript
players: PlayerProfile[]  // Empty array, future use
```

---

## Future Database Schema (Supabase/PostgreSQL)

**Status:** 🔵 Designed, Not Yet Implemented

**Migration Planned:** When moving to Supabase

**Player Handling:** Relational with Player Profiles table

---

## Entity Relationship Diagram (Future)

```mermaid
erDiagram
    PLAYERS ||--o{ MATCHES_PLAYER1 : "is player1 in"
    PLAYERS ||--o{ MATCHES_PLAYER2 : "is player2 in"
    PLAYERS ||--o{ MATCHES_FIRST_SERVER : "first server in"
    MATCHES ||--|{ SETS : "contains"
    SETS ||--|{ RALLIES : "contains"
    RALLIES ||--|{ SHOTS : "contains"

    PLAYERS {
        uuid id PK
        string first_name "NOT NULL"
        string last_name "NOT NULL"
        date date_of_birth "NULL"
        string profile_picture_url "NULL"
        string club_id "NULL, lagos|padernense|other"
        enum handedness "NOT NULL, left|right"
        enum playstyle "NOT NULL, attack|allround|defence"
        enum rubber_forehand "NOT NULL, inverted|shortPips|longPips|antiSpin"
        enum rubber_backhand "NOT NULL, inverted|shortPips|longPips|antiSpin"
        string bio "NULL"
        boolean is_archived "DEFAULT false"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }

    MATCHES {
        uuid id PK
        uuid player1_id FK "NOT NULL, REFERENCES players(id)"
        uuid player2_id FK "NOT NULL, REFERENCES players(id)"
        uuid first_server_id FK "NOT NULL, REFERENCES players(id)"
        string match_format "NOT NULL, e.g. Best of 5"
        string tournament "NULL"
        date match_date "NOT NULL"
        enum tagging_mode "NOT NULL, essential|full"
        enum video_coverage "NOT NULL, full|truncatedStart|truncatedEnd|truncatedBoth"
        enum match_result "NULL, player1|player2|incomplete"
        string final_set_score "NULL, e.g. 3-2"
        string final_points_score "NULL, e.g. 11-9"
        int player1_start_sets "NOT NULL"
        int player2_start_sets "NOT NULL"
        int player1_start_points "NOT NULL"
        int player2_start_points "NOT NULL"
        decimal first_serve_timestamp "NULL, seconds"
        int player1_score "NOT NULL, sets won"
        int player2_score "NOT NULL, sets won"
        boolean step1_complete "DEFAULT false"
        boolean step2_complete "DEFAULT false"
        timestamptz created_at "DEFAULT NOW()"
    }

    GAMES {
        uuid id PK
        uuid match_id FK "NOT NULL, REFERENCES matches(id)"
        int game_number "NOT NULL, 1,2,3..."
        int player1_final_score "NOT NULL"
        int player2_final_score "NOT NULL"
        uuid winner_id FK "NULL, REFERENCES players(id)"
        boolean has_video "NOT NULL"
        decimal end_of_set_timestamp "NULL, seconds"
    }

    RALLIES {
        uuid id PK
        uuid game_id FK "NOT NULL, REFERENCES sets(id)"
        int rally_index "NOT NULL, sequential in match"
        uuid server_id FK "NOT NULL, REFERENCES players(id)"
        uuid receiver_id FK "NOT NULL, REFERENCES players(id)"
        boolean is_scoring "NOT NULL"
        uuid winner_id FK "NULL, REFERENCES players(id)"
        int player1_score_after "NOT NULL"
        int player2_score_after "NOT NULL"
        decimal end_of_point_time "NULL, seconds"
        enum point_end_type "NULL, serviceFault|receiveError|forcedError|unforcedError|winnerShot"
        enum luck_type "NULL, edge|net"
        boolean has_video_data "NOT NULL"
        boolean is_highlight "DEFAULT false"
        boolean framework_confirmed "DEFAULT false"
        boolean detail_complete "DEFAULT false"
    }

    SHOTS {
        uuid id PK
        uuid rally_id FK "NOT NULL, REFERENCES rallies(id)"
        decimal time "NOT NULL, seconds in video"
        int shot_index "NOT NULL, 1,2,3..."
        uuid player_id FK "NULL, REFERENCES players(id)"
        enum serve_type "NULL, pendulum|reversePendulum|tomahawk|backhand|hook|lollipop|other"
        enum serve_spin "NULL, topLeft|topspin|topRight|sideLeft|noSpin|sideRight|backLeft|backspin|backRight"
        enum wing "NULL, FH|BH"
        enum shot_type "NULL, serve|push|chop|block|lob|drive|flick|loop|smash|other"
        enum shot_quality "NULL, good|average|weak|inNet|missedLong|missedWide"
        enum landing_zone "NULL, BHShort|MidShort|FHShort|BHMid|MidMid|FHMid|BHLong|MidLong|FHLong"
        enum landing_type "DERIVED, inPlay|net|offLong|wide"
        enum inferred_spin "DERIVED, unknown|heavyTopspin|topspin|noSpin|backspin|heavyBackspin"
        boolean is_tagged "DEFAULT false"
    }
```

---

## Table Descriptions

### **PLAYERS** (Master Data)
**Purpose:** Store player profiles for analysis, scouting, and statistics.

**Key Points:**
- Master data table - players exist independent of matches
- Contains identity, playing characteristics, and equipment
- Supports head-to-head analysis and opponent profiling
- `is_archived` for soft deletes (preserve match history)

**Relationships:**
- One player can be in many matches (as player1, player2, or first server)
- Referenced by `matches.player1_id`, `matches.player2_id`, `matches.first_server_id`
- Referenced by `rallies.server_id`, `rallies.receiver_id`, `rallies.winner_id`
- Referenced by `shots.player_id`

---

### **MATCHES** (Transactional Data)
**Purpose:** Store match-level metadata and configuration.

**Key Points:**
- Links two players via foreign keys
- Contains match outcome and video coverage details
- Tracks workflow state (step1_complete, step2_complete)
- `first_server_id` must be either `player1_id` or `player2_id`

**Relationships:**
- Belongs to two players (player1, player2)
- Has many sets/sets
- Root of the match hierarchy

---

### **GAMES** (Sets)
**Purpose:** Store set-level scores and outcomes.

**Key Points:**
- Each set in a match (Set 1, 2, 3...)
- Final scores for each player
- Winner determined by score comparison
- Links to video timestamps

**Relationships:**
- Belongs to one match
- Has many rallies
- Winner references players table

---

### **RALLIES** (Points)
**Purpose:** Store rally-level outcomes and point details.

**Key Points:**
- Each point in a set
- Tracks server, receiver, winner
- Point end type (how the point ended)
- Cumulative score tracking
- Workflow flags (framework_confirmed, detail_complete)

**Relationships:**
- Belongs to one game
- Has many shots (shots)
- Server, receiver, winner reference players table

---

### **CONTACTS** (Shots/Ball Contacts)
**Purpose:** Store individual shot data within rallies.

**Key Points:**
- Each ball shot in a rally
- Shot index (1=serve, 2=return, 3+...)
- Serve-specific fields (serveType, serveSpin) for shot_index=1
- Rally shot fields (wing, shotType) for shot_index>1
- Derived fields (landingType, inferredSpin) calculated from other fields

**Relationships:**
- Belongs to one rally
- Player references players table
- Sequential within rally (shot_index)

---

## Derived Fields

### Contacts Table

| Field | Derivation | Source Fields |
|-------|------------|---------------|
| `landing_type` | `deriveLandingType(shot_quality)` | `shot_quality` |
| `inferred_spin` | `deriveInferredSpin(shot_type)` | `shot_type` |

### Rallies Table

| Field | Derivation | Source Fields |
|-------|------------|---------------|
| `winner_id` | `deriveEndOfPoint()` | Last shot: `player_id`, `shot_quality` |
| `point_end_type` | `deriveEndOfPoint()` | Last shot: `shot_index`, `shot_quality`, user input |
| `receiver_id` | `otherPlayer(server_id)` | `server_id` |
| `player1_score_after` | Accumulation | Previous rally scores + current `winner_id` |
| `player2_score_after` | Accumulation | Previous rally scores + current `winner_id` |

### Games Table

| Field | Derivation | Source Fields |
|-------|------------|---------------|
| `winner_id` | Score comparison | `player1_final_score` vs `player2_final_score` |

### Matches Table

| Field | Derivation | Source Fields |
|-------|------------|---------------|
| `player1_score` | Count sets won | Games where `winner_id = player1_id` |
| `player2_score` | Count sets won | Games where `winner_id = player2_id` |

---

## Enums and Types

### Handedness
```
'left' | 'right'
```

### Playstyle
```
'attack' | 'allround' | 'defence'
```

### RubberType
```
'inverted' | 'shortPips' | 'longPips' | 'antiSpin'
```

### TaggingMode
```
'essential' | 'full'
```

### VideoCoverage
```
'full' | 'truncatedStart' | 'truncatedEnd' | 'truncatedBoth'
```

### MatchResult
```
'player1' | 'player2' | 'incomplete'
```

### PointEndType
```
'serviceFault' | 'receiveError' | 'forcedError' | 'unforcedError' | 'winnerShot'
```

### LuckType
```
'edge' | 'net'
```

### ServeType
```
'pendulum' | 'reversePendulum' | 'tomahawk' | 'backhand' | 'hook' | 'lollipop' | 'other'
```

### ServeSpin
```
'topLeft' | 'topspin' | 'topRight' | 'sideLeft' | 'noSpin' | 'sideRight' | 'backLeft' | 'backspin' | 'backRight'
```

### Wing
```
'FH' | 'BH'
```

### ShotType (Essential Mode)
```
'serve' | 'push' | 'chop' | 'block' | 'lob' | 'drive' | 'flick' | 'loop' | 'smash' | 'other'
```

### ShotType (Full Mode) - Future
```
'serve' | 'lob' | 'chop' | 'chopBlock' | 'dropShot' | 'shortTouch' | 'push' | 'block' | 'drive' | 'flick' | 'slowSpinLoop' | 'loop' | 'fastLoop' | 'smash' | 'other'
```

### ShotQuality
```
'good' | 'average' | 'weak' | 'inNet' | 'missedLong' | 'missedWide'
```

### LandingZone
```
'BHShort' | 'MidShort' | 'FHShort' | 'BHMid' | 'MidMid' | 'FHMid' | 'BHLong' | 'MidLong' | 'FHLong'
```

### LandingType (Derived)
```
'inPlay' | 'net' | 'offLong' | 'wide'
```

### InferredSpin (Derived)
```
'unknown' | 'heavyTopspin' | 'topspin' | 'noSpin' | 'backspin' | 'heavyBackspin'
```

---

## Indexes (Recommended)

### Players Table
```sql
CREATE INDEX idx_players_name ON players (last_name, first_name);
CREATE INDEX idx_players_club ON players (club_id);
CREATE INDEX idx_players_archived ON players (is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_players_search ON players USING gin(
  to_tsvector('english', first_name || ' ' || last_name)
);
```

### Matches Table
```sql
CREATE INDEX idx_matches_player1 ON matches (player1_id);
CREATE INDEX idx_matches_player2 ON matches (player2_id);
CREATE INDEX idx_matches_date ON matches (match_date DESC);
CREATE INDEX idx_matches_players ON matches (player1_id, player2_id);
```

### Games Table
```sql
CREATE INDEX idx_games_match ON sets (match_id);
CREATE INDEX idx_games_winner ON sets (winner_id);
```

### Rallies Table
```sql
CREATE INDEX idx_rallies_game ON rallies (game_id);
CREATE INDEX idx_rallies_server ON rallies (server_id);
CREATE INDEX idx_rallies_winner ON rallies (winner_id);
CREATE INDEX idx_rallies_point_end ON rallies (point_end_type);
```

### Contacts Table
```sql
CREATE INDEX idx_contacts_rally ON shots (rally_id);
CREATE INDEX idx_contacts_player ON shots (player_id);
CREATE INDEX idx_contacts_shot_type ON shots (shot_type);
CREATE INDEX idx_contacts_time ON shots (time);
```

---

## Cardinality Summary

| Relationship                | Type | Description                       |
| --------------------------- | ---- | --------------------------------- |
| Player → Match (as player1) | 1:M  | One player plays in many matches  |
| Player → Match (as player2) | 1:M  | One player plays in many matches  |
| Match → Set                | 1:M  | One match contains many sets      |
| Set → Rally                | 1:M  | One set contains many rallies     |
| Rally → Shot             | 1:M  | One rally contains many shots     |
| Player → Rally (as server)  | 1:M  | One player serves in many rallies |
| Player → Rally (as winner)  | 1:M  | One player wins many rallies      |
| Player → Shot            | 1:M  | One player hits many shots        |

---

## Data Volume Estimates

For a typical **Best of 5 match** (3 sets played):

| Entity   | Count | Example                |
| -------- | ----- | ---------------------- |
| Matches  | 1     | Paul vs Ethan          |
| Games    | 3     | Sets 1, 2, 3           |
| Rallies  | ~60   | 20 rallies per set avg |
| Contacts | ~240  | 4 shots per rally avg  |

**For 100 matches tagged:**
- Players: ~50 unique players (future)
- Matches: 100
- Sets: ~300
- Rallies: ~6,000
- Shots: ~24,000

---

## Migration Path

### **Current (v0.9.x)** - localStorage ✅ IMPLEMENTED
- ✅ No Player table (just player1Name, player2Name strings)
- ✅ No foreign keys (IDs are strings, not UUIDs)
- ✅ All data in single localStorage key: `tt-tagger-session`
- ✅ Terminology updated: Shot, Rally, Set
- ✅ PlayerProfile types defined but not connected
- ✅ `players: PlayerProfile[]` array exists (empty, for future)

### **Phase 1** - Add Player Management (localStorage) ⏳ NOT STARTED
- Add Player create/edit UI
- Populate `players: PlayerProfile[]` array
- Change matches to use `player1_id`, `player2_id` (references to players array)
- Add player selection dropdown in match setup
- Lookup player names from players array
- Enable multi-match storage with player history

### **Phase 2** - Supabase Migration ⏳ NOT STARTED
- Create tables in Supabase (PostgreSQL)
- Migrate localStorage data to Supabase
- Implement RLS (Row Level Security) policies
- Real-time subscriptions for multi-user
- UUID primary keys
- Foreign key constraints

---

## Future Enhancements

### Additional Tables (Post-MVP)

**CLUBS**
- If clubs become structured entities (not just strings)
- Would reference from players.club_id

**TOURNAMENTS**
- If tournaments need structured data
- Would reference from matches.tournament_id

**MATCH_STATISTICS** (Materialized View)
- Pre-computed statistics per match
- Performance optimization for analytics

**PLAYER_STATISTICS** (Materialized View)
- Aggregated career stats per player
- Updated on match completion

---

## Version History

| Version | Date       | Changes                                                    |
| ------- | ---------- | ---------------------------------------------------------- |
| 1.1.0   | 2025-12-02 | Updated with current vs future schemas, terminology fixed  |
| 1.0.0   | 2025-12-02 | Initial ERD with Player table design                       |

---

## References

- **Data Schema:** `docs-match-analyser-edge-tt/DataSchema.md`
- **Architecture:** `docs-match-analyser-edge-tt/Architecture.md`
- **Type Definitions:** `app/src/rules/types.ts`

