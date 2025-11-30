# Data Schema – Consolidated MVP + Future Extensions

This document is the **single source of truth** for the TT Rally Tagger data model. It consolidates and supersedes:
- `MVP_DataSchema.md`
- `MVP_schemav2.md`
- `MVP_AIfutureproofingSchema.md`

All definitions are consistent with the authoritative specs:
- `Tagger2StepUserFlow.md`
- `MVP_Spec_and_Architecture.md`

---

## Overview

The schema supports:
1. **Step 1** – Real-time contact & rally tagging
2. **Step 2** – Shot-by-shot detail entry
3. **Stats & Analytics** – Post-match analysis

Tables are designed for **Postgres + Supabase** with `gen_random_uuid()` for IDs. Enums are stored as TEXT with CHECK constraints.

---

## 1. Players

Represents an individual table tennis player.

### 1.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core identity
    name TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Extended Fields (Post-MVP)

```sql
-- Extended player profile (add via migration)
ALTER TABLE players ADD COLUMN IF NOT EXISTS firstName TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS surname TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS club TEXT;

ALTER TABLE players ADD COLUMN IF NOT EXISTS handedness TEXT 
    CHECK (handedness IN ('right', 'left')) DEFAULT 'right';

ALTER TABLE players ADD COLUMN IF NOT EXISTS playStyle TEXT 
    CHECK (playStyle IN ('attacker', 'allround', 'defender')) DEFAULT 'allround';

-- Equipment flags (supports mixed rubber setups)
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentInverted BOOLEAN DEFAULT TRUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentLongPips BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentShortPips BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentAntiSpin BOOLEAN DEFAULT FALSE;

-- Rating for matchmaking/seeding
ALTER TABLE players ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1000;
```

### 1.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_players_name ON players (name);
CREATE INDEX IF NOT EXISTS idx_players_surname_first ON players (surname, firstName);
CREATE INDEX IF NOT EXISTS idx_players_club ON players (club);
```

---

## 2. Matches

Represents a single match between two players.

### 2.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Players
    player1Id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2Id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    firstServerId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Match structure
    gameStructure TEXT NOT NULL DEFAULT 'to11_bestOf5',
        -- Examples: 'to11_bestOf5', 'to11_bestOf7', 'to21_bestOf3'
    serviceRule TEXT NOT NULL DEFAULT '2_each_to_10_then_alternate',
    
    -- Video source
    videoSource TEXT,  -- Local file path or URL
    
    -- Extra question scopes (per-match configuration)
    serveExtraFor TEXT CHECK (serveExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    receiveExtraFor TEXT CHECK (receiveExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    thirdBallExtraFor TEXT CHECK (thirdBallExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    unforcedErrorExtraFor TEXT CHECK (unforcedErrorExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Extended Fields (Post-MVP)

```sql
-- Extended match metadata (add via migration)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS matchContext TEXT 
    CHECK (matchContext IN ('friendly', 'minorTournament', 'tournament', 'nationalTournament')) 
    DEFAULT 'friendly';

ALTER TABLE matches ADD COLUMN IF NOT EXISTS bestOf INTEGER DEFAULT 5;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1Score INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2Score INTEGER DEFAULT 0;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
```

### 2.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches (player1Id, player2Id);
CREATE INDEX IF NOT EXISTS idx_matches_context_created ON matches (matchContext, created_at DESC);
```

---

## 3. Rallies

Represents a single rally (point attempt) within a match.

### 3.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS rallies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Rally position in match
    rallyIndex INTEGER NOT NULL,  -- 1-based order within match
    
    -- Scoring
    isScoring BOOLEAN NOT NULL DEFAULT TRUE,
    winnerId UUID REFERENCES players(id) ON DELETE RESTRICT,
        -- NULL when isScoring = FALSE
    
    -- Server/Receiver (derived from firstServerId + serviceRule + score)
    serverId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    receiverId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Contact boundaries (FK to first and last contact of rally)
    startContactId UUID,  -- FK added after contacts table created
    endContactId UUID,    -- FK added after contacts table created
    
    -- End-of-rally classification
    pointEndType TEXT CHECK (pointEndType IN (
        'winnerShot', 'forcedError', 'unforcedError', 
        'serviceFault', 'receiveError', 'other'
    )),
    
    luckType TEXT CHECK (luckType IN (
        'none', 'luckyNet', 'luckyEdgeTable', 'luckyEdgeBat'
    )) DEFAULT 'none',
    
    opponentLuckOvercome BOOLEAN DEFAULT FALSE,
        -- TRUE if winner overcame earlier lucky net/edge by opponent
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Extended Fields (Post-MVP)

