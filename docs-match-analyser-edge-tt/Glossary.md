# Edge TT Match Analyser — Glossary

> **Project:** Edge TT Match Analyser  
> **Version:** 0.9.0  
> **Last Updated:** 2025-12-01  
> **Status:** Source of Truth

This glossary defines terms used throughout the Edge TT Match Analyser project. Terms are organized alphabetically within categories.

**Note:** This is a separate project from "Edge TT" (the club session management app). They share domain concepts but are independent codebases.

---

## Table Tennis Domain Terms

### Shot
A single ball strike by a player during a rally. In the tagging workflow, shots are marked at the moment of shot preparation (backswing), not the exact moment of ball shot.

### Deuce
A game state where both players have reached 10 points (10-10 or higher). During deuce, players alternate serves every point instead of every two points.

### End of Point
The moment when a rally concludes and a point is awarded. Can result from a winner shot, forced error, unforced error, service fault, or receive error.

### Essential Mode
A simplified tagging mode that captures 4 questions per shot (Type/Wing, Spin/Type, Landing Zone, Quality). Designed for faster workflow with less detail than Full Mode.

### Fault
A serve that fails to land legally in play. Results in a point for the receiver. See also: Service Fault.

### First Server
The player who serves first in a game. Determines the serve rotation pattern for all subsequent points in that game.

### Forced Error
An error made by a player under pressure from a difficult shot by the opponent. The opponent's shot quality contributed to the mistake.

### Full Mode
A detailed tagging mode that captures 5+ questions per shot, including position sector, full shot type list, and diagnostic questions. Provides more data for analysis.

### Set
A single game within a match, typically played to 11 points (win by 2). A match consists of multiple sets (best of 3, 5, or 7).

### Landing Type
Where the ball landed after a shot: `inPlay`, `net`, `offLong`, or `wide`. Derived from shot quality for error shots.

### Landing Zone
A 3×3 grid representing where the ball landed on the opponent's side of the table. Used for placement analysis.

### Let
A rally that is replayed without scoring, typically due to a serve hitting the net and landing in, or external interference.

### Lob
A high defensive shot, typically hit from far back, intended to buy time and reset the rally.

### Loop
An aggressive topspin shot, the primary attacking stroke in modern table tennis.

### Match
A complete competitive encounter between two players, consisting of multiple sets (typically best of 3, 5, or 7).

### Match Framework
Part 1 of the tagging workflow. The user marks all shots and rally boundaries in a single pass through the video, creating the structural skeleton of the match.

### Point End Type
How a rally concluded: `winnerShot`, `forcedError`, `unforcedError`, `serviceFault`, `receiveError`, or `let`.

### Position Sector
A 3×3 grid representing where the player was standing when they hit the shot. Used in Full Mode only.

### Push
A controlled backspin shot, typically used to keep the ball low and prevent the opponent from attacking.

### Rally
A sequence of shots between the serve and the end of the point. Includes all shots from serve to point conclusion.

### Rally Detail
Part 2 of the tagging workflow. The user reviews timestamps and answers shot questions for each rally sequentially.

### Receive / Return of Serve
The second shot in a rally — the receiver's response to the serve.

### Serve
The first shot of a rally, initiating play. Must be tossed at least 16cm and struck behind the end line.

### Serve Spin
The rotation applied to a serve, represented as a 3×3 grid based on ball shot point (topspin family at top, backspin family at bottom, sidespin on sides).

### Serve Type
The technique used to execute a serve: `pendulum`, `reversePendulum`, `tomahawk`, `backhand`, `hook`, `lollipop`, or `other`.

### Service Fault
A serve that fails (goes into net, off table, or wide). Automatically results in a point for the receiver.

### Shot
A single stroke by a player. In this app, "shot" and "shot" are often used interchangeably.

### Shot Quality
Assessment of how well a shot was executed: `good`, `average`, `weak`, or error types (`inNet`, `missedLong`, `missedWide`).

### Shot Type
The technique used to execute a shot. Essential Mode uses 9 types; Full Mode uses 14 types.

### Smash
A powerful flat or topspin shot, typically hit against a high ball, intended to end the rally.

### Unforced Error
An error made without significant pressure from the opponent. A mistake the player "gave away."

