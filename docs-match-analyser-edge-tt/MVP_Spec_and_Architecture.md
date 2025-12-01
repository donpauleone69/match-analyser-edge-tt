# MVP Specification & Architecture

This document defines the **Minimum Viable Product (MVP)** for the table-tennis video tagging app, and the proposed technical architecture. It is complementary to, and consistent with, `Tagger 2-Step User Flow & Data Schema (Revised)`.

---

## 1. Core Goals

- Provide a **two-step tagging flow**:
  1. **Step 1:** Real-time contact + rally tagging.
  2. **Step 2:** Shot-by-shot detail entry.
- Keep real-time tagging cognitively light.
- Keep detailed tagging structured and efficient.
- Produce enough structured data for a **simple stats screen** in MVP, with room to grow.

---

## 2. Entities

### 2.1 Player

- `playerId` (internal UUID)
- `name` (string)
- `rating` (integer, 1-10) – skill rating where 1 = Beginner, 10 = Professional

> Note: Extra question scope is configured per-match, not per-player.

### 2.2 Match

- References:
  - `player1Id`
  - `player2Id`
- Configuration:
  - `firstServerId` (P1 or P2) – editable; changing recalculates all server assignments
  - `gameStructure` (e.g. "to 11, best of 5")
  - `serviceRule` (e.g. 2 serves each until 10–10, then alternate) – fixed default for MVP.
- Match metadata:
  - `matchDate` – date when the match was played
- Video:
  - `videoSource` – local file path/URL
  - `hasVideo` (bool) – flag indicating if video is available for this match
  - **Note**: Single video per match; users must combine files before importing
- Workflow state:
  - `step1Complete` (bool) – TRUE when Step 1 tagging is finished
  - `step2Complete` (bool) – TRUE when Step 2 tagging is finished
