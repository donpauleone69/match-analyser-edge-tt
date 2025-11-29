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
- `extendedDataEnabled` (bool) – optional per-player hint; actual extra question scope is stored per match.

### 2.2 Match

- References:
  - `player1Id`
  - `player2Id`
- Configuration:
  - `firstServerId` (P1 or P2)
  - `gameStructure` (e.g. “to 11, best of 5”)
  - `serviceRule` (e.g. 2 serves each until 10–10, then alternate) – fixed default for MVP.
- Video:
  - `videoSource` – local file path/URL.
- Extra question scope (per player in this match):
  - `serveExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `receiveExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `thirdBallExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `unforcedErrorExtraFor` ∈ {`none`, `player1`, `player2`, `both`}

### 2.3 Rally, Contact, Shot

These mirror the `Tagger2Step` spec:

- **Rally** – grouping of contacts with:
  - `isScoring`
  - `winnerId`
  - `serverId`, `receiverId`
  - `pointEndType`, `luckType`, `opponentLuckOvercome`

- **Contact** – timestamped event from Step 1:
  - `time` (seconds)
  - `rallyId`
  - `shotIndex`

- **Shot** – detailed annotation from Step 2:
  - General fields: player, wing, positionSector, shotType, landingType/Zone, shotQuality.
  - Serve / RoS / third-ball / unforced-error specific fields as per Tagger2Step schema.

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

- **Video loader**:
  - “Select Video” button → system file picker.
  - Show selected filename and duration.

- **Action button**:
  - **“Start Step 1 (Tag contacts)”**
  - Enabled only when:
    - Player names set,
    - Video selected,
    - First server chosen.

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

- Toggle “Review mode” or button “Review Step 1”.
- Show a list of rallies and contacts in sidebar or overlay.
- Selecting a contact:
  - Seeks video to that timestamp.
  - Shows frame.
  - Allow nudging via ± buttons (changes `time`).
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

### 3.4 Screen 4: Simple Stats (MVP)

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

### 4.1 Platform Recommendation

**Primary:** Native iPad app.

- Language: **Swift**
- UI: **SwiftUI**
- Video: **AVFoundation / AVPlayer**
- Persistence: **SQLite** (via GRDB) or **Core Data**

**Rationale:**

- AVPlayer gives robust:
  - Precise seeking.
  - Variable playback rate (0.5×/0.75×/1×).
  - Reliable timing for contacts and frame-ish stepping.
- SwiftUI simplifies:
  - Multi-screen flows (Setup → Step1 → Step2 → Stats).
  - Touch-first layouts (large buttons, thumb zones).
- iPad form factor fits use case (coach with tablet).

**Future options:**

- Mac Catalyst build for desktop use.
- Cloud sync with CloudKit or similar (v2+).

### 4.2 Architecture Layers

1. **UI Layer (SwiftUI)**
   - Views:
     - `MatchSetupView`
     - `Step1TaggingView`
     - `Step1ReviewView` (mode of Step1 view)
     - `Step2TaggingView`
     - `StatsView`
   - Uses MVVM:
     - `MatchSetupViewModel`, `Step1ViewModel`, `Step2ViewModel`, `StatsViewModel`.

2. **Video Engine (AVFoundation)**
   - `VideoPlayerController`:
     - Load video.
     - Play/pause.
     - Set playback rate.
     - Seek to time.
     - Frame-step or small-time-step functions.
   - Emits `currentTime` to view models.

3. **Tagging Engine**
   - Handles Step 1:
     - Creation of Contacts, Rallies.
     - Rally ending logic, winner assignment.
   - Handles Step 2:
     - Iteration through contacts in order.
     - Determining which questions to show (serve/RoS/third/unforced).
     - Validating completion status.

4. **Data Layer**
   - Repository-style APIs:
     - `PlayerRepository`
     - `MatchRepository`
     - `RallyRepository`
     - `ContactRepository`
     - `ShotRepository`
   - Backed by SQLite/CoreData tables mirroring the schema in `DataSchema.md`.

5. **Stats Engine**
   - Runs aggregations over shots & rallies:
     - Serve stats.
     - Receive stats.
     - End-of-rally stats.
   - Feeds `StatsViewModel` for the stats screen.

---

## 5. Database Mapping (Summary)

See `DataSchema.md` for full details. At a high level:

- **Players**:
  - `id`, `name`, `createdAt`
- **Matches**:
  - `id`, `player1Id`, `player2Id`, `firstServerId`, `videoSource`, `gameStructure`, `serviceRule`, `serveExtraFor`, `receiveExtraFor`, `thirdBallExtraFor`, `unforcedErrorExtraFor`
- **Rallies**:
  - `id`, `matchId`, `index`, `isScoring`, `winnerId`, `serverId`, `receiverId`, `startContactId`, `endContactId`, `pointEndType`, `luckType`, `opponentLuckOvercome`
- **Contacts**:
  - `id`, `rallyId`, `time`, `shotIndex`
- **Shots**:
  - General shot fields + serve / RoS / third-ball / unforced-error fields as specified in `Tagger2StepUserFlow.md`.

---

## 6. MVP Completion Criteria

The MVP is considered complete when:

1. User can:
   - Create a match with two players and a video.
   - Complete Step 1 tagging for at least one game.
   - Optionally review/adjust Step 1 contacts.
   - Complete Step 2 shot tagging for all scoring rallies.
   - View a basic stats screen per player.

2. Data is persisted locally and can be reloaded to:
   - Resume Step 2.
   - Revisit stats.

3. All logic and enums are consistent with the **Tagger 2-Step User Flow & Data Schema (Revised)** and **DataSchema.md** documents.