```sql
-- Set/game tracking for detailed score reconstruction
ALTER TABLE rallies ADD COLUMN IF NOT EXISTS setNumber SMALLINT DEFAULT 1;
ALTER TABLE rallies ADD COLUMN IF NOT EXISTS gameNumber SMALLINT DEFAULT 1;

ALTER TABLE rallies ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE rallies ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
```

### 3.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_rallies_match ON rallies (matchId);
CREATE INDEX IF NOT EXISTS idx_rallies_match_index ON rallies (matchId, rallyIndex);
CREATE INDEX IF NOT EXISTS idx_rallies_server_match ON rallies (serverId, matchId);
CREATE INDEX IF NOT EXISTS idx_rallies_winner ON rallies (winnerId);
```

---

## 4. Contacts

Represents a single ball contact (timestamp marker from Step 1).

### 4.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    rallyId UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
    
    -- Video timestamp
    time NUMERIC NOT NULL,  -- Seconds into video (high precision)
    
    -- Position within rally
    shotIndex SMALLINT NOT NULL,  -- 1-based index within rally
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK constraints to rallies after contacts table exists
ALTER TABLE rallies ADD CONSTRAINT fk_rallies_start_contact 
    FOREIGN KEY (startContactId) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE rallies ADD CONSTRAINT fk_rallies_end_contact 
    FOREIGN KEY (endContactId) REFERENCES contacts(id) ON DELETE SET NULL;
```

