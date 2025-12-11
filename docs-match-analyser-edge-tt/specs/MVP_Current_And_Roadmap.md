# MVP Current State & Roadmap

> **Version:** 3.0  
> **Last Updated:** 2025-12-11  
> **Status:** Living Document

This document consolidates:
- Current implementation status (v3.0)
- In-progress features
- Future roadmap

**Supersedes:** MVP_flowchange_spec.md, MVP_flowchange_tasks.md, and all Phase1_Setup_Flow_*.md files

---

## Current State (v3.0) - ✅ IMPLEMENTED

### Core Workflow - Three-Phase Tagging

**Phase 1: Match Framework (Timestamp Tagging)**
- ✅ Mark shot contact times with button clicks
- ✅ System creates shots and rallies with timestamps
- ✅ Auto-derives server, receiver, rally structure
- ✅ Multi-video support (multiple video segments per match)
- ✅ Set setup flow (starting score, first server)
- ✅ Pause/resume capability

**Phase 2: Rally Detail (Question Answering)**
- ✅ Review each shot sequentially
- ✅ Answer questions: intent, quality, shot type, direction, spin
- ✅ System updates shot attributes
- ✅ Constrained video playback (loops around shot)
- ✅ Progress tracking

**Phase 3: Inference & Analytics**
- ✅ Inference engine for shot-level data
- ✅ Analytics cards (serve, receive, third ball, rally stats, error profile)
- ✅ Filter by player, match, date range
- ✅ Insights and coaching recommendations

### Data Management

**Entities (9 total):**
- ✅ Players, Clubs, Tournaments
- ✅ Matches, MatchVideos, Sets
- ✅ Rallies, Shots, ShotInferences

**Storage:**
- ✅ Local-first (IndexedDB via Dexie.js)
- ✅ Slug-based IDs (human-readable)
- ✅ Zustand for UI state
- ✅ Persistent storage with session recovery

**Data Flow:**
- ✅ Top-down result entry (pre-enter match/set scores)
- ✅ Bottom-up verification (tagging validates scores)
- ✅ Tagged data = source of truth

### UI Features

**Match Management:**
- ✅ Create/edit matches
- ✅ Match result entry modal
- ✅ Set selection for tagging
- ✅ Match list with scores

**Player/Tournament Management:**
- ✅ Player CRUD with club assignment
- ✅ Tournament CRUD with context
- ✅ Club management

**Video Features:**
- ✅ Local video file handling (blob URLs)
- ✅ Multiple playback speeds (0.25x - 5x)
- ✅ Keyboard shortcuts
- ✅ Constrained playback (Phase 2)
- ✅ FF mode toggle (Phase 1)

**Analytics:**
- ✅ 5 analytics cards (Serve, Receive, Third Ball, Rally Stats, Error Profile)
- ✅ Filter bar (player, match, date)
- ✅ Insights generation
- ✅ Status indicators (good/average/poor)

### Technical Architecture

**Tech Stack:**
- ✅ React 19 + Vite 7 + TypeScript 5.9
- ✅ React Router 7 + Zustand 5 + Dexie 4
- ✅ Tailwind 4 + Radix UI + Lucide Icons
- ✅ HTML5 Video API + FFmpeg.wasm

**Patterns:**
- ✅ Feature-first folder structure
- ✅ Rules layer (derive/calculate/infer/validate/analytics)
- ✅ Entity pattern (types → db → store)
- ✅ Composers → Sections → Blocks
- ✅ Pure domain logic separated from UI

---

## Critical Fixes & Improvements 🔧

### Video Player (Essential - High Priority)
- ⚠️ **Current Issue:** Janky performance during tagging phases
- 🔧 Multiple quick fixes needed for smooth tagging experience
- 🎯 **Goal:** Fast, responsive video controls for efficient tagging

### Data Validation & Consistency
- ⚠️ **Current Issue:** Inconsistencies between match-level data and tagging data
- 🔧 Validate and fix data mismatches
- 🎯 **Goal:** Single source of truth with consistent data across all levels

### UI/UX Polish
- ⚠️ **Current Issue:** Disconnected and disjointed styling
- 🔧 Consistent theming and visual cohesion needed
- 🎯 **Goal:** Professional, polished interface with unified design language

---

## In Progress 🚧

### Flexible Tagging Architecture (Paradigm Shift)

**Current:** Prescribed workflow (Phase 1 → Phase 2 → Phase 3)  
**New Model:** Modular, user-driven tagging

**Phase 1 (Compulsory):**
- Match setup and framework tagging
- Creates baseline data for all analytics

**Optional Tagging Modules (User Choice):**
- **Basic Set** — Intent, quality, shot type (sufficient for inference engine)
- **Footwork Module** — Player positions and movement
- **Distance Module** — Distance from table at contact
- **Timing Module** — Early/mid/late contact timing
- **Advanced Attributes** — Spin, direction, pressure, etc.