### Wing
Which side of the body the shot was played from: Forehand (FH) or Backhand (BH).

### Winner Shot
A shot that the opponent cannot return, resulting in a point for the hitter.

---

## Application Terms

### Block (UI)
A small, reusable UI component bound to a feature. Presentational only — props in, JSX out. Example: `RallyPodBlock.tsx`.

### Composer
A route-level React component that orchestrates a feature's UI. Accesses stores, calls derive hooks, and composes Sections. Example: `TaggingScreenComposer.tsx`.

### Constrained Playback
Video playback mode where the video only plays within defined time boundaries (e.g., a single shot's duration) and optionally loops.

### Shot Tagger
The original name for Part 1 of the tagging workflow. Now called "Match Framework."

### Derive Hook
A React hook that combines store data with rules to produce UI-ready view models. Named `useDerive<Thing>()`.

### Fast Forward Mode
During Part 1 tagging, the mode between rallies where video plays at increased speed (1x–5x) until the user marks a new serve.

### Feature
A domain area of the application with its own folder under `features/`. Contains composers, sections, blocks, derive hooks, and models.

### Highlight
A rally marked as notable by the user (press H). Used for filtering during export and future highlight compilations.

### Match Panel
The left sidebar in the tagging screens showing match details, rally tree, and match result.

### Misclick Auto-Pruning
Automatic deletion of shots that follow an error-marked shot, with undo capability. Prevents invalid data from shots that couldn't have happened.

### Preview Buffer
Extra time (default 0.2s) shown past the next timestamp when looping a shot preview. Display-only; doesn't alter stored timestamps.

### Rules (Layer)
The `rules/` folder containing pure domain logic functions. No React, no IO, no side effects.

### Section
A major part of a page, defining layout for a zone. Receives view models from Composers. Example: `MatchPanelSection.tsx`.

### Speed Controls
The right sidebar panel for controlling playback speeds (tagging speed, fast forward speed, loop speed, preview buffer).

### Spin Grid
A 3×3 grid UI component for selecting serve spin based on ball shot point. Numpad 1–9 keyboard mapping.

### Store
A Zustand state container that holds application state and actions. Persisted to localStorage.

### Tagging Mode
The level of detail captured during shot annotation: Essential (4 questions) or Full (5+ questions).

### Tagging Speed
The video playback speed during active shot marking. Default 0.25x. Options: 0.125x, 0.25x, 0.5x, 0.75x, 1x.

### Timeline
A visual representation of shots and rally boundaries along the video duration.

### View Model
A TypeScript type representing the shape of data the UI needs to render. Created by derive hooks from store data + rules.

---

## Architecture Terms

### `calculate*`
Naming convention for pure functions in `rules/` that compute a value. Example: `calculateServer()`.

### `dataStorage/`
Future folder for Supabase data access functions. Not yet implemented.

### `derive*`
Naming convention for functions/hooks that infer values from other data. Used in both `rules/` and `features/*/derive/`.

### `features/`
Folder containing feature-specific UI and orchestration code, organized by domain feature.

### `helpers/`
Folder containing pure utility functions with no domain semantics.

### `pages/`
Folder containing route components that import and render Composers.

### `rules/`
Folder containing pure domain logic — calculations, derivations, validations. No React, no IO.

### `stores/`
Folder containing Zustand stores for state management.

### `ui-mine/`
Folder containing the shared UI kit — wrapped components that features import. Features never import from `components/ui/` or `lucide-react` directly.

### `validate*`
Naming convention for pure functions in `rules/` that check validity. Example: `validateShot()`.

---

## Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| BH | Backhand |
| FF | Fast Forward |
| FH | Forehand |
| MVP | Minimum Viable Product |
| RoS | Return of Serve |
| SPA | Single Page Application |
| TT | Table Tennis |
| UI | User Interface |
| UX | User Experience |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `Architecture.md` | System architecture and folder structure |
| `DataSchema.md` | Database schema and field definitions |
| `specs/MVP_flowchange_spec.md` | Current feature specification |
| `specs/specAddendumMVP.md` | Changelog and decisions |

---

*This document is the source of truth for Edge TT Match Analyser terminology.*