### 4.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_rally ON contacts (rallyId);
CREATE INDEX IF NOT EXISTS idx_contacts_rally_shot ON contacts (rallyId, shotIndex);
CREATE INDEX IF NOT EXISTS idx_contacts_time ON contacts (time);
```

---

## 5. Shots

Represents the detailed annotation for a single contact (from Step 2).

### 5.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    contactId UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    rallyId UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
    playerId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Shot position in rally
    shotIndex SMALLINT NOT NULL,  -- Mirrors contact.shotIndex for query convenience
    
    -- Flags
    isServe BOOLEAN NOT NULL DEFAULT FALSE,
    isReturnOfServe BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Q1: Wing
    wing TEXT CHECK (wing IN ('FH', 'BH')) NOT NULL,
    
    -- Q2: Position Sector (3x3 grid)
    positionSector TEXT CHECK (positionSector IN (
        'closeLeft', 'closeMid', 'closeRight',
        'midLeft', 'midMid', 'midRight',
        'farLeft', 'farMid', 'farRight'
    )) NOT NULL,
    
    -- Q3: Shot Type (NULL for serves, which use serveType)
    shotType TEXT CHECK (shotType IN (
        'shortTouch', 'push', 'dig', 'chop', 'block', 'chopBlock',
        'lob', 'drive', 'loop', 'powerLoop', 'smash', 'flick', 'banana', 'other'
    )),
    
    -- Q4: Landing / End Point
    landingType TEXT CHECK (landingType IN (
        'inPlay', 'net', 'offLong', 'wide'
    )) NOT NULL,
    
    landingZone TEXT CHECK (landingZone IN (
        'BHShort', 'MidShort', 'FHShort',
        'BHMid', 'MidMid', 'FHMid',
        'BHLong', 'MidLong', 'FHLong'
    )),  -- Only valid when landingType = 'inPlay'
    
    -- Q5: Shot Quality
    shotQuality TEXT CHECK (shotQuality IN ('good', 'average', 'weak')) NOT NULL,
    
    --------------------
    -- SERVE FIELDS (only when isServe = TRUE)
    --------------------
    
    serveType TEXT CHECK (serveType IN (
        'pendulum', 'reversePendulum', 'tomahawk', 
        'backhand', 'hook', 'shovel', 'other'
    )),
    
    serveSpinPrimary TEXT CHECK (serveSpinPrimary IN (
        'under', 'top', 'sideLeft', 'sideRight', 'none'
    )),
    
    serveSpinStrength TEXT CHECK (serveSpinStrength IN (
        'low', 'medium', 'heavy'
    )),
    
    isFault BOOLEAN DEFAULT FALSE,
    
    faultType TEXT CHECK (faultType IN (
        'net', 'long', 'wide', 'other'
    )),  -- Only meaningful when isFault = TRUE
    
    serveIssueCause TEXT CHECK (serveIssueCause IN (
        'technicalExecution', 'badDecision', 'tooHigh',
        'tooLong', 'notEnoughSpin', 'easyToRead'
    )),  -- Only set when shotQuality = 'weak' AND serveExtraFor enabled
    
    --------------------
    -- RETURN OF SERVE FIELDS (only when isReturnOfServe = TRUE)
    --------------------
    
    receiveIssueCause TEXT CHECK (receiveIssueCause IN (
        'misreadSpinType', 'misreadSpinAmount',
        'technicalExecution', 'badDecision'
    )),  -- Only set when RoS is bad/weak AND receiveExtraFor enabled
    
    --------------------
    -- THIRD BALL FIELDS (only when shotIndex = 3)
    --------------------
    
    thirdBallIssueCause TEXT CHECK (thirdBallIssueCause IN (
        'incorrectPreparation', 'unexpectedReturn', 'technicalExecution',
        'badDecision', 'tooAggressive', 'tooPassive'
    )),  -- Only set when shotQuality = 'weak' AND thirdBallExtraFor enabled
    
    --------------------
    -- UNFORCED ERROR FIELDS (only on final shot of rally)
    --------------------
    
    unforcedErrorCause TEXT CHECK (unforcedErrorCause IN (
        'technicalExecution', 'badDecision', 'tooAggressive', 'tooPassive'
    )),  -- Only set when pointEndType = 'unforcedError' AND unforcedErrorExtraFor enabled
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Extended Fields (Post-MVP / AI Training)

```sql
-- Placement coordinates for heatmaps and ML
ALTER TABLE shots ADD COLUMN IF NOT EXISTS placementX NUMERIC;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS placementY NUMERIC;

-- Contact height/depth for 3D analysis
ALTER TABLE shots ADD COLUMN IF NOT EXISTS contactHeight NUMERIC;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS contactDepth NUMERIC;

-- Serve position flag
ALTER TABLE shots ADD COLUMN IF NOT EXISTS isServeFromBackhandSide BOOLEAN;

-- Phase of play (for pattern analysis)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN (
    'serve', 'receive', 'thirdBall', 'fourthBall', 'openRally'
));

-- Outcome classification
ALTER TABLE shots ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN (
    'winner', 'forcedError', 'unforcedError', 'inPlay', 'fault'
));