**Benefits:**
- Users tag what they want to study
- Data richness grows organically
- More flexible analytics as dataset expands
- No forced workflow, better UX

### Analytics Expansion
- 🚧 Additional analytics cards (6+ more planned)
- 🚧 Advanced filtering options
- 🚧 Match comparison views

### Inference Engine Optimization
- 🚧 Improvements to shot-level inference
- 🚧 Confidence scoring
- 🚧 Re-run inference capability

---

## Roadmap 📋

### Q1 2026: Authentication & User Context

**Goal:** User accounts with personalized experience

**Features:**
- Login and authentication layer
- Current user context (system knows "who you are")
- Player profile linked to user account
- Analytics defaults to current user as "player of interest"
- Role-based access (all data centrally shared, no strict limits)

**Tech:** Supabase Auth (integrates with migration below)

### Q1 2026: Supabase Migration

**Goal:** Cloud storage with offline support

**Changes:**
- Add TanStack Query for server state
- Migrate from Dexie (primary) to Dexie (cache)
- Convert slug IDs to UUID primary keys (keep slugs as indexed fields)
- Implement sync strategy (optimistic updates, conflict resolution)
- Local tagging remains local, consistent saving to cloud

**Status:** Much of the upfront work already done

**Migration Guide:** See DataSchema.md Section 8

### Q1 2026: Vercel Deployment

**Goal:** Production deployment for public use

**Requirements:**
- Supabase migration complete
- Authentication implemented
- UI/UX polish complete
- Video player optimizations done
- Data validation fixes applied

**Result:** App available to anyone who wants to use it

### Q2 2026: ML/AI Shot Classification

**Goal:** Automated shot tagging

**Features:**
- Shot type inference (FH loop, BH flick, etc.)
- Spin detection from video
- Player position tracking
- Pressure level assessment
- Confidence scoring

**Training:**
- Use manually tagged data as training set
- Fine-tune vision transformer model
- Integrate MediaPipe or OpenPose
- Ball contact audio detection (Whisper)

### Q3 2026: Video Export

**Goal:** Export tagged rally clips

**Features:**
- Individual rally export
- Highlight reel generation
- Custom clip ranges
- Add overlays (scores, stats)
- Batch export

**Tech:** FFmpeg.wasm (already installed)

### Q4 2026: Mobile App

**Goal:** Tag matches on mobile devices

**Features:**
- iOS and Android apps
- Camera integration
- Offline tagging
- Sync with web app
- Simplified UI for mobile

**Tech:** React Native or PWA

### Future: Advanced Features

**Analytics:**
- Player comparison reports
- Match trends over time
- Opponent analysis
- Practice session tracking

**Collaboration:**
- Share matches with coaches
- Team analytics
- Tournament statistics
- Public match library

**AI Coach:**
- Personalized training recommendations
- Weakness identification
- Drill suggestions
- Progress tracking

---

## Feature Status Reference

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Three-phase tagging | ✅ Live | v3.0 | Complete |
| Multi-video support | ✅ Live | v3.0 | Complete |
| Match/player/tournament management | ✅ Live | v3.0 | Complete |
| Analytics cards (5) | ✅ Live | v3.0 | Serve, Receive, Third Ball, Rally, Error |
| Local-first storage | ✅ Live | v3.0 | IndexedDB + Zustand |
| Data audit tools | 🚧 Beta | v3.0 | Basic viewer available |
| Additional analytics cards | 🚧 In Progress | v3.1 | 6+ more planned |
| Supabase migration | 📋 Planned | v4.0 | Q1 2026 |
| ML/AI shot classification | 📋 Planned | v5.0 | Q2 2026 |
| Video export | 📋 Planned | v3.5 | Q3 2026 |
| Mobile app | 📋 Planned | v4.5 | Q4 2026 |

---

## Documentation

**Core Docs:**
- **Architecture.md** — System architecture (v3.0)
- **DataSchema.md** — Entity definitions (v3.0)
- **Glossary.md** — Domain terminology
- **DesignSystem.md** — UI design guidelines
- **specAddendumMVP.md** — Official changelog

**Analytics Docs:**
- **analytics/analytics_card_implementation_guide.md** — Card patterns
- **analytics/context_prompt.md** — Analytics context
- **analytics/phase1dataavailable.md** — Phase 1 data reference

**Development:**
- **.cursorrules** — Development conventions
- **Architecture.md Section 7** — Naming conventions
- **Architecture.md Section 8** — Import rules

---

## Change History

### v3.0 - 2025-12-11
- Three-phase tagging workflow complete
- Analytics feature with 5 cards
- Multi-video support
- Slug-based IDs
- Rules layer reorganization
- Data audit tools

### v2.0 - 2025-12-05
- Complete database layer (Dexie.js)
- Prototype V2 integrated
- Management UIs complete

### v1.0 - 2025-11-01
- Initial MVP implementation

---

*This document will be updated as features are completed or roadmap changes.*  
*See specAddendumMVP.md for detailed change history.*