- Extra question scope (per player in this match):
  - `serveExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `receiveExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `thirdBallExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `unforcedErrorExtraFor` ∈ {`none`, `player1`, `player2`, `both`}

### 2.3 Game

- `gameId`
- `matchId`
- `gameNumber` (1, 2, 3...)
- `player1FinalScore`, `player2FinalScore` – actual final score
- `winnerId`
- `hasVideo` (bool) – FALSE if this game was not filmed
- `videoStartPlayer1Score`, `videoStartPlayer2Score` – score when video/tagging began (for mid-game starts)

### 2.5 Rally, Contact, Shot

These mirror the `Tagger2Step` spec:

- **Rally** – grouping of contacts with:
  - `gameId` – FK to parent game
  - `rallyIndex` – 1-based within game
  - `isScoring`
  - `winnerId`
  - `player1ScoreAfter`, `player2ScoreAfter` – score after this rally
  - `serverId`, `receiverId`
  - `hasVideoData` (bool) – FALSE for score-only rallies (no contacts/shots)
  - `pointEndType`, `luckType`, `opponentLuckOvercome`
  - `serverCorrected` (bool) – flag if server was manually corrected
  - `scoreCorrected` (bool) – flag if score was manually corrected
  - `correctionNotes` (text, optional) – notes about corrections made

- **Contact** – timestamped event from Step 1:
  - `time` (seconds)
  - `rallyId`
  - `shotIndex`
  - Only created for rallies with `hasVideoData = TRUE`

- **Shot** – detailed annotation from Step 2:
  - General fields: player, wing, positionSector, shotType, inferredSpin, landingType/Zone, shotQuality.
  - Serve / RoS / third-ball / unforced-error specific fields as per Tagger2Step schema.
  - Only created for rallies with `hasVideoData = TRUE`

---

## 3. Screens & Flows

### 3.1 Screen 1: Match Setup

**Goal:** Set up players, match configuration, and select video.

**Elements:**

- **Player cards**:
  - Text fields: `Player 1 name`, `Player 2 name`.
  - Optionally: dropdown of recently used players.
  - Checkbox for extended diagnostics (hinting scopes):
    - `[ ] Extended data for Player 1`
    - `[ ] Extended data for Player 2`

- **Match configuration**:
  - First server: `P1` / `P2`.
  - Game structure: simple dropdown (MVP fixed presets).

- **Match date**:
  - Date picker for when the match was played.
  - Defaults to today's date but should be editable.

- **Video loader** (optional):
  - "Select Video" button → system file picker.
  - Show selected filename and duration.
  - Checkbox: "No video available (results only)" – when checked, video selection is disabled.

- **Action button**:
  - **"Start Step 1 (Tag contacts)"** (when video is available)
  - **"Enter Match Results"** (when no video is available)
  - Enabled only when:
    - Player names set,
    - First server chosen,
    - (Video selected OR "No video" checkbox checked)

---

### 3.2 Screen 2: Step 1 – Contacts & Rallies

**Goal:** Capture all contacts and rally boundaries while watching the match.

**Layout:**

- Top: **Video player**
- Middle: **Timeline with markers**
- Bottom: **Tagging controls**

#### Video Player Requirements

- Play / Pause
- Playback speeds: `0.5×`, `0.75×`, `1×` (MVP)
- Seek/scrub bar
- Frame-step / nudge:
  - Buttons for ± one small step (frame-based or ~0.02–0.04 seconds)

#### Timeline Markers

- **Contact markers**:
  - Small vertical ticks (uniform colour).
- **Rally end – SCORE markers**:
  - Larger tick or underline in a distinct colour (e.g. green).
- **Rally end – NO SCORE markers**:
  - Distinct colour (e.g. orange/grey).

Goal: visually show where rallies begin/end and density of contacts.

#### Tagging Controls

Bottom toolbar:

- **CONTACT** (primary, large)
  - On press: record current time as Contact.
- **RALLY END – SCORE**
  - Ends current rally as scoring.
  - Opens Winner dialog.
- **RALLY END – NO SCORE**
  - Ends current rally as non-scoring (let/interrupt).
- **UNDO LAST CONTACT**
  - Removes last created Contact.

#### Winner Dialog

When scoring rally ends:

- Modal: “Who won the point?”
  - Buttons: `Player 1`, `Player 2`
- On select:
  - Finalise rally.
  - Add scoring rally-end marker.

#### Review Mode (Step 1)

User can review and tweak contacts before Step 2:

- Toggle "Review mode" or button "Review Step 1".
- Show a list of rallies and contacts in sidebar or overlay.
- Selecting a contact:
  - Seeks video to that timestamp.
  - Shows frame.
  - Allow nudging via ± buttons (changes `time`).
- **Error correction**:
  - Allow manual correction of server/receiver if wrong player was recorded.
  - Allow manual correction of score if entered incorrectly.
  - Set correction flags and optionally add notes.
- Mark Step 1 complete when user is satisfied.

#### Transition to Step 2

Button: **“Step 1 Complete → Continue to Step 2”**

- Preconditions:
  - At least one rally.
  - No unclosed rally (last contact must be followed by RALLY END).
- Step 1 data becomes read-only.

---

### 3.3 Screen 3: Step 2 – Shot-by-Shot Tagging

**Goal:** Tag each shot in detail using the Tagger2Step Q1–Q5 and conditional logic.

**Layout:**

- Top: **Video player** (same as Step 1).
- Middle:
  - Left: Rally/shot list:
    - Rally 1: Shots 1..N  
    - Rally 2: Shots 1..M  
  - Right: **Shot Detail Panel**.
- Bottom:
  - Navigation: `Previous shot`, `Next shot`.
  - Progress indicator: “Shot X of Y”.

**Shot Detail Panel:**

Implements the Tagger2Step spec:

- Q1: Player & Wing
- Q2: Position Sector (9-cell)
- Q3: Shot Type (or Serve Type for first shot)
- Q4: Landing / End point
- Q5: Shot Quality

**Conditional extras:**

- **Serve (shot 1 of rally):**
  - `serveType`, `serveSpinPrimary`, `serveSpinStrength`, `isFault`, `faultType`.
  - If `shotQuality = weak` and player is in `serveExtraFor`: ask `serveIssueCause`.

- **Return of Serve (shot 2):**
  - If Q4 indicates error OR (Q4 in-play & Q5=`weak`), and player is in `receiveExtraFor`: ask `receiveIssueCause`.

- **Third ball (shot 3):**
  - If Q5=`weak` and player is in `thirdBallExtraFor`: ask `thirdBallIssueCause`.

- **End of rally:**
  - Ask `pointEndType`, `luckType`.
  - If `pointEndType = unforcedError` and player is in `unforcedErrorExtraFor`: ask `unforcedErrorCause`.

Users can skip extras by turning off extended data for that player in Match Setup.

#### Completion

- A rally is “complete” when all its shots have required fields filled.
- Step 2 is complete when all (chosen) rallies are complete or clearly marked as skipped.
- Button: **“Done → View Stats”**.

---

### 3.4 Screen 4: Game & Score Entry

**Goal:** Enter game scores, especially for games/rallies without video coverage.

**Elements:**

- **Game list**:
  - Shows all games in match with scores
  - Per-game: `Player 1 score` - `Player 2 score`
  - Video coverage indicator per game

- **For games without video** (`hasVideo = FALSE`):
  - Enter final score only
  - No Step 1/2 tagging available

- **For games with partial video**:
  - Enter video start score (e.g., "Video starts at 5-3")
  - Enter final score if video doesn't cover the end
  - Rallies outside video range are score-only

- **Action buttons**:
  - **"Add Game"** – add another game to the match
  - **"Save & Continue"** – save scores and proceed to tagging

**Video Requirement Note:**
Display reminder: "Match video should be a single file. Please combine multiple video files before importing."

---

### 3.5 Screen 5: Simple Stats (MVP)

**Goal:** Provide immediate, basic insight from one tagged match.

Minimum stats:

#### Per Player

1. **Match Summary**
   - Points won / lost.
   - Number of scoring rallies.

2. **Serve Stats**
   - Serve count.
   - Fault count + breakdown by `faultType`.
   - `serveType` distribution.
   - `shotQuality` distribution for serves (% good/average/weak).
   - Count of `serveIssueCause` when available.

3. **Receive Stats (RoS)**
   - # of RoS errors (NET/OFF/WIDE).
   - # of RoS weak in-play (`shotQuality = weak`).
   - Breakdown of `receiveIssueCause`.

4. **Point-Ending Stats**
   - Count by `pointEndType`:
     - `winnerShot`, `forcedError`, `unforcedError`, `serviceFault`, `receiveError`, `other`.
   - Count by `luckType`:
     - `luckyNet`, `luckyEdgeTable`, `luckyEdgeBat`.
   - Breakdown of `unforcedErrorCause` where present.

Layout: side-by-side columns for Player 1 and Player 2.

---

## 4. Technical Stack & Architecture

### 4.1 Platform

**Primary:** Web Application (React SPA)

- **Framework:** React with TypeScript
- **Build Tool:** Vite (fast local development)
- **Routing:** React Router v7

**Rationale:**

- Cross-platform: works on tablets, laptops, desktops
- Local-first architecture with offline support
- Modern, fast development experience
- Easy deployment and updates

### 4.2 Frontend Stack

#### UI Layer
- **TailwindCSS** – utility-first styling
- **Radix UI** – accessible component primitives
- **Headless UI** – unstyled components for custom design
- **Lucide Icons** – consistent iconography

#### State & Data Layer
- **TanStack Query** – server state management:
  - Data fetching/caching/mutations from Supabase
  - Background refetching and optimistic updates
  - Query invalidation on related data changes
- **Zustand** – lightweight global state for UI:
  - Current view/selection state
  - Modal and panel states
  - User preferences and session state
- **Dexie.js** (IndexedDB wrapper) for:
  - Local-first data storage
  - Offline caching of shots, rallies, matches
  - Sync queue for background synchronization
  - Local schema mirrors Supabase tables

#### Video Layer
- **Hls.js** – HLS video streaming support
- **Video.js** – video player UI wrapper with custom controls
- **Custom Timeline Overlays** for:
  - Rally markers
  - Shot/contact markers
  - Error indicators
  - Frame-accurate seeking (using `requestVideoFrameCallback` API)

### 4.3 Backend Stack

#### Primary Backend & Database
- **Supabase** (Postgres + Row Level Security)
  - Players, matches, games, rallies, contacts, shots
  - User authentication
  - Real-time subscriptions (optional)

#### Edge Functions (Supabase)
- Video clipping automation
- Analytics rollups
- Heavy data transforms
- AI pre-processing triggers (future)

#### Storage
- **Supabase Storage**
  - Rally-level video clips (not full matches)
  - Used for AI processing (future)

### 4.4 Architecture Layers

1. **UI Layer (React + TailwindCSS)**
   - Pages:
     - `MatchSetupPage`
     - `Step1TaggingPage`
     - `Step1ReviewPage`
     - `Step2TaggingPage`
     - `GameScoreEntryPage`
     - `StatsPage`
   - Component-based architecture with hooks

2. **Video Engine (Video.js + Hls.js)**
   - `VideoPlayer` component:
     - Load video from URL or local file
     - Play/pause
     - Playback speeds: 0.5×, 0.75×, 1×
     - Seek to timestamp
     - Frame-step navigation
   - Emits `currentTime` via callbacks/state

3. **Tagging Engine (Custom Hooks/Services)**
   - Step 1 Logic:
     - Contact creation with timestamps
     - Rally boundary management
     - Winner assignment
   - Step 2 Logic:
     - Shot iteration through contacts
     - Conditional question flow (serve/RoS/third/unforced)
     - Validation and completion tracking

4. **Data Layer (TanStack Query + Zustand + Dexie.js + Supabase)**
   - Server state with TanStack Query:
     - Supabase query caching and mutations
     - Optimistic updates for responsive UX
     - Background sync and refetching
   - UI state with Zustand:
     - Application-wide UI state (modals, selections, preferences)
     - Lightweight, no boilerplate
   - Local-first with Dexie.js:
     - `playersTable`, `matchesTable`, `gamesTable`
     - `ralliesTable`, `contactsTable`, `shotsTable`
   - Sync to Supabase:
     - Queue architecture for offline changes
     - Sync triggers on connection restore
     - Conflict resolution: last-write-wins (non-critical), match-lock (rallies)

5. **Stats Engine**
   - Client-side aggregations for immediate display
   - Postgres materialized views for historical analytics
   - Indexed on `playerId`, `shotType`, `matchDate`

### 4.5 Sync & Offline Architecture

- **Local-first:** User works fully offline with Dexie.js
- **Background sync:** Changes queued and synced when online
- **Conflict resolution:**
  - Non-critical fields: last-write-wins
  - Rally data: match-level locking to prevent conflicts

### 4.6 Future: AI Layer (Post-MVP)

Schema hooks included for future AI integration:
- **Shot Classification Pipeline:**
  - Claude + custom fine-tuning
  - Vision transformer / pose tracking (MediaPipe)
  - Whisper for ball contact audio detection
- **Outputs:**
  - Shot type predictions
  - Quality scores
  - Auto-trimmed rally clips
- **Schema fields:**
  - Video references
  - Training sample flags
  - Model confidence scores
  - Auto-tag suggestions table

---

## 5. Database Mapping (Summary)

See `DataSchema.md` for full details. At a high level:

- **Players**:
  - `id`, `name`, `rating`, `createdAt`
- **Matches**:
  - `id`, `player1Id`, `player2Id`, `firstServerId`, `matchDate`, `videoSource`, `hasVideo`, `gameStructure`, `serviceRule`, `step1Complete`, `step2Complete`, `serveExtraFor`, `receiveExtraFor`, `thirdBallExtraFor`, `unforcedErrorExtraFor`
- **Games**:
  - `id`, `matchId`, `gameNumber`, `player1FinalScore`, `player2FinalScore`, `winnerId`, `hasVideo`, `videoStartPlayer1Score`, `videoStartPlayer2Score`
- **Rallies**:
  - `id`, `matchId`, `gameId`, `rallyIndex`, `isScoring`, `winnerId`, `player1ScoreAfter`, `player2ScoreAfter`, `serverId`, `receiverId`, `hasVideoData`, `startContactId`, `endContactId`, `pointEndType`, `luckType`, `opponentLuckOvercome`, `serverCorrected`, `scoreCorrected`, `correctionNotes`
- **Contacts**:
  - `id`, `rallyId`, `time`, `shotIndex`
- **Shots**:
  - General: `contactId`, `playerId`, `shotIndex`, `isServe`, `isReturnOfServe`, `wing`, `positionSector`, `shotType`, `inferredSpin`, `landingType`, `landingZone`, `shotQuality`
  - Serve fields: `serveType`, `serveSpinPrimary`, `serveSpinStrength`, `isFault`, `faultType`, `serveIssueCause`
  - RoS/third-ball/unforced-error fields as specified in `Tagger2StepUserFlow.md`

---

## 6. MVP Completion Criteria

The MVP is considered complete when:

1. User can:
   - Create a match with two players.
   - Set match date.
   - Select video (single video file per match).
   - Enter game scores (per-game final scores).
   - Handle partial video coverage:
     - Mark games without video (score-only)
     - Enter video start score for mid-game video starts
     - Tag rallies with video, enter scores for rallies without video
   - Complete Step 1 tagging for games/rallies with video.
   - Optionally review/adjust Step 1 contacts.
   - Correct server/score errors if needed (edit `firstServerId`, use correction flags).
   - Complete Step 2 shot tagging for all scoring rallies with video.
   - View a basic stats screen per player.

2. Data is persisted locally and can be reloaded to:
   - Resume Step 1 or Step 2.
   - Revisit stats.
   - View match history with workflow state (`step1Complete`, `step2Complete`).

3. All logic and enums are consistent with the **Tagger 2-Step User Flow & Data Schema (Revised)** and **DataSchema.md** documents.

4. Validation rules enforced:
   - Every rally must have at least 1 contact (when `hasVideoData = TRUE`).
   - `shotType` required for non-serve shots.
   - Service faults always have `shotQuality = 'weak'`.
   - Non-scoring rallies are skipped in Step 2.

5. Error correction:
   - `firstServerId` is editable; recalculates all server assignments.
   - `serverCorrected`, `scoreCorrected` flags on rallies.
   - Correction notes optional but recommended.