ALTER TABLE shots ADD COLUMN IF NOT EXISTS errorType TEXT CHECK (errorType IN (
    'net', 'long', 'wide', 'other'
));
```

### 5.3 Indexes

```sql
-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_shots_contact ON shots (contactId);
CREATE INDEX IF NOT EXISTS idx_shots_match_rally_index ON shots (matchId, rallyId, shotIndex);
CREATE INDEX IF NOT EXISTS idx_shots_player ON shots (playerId);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_shots_player_serve ON shots (playerId, isServe) WHERE isServe = TRUE;
CREATE INDEX IF NOT EXISTS idx_shots_player_serve_outcome ON shots (playerId, isServe, shotQuality);
CREATE INDEX IF NOT EXISTS idx_shots_match_serve_quality ON shots (matchId, isServe, shotQuality);
CREATE INDEX IF NOT EXISTS idx_shots_landing ON shots (landingType, landingZone);
```

---

## 6. Migration Order

When setting up the database:

1. `players`
2. `matches`
3. `rallies` (without contact FKs initially)
4. `contacts`
5. Add FK constraints to `rallies` for start/end contacts
6. `shots`
7. Indexes (all tables)

---

## 7. Enum Reference

### 7.1 Player Scope Enums
- **extraQuestionScope**: `none`, `player1`, `player2`, `both`

### 7.2 Wing
- `FH`, `BH`

### 7.3 Position Sector (3×3 Grid)
```
closeLeft   closeMid   closeRight
midLeft     midMid     midRight
farLeft     farMid     farRight
```

### 7.4 Shot Type
- Defensive → Offensive: `shortTouch`, `push`, `dig`, `chop`, `block`, `chopBlock`, `lob`, `drive`, `loop`, `powerLoop`, `smash`, `flick`, `banana`, `other`

### 7.5 Landing Type
- `inPlay`, `net`, `offLong`, `wide`

### 7.6 Landing Zone (3×3 Grid, opponent's perspective)
```
BHShort   MidShort   FHShort
BHMid     MidMid     FHMid
BHLong    MidLong    FHLong
```

### 7.7 Shot Quality
- `good`, `average`, `weak`

### 7.8 Serve Type
- `pendulum`, `reversePendulum`, `tomahawk`, `backhand`, `hook`, `shovel`, `other`

### 7.9 Serve Spin Primary
- `under`, `top`, `sideLeft`, `sideRight`, `none`

### 7.10 Serve Spin Strength
- `low`, `medium`, `heavy`

### 7.11 Fault Type
- `net`, `long`, `wide`, `other`

### 7.12 Serve Issue Cause
- `technicalExecution`, `badDecision`, `tooHigh`, `tooLong`, `notEnoughSpin`, `easyToRead`

### 7.13 Receive Issue Cause
- `misreadSpinType`, `misreadSpinAmount`, `technicalExecution`, `badDecision`

### 7.14 Third Ball Issue Cause
- `incorrectPreparation`, `unexpectedReturn`, `technicalExecution`, `badDecision`, `tooAggressive`, `tooPassive`

### 7.15 Point End Type
- `winnerShot`, `forcedError`, `unforcedError`, `serviceFault`, `receiveError`, `other`

### 7.16 Luck Type
- `none`, `luckyNet`, `luckyEdgeTable`, `luckyEdgeBat`

### 7.17 Unforced Error Cause
- `technicalExecution`, `badDecision`, `tooAggressive`, `tooPassive`

---

## 8. Notes

### 8.1 Consistency with Specs

All enum values and field definitions are consistent with:
- `Tagger2StepUserFlow.md` (Section 8: Data Schema)
- `MVP_Spec_and_Architecture.md` (Section 5: Database Mapping)

### 8.2 Business Logic

Field population rules are defined in the workflow spec. Key conditional rules:

| Field | Condition |
|-------|-----------|
| `serveType`, `serveSpinPrimary`, `serveSpinStrength` | `isServe = TRUE` |
| `faultType` | `isFault = TRUE` |
| `serveIssueCause` | `isServe = TRUE` AND `shotQuality = 'weak'` AND `serveExtraFor` enabled for player |
| `receiveIssueCause` | `isReturnOfServe = TRUE` AND (error OR weak) AND `receiveExtraFor` enabled for player |
| `thirdBallIssueCause` | `shotIndex = 3` AND `shotQuality = 'weak'` AND `thirdBallExtraFor` enabled for player |
| `unforcedErrorCause` | `pointEndType = 'unforcedError'` AND `unforcedErrorExtraFor` enabled for player |
| `landingZone` | `landingType = 'inPlay'` |
| `shotType` | `isServe = FALSE` (serves use `serveType` instead) |

### 8.3 AI Future-Proofing

The extended fields in Section 5.2 (`placementX/Y`, `contactHeight/Depth`, `phase`, `outcome`) are designed to support:
- ML model training for shot prediction
- Pattern recognition
- Heatmap generation
- Advanced tactical analysis

These can be populated via:
- Manual tagging (post-MVP)
- Computer vision inference
- Semi-automated estimation from video timestamps

---

_End of consolidated DataSchema.md_

