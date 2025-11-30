# TT Rally Tagger – MVP Database Schema

This document defines the **minimum viable Postgres / Supabase schema** for the TT Rally Tagger project.

It covers:

- `players`
- `matches`
- `rallies`
- `shots`
- Core indexes for analytics

> All tables are designed for **Postgres + Supabase** and use `gen_random_uuid()` for IDs.

---

## 1. Players

Represents an individual table tennis player, including style, handedness, and equipment.

```sql
------------------------------------------------------------
-- PLAYERS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal Info
    firstName TEXT,
    surname   TEXT,
    club      TEXT,

    -- Player Characteristics
    handedness TEXT CHECK (handedness IN ('right', 'left'))
        NOT NULL DEFAULT 'right',

    playStyle TEXT CHECK (playStyle IN ('attacker', 'allround', 'defender'))
        DEFAULT 'allround',

    -- "alertingStyle" kept flexible; you can refine allowed values later
    alertingStyle TEXT CHECK (alertingStyle IN ('attacking', 'alerting', 'defensive', 'none'))
        DEFAULT 'none',

    -- Equipment Flags (simple, works well with mixed rubbers)
    equipmentInverted  BOOLEAN DEFAULT TRUE,
    equipmentLongPips  BOOLEAN DEFAULT FALSE,
    equipmentShortPips BOOLEAN DEFAULT FALSE,
    equipmentAntiSpin  BOOLEAN DEFAULT FALSE,

    -- Ratings & Metadata
    rating     INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.1 Optional indexes (MVP+)

```sql
CREATE INDEX IF NOT EXISTS idx_players_name
ON players (surname, firstName);

CREATE INDEX IF NOT EXISTS idx_players_club
ON players (club);
```

---

## 2. Matches

```sql
------------------------------------------------------------
-- MATCHES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    homePlayerId UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    awayPlayerId UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ DEFAULT NOW(),
    ended_at     TIMESTAMPTZ,

    matchContext TEXT CHECK (
      matchContext IN ('friendly', 'minorTournament', 'tournament', 'nationalTournament')
    ) DEFAULT 'friendly',

    bestOf    INTEGER NOT NULL DEFAULT 5,
    homeScore INTEGER DEFAULT 0,
    awayScore INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.1 Index

```sql
CREATE INDEX IF NOT EXISTS idx_matches_context_started_at
ON matches (matchContext, started_at DESC);
```

---

## 3. Rallies

```sql
------------------------------------------------------------
-- RALLIES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rallies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

    setNumber   SMALLINT NOT NULL DEFAULT 1,
    gameNumber  SMALLINT NOT NULL DEFAULT 1,
    rallyNumber INTEGER  NOT NULL,

    servingPlayerId   UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    receivingPlayerId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,

    rallyWinnerPlayerId UUID REFERENCES players(id) ON DELETE RESTRICT,
    rallyEndReason      TEXT,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at   TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.1 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_rallies_match
ON rallies (matchId);

CREATE INDEX IF NOT EXISTS idx_rallies_match_rallyNumber
ON rallies (matchId, rallyNumber);

CREATE INDEX IF NOT EXISTS idx_rallies_servingPlayer_match
ON rallies (servingPlayerId, matchId);
```

---

## 4. Shots

```sql
------------------------------------------------------------
-- SHOTS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    rallyId UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,

    shotIndex SMALLINT NOT NULL,

    playerId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,

    isServe    BOOLEAN NOT NULL DEFAULT FALSE,
    strokeType TEXT,
    phase      TEXT,

    outcome   TEXT,
    errorType TEXT,

    placementX NUMERIC,
    placementY NUMERIC,

    contactHeight NUMERIC,
    contactDepth  NUMERIC,

    serveType TEXT CHECK (
      serveType IN ('pendulum', 'reversePendulum', 'tomahawk', 'backhand', 'hook', 'shovel', 'other')
    ),
    serveSpinPrimary TEXT CHECK (
      serveSpinPrimary IN ('under', 'top', 'sideLeft', 'sideRight', 'none')
    ),
    serveSpinStrength TEXT CHECK (
      serveSpinStrength IN ('low', 'medium', 'heavy')
    ),
    isServeFromBackhandSide BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.1 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_shots_match_rally_shotIndex
ON shots (matchId, rallyId, shotIndex);

CREATE INDEX IF NOT EXISTS idx_shots_player_isServe_outcome
ON shots (playerId, isServe, outcome);

CREATE INDEX IF NOT EXISTS idx_shots_match_isServe_outcome
ON shots (matchId, isServe, outcome);
```

---

## Migration Order

1. `players`
2. `matches`
3. `rallies`
4. `shots`
5. Indexes

---

_End of `MVPschema.md`_
