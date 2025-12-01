# Technical Stack

This document defines the agreed technical stack for the TT Rally Tagger application.

---

## Frontend

### Framework
- **React** (Single Page Application)
- **TypeScript** – type safety
- **Vite** – fast local development and builds

### Routing
- **React Router v7**

### State & Data Layer
- **TanStack Query** – server state management with Supabase:
  - Data fetching/caching/mutations from Supabase
  - Background refetching and stale-while-revalidate
  - Optimistic updates for responsive UI
  - Query invalidation on related data changes
- **Zustand** – lightweight global state for UI:
  - Current view/selection state
  - Modal and panel states
  - User preferences and session state
  - No boilerplate, minimal bundle size
- **Dexie.js** (IndexedDB wrapper) for:
  - Local-first data storage
  - Offline caching of shots, rallies, matches
  - Sync queue for background synchronization
  - Local schema mirrors Supabase tables for seamless sync

### Video
- **Hls.js** – HLS streaming support
- **Video.js** – video player UI wrapper
- **Custom Timeline Overlays** for:
  - Rally markers
  - Shot markers
  - Error indicators
  - Auto-trim display after AI clipping

### UI Library
- **TailwindCSS** – utility-first styling
- **Headless UI** – unstyled, accessible components
- **Radix UI** – consistent accessible primitives
- **Lucide Icons** – icon library

---

## Backend

### Primary Backend & Database
- **Supabase** (Postgres + Row Level Security)
  - Players, matches, games, rallies, contacts, shots
  - Analytics queries
  - User accounts (Auth)

### Edge Functions
- **Supabase Edge Functions** for:
  - Auto video clipping
  - Analytics rollups
  - Heavy data transforms
  - AI pre-processing triggers

### Storage
- **Supabase Storage**
  - Holds rally-level video clips ONLY (not full matches)
  - Used by AI for processing

---

## Sync & Offline Architecture

### Local-First Pattern
- **Supabase ↔ Dexie.js** mirror
- User works fully offline
- Sync triggers on connection restore

### Conflict Resolution
- **Non-critical fields:** last-write-wins
- **Rally data:** match-level locking to prevent conflicts

---

## Analytics Layer

- **Postgres Materialized Views**
  - Indexed on `playerId`, `shotType`, `matchDate`
  - Optimized for:
    - "Last month vs previous month" comparisons
    - Serve return error analysis
    - Pattern querying

---

## AI Layer (Post-MVP)

### Shot Classification Pipeline
Lives outside MVP, but schema hooks included.

**Technologies:**
- Claude + custom fine-tuning
- Vision transformer / pose tracking (MediaPipe or OpenPose)
- Whisper for ball contact audio detection

**Outputs:**
- Shot type predictions
- Quality scores
- Edited rally clips with dead time removed

### Future-Proofing Hooks (Built into MVP Schema)
- Video references
- Training sample flags
- Model confidence fields
- "Auto-tag suggestions" table

---

## Summary Table

| Layer | Technology |
|-------|------------|
| Framework | React + TypeScript + Vite |
| Routing | React Router v7 |
| UI | TailwindCSS + Radix UI + Headless UI |
| Icons | Lucide Icons |
| Server State | TanStack Query |
| UI State | Zustand |
| Local Data | Dexie.js (IndexedDB) |
| Backend | Supabase (Postgres + RLS) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Edge Functions | Supabase Edge Functions |
| Video Player | Video.js + Hls.js |
| AI (Future) | Claude, MediaPipe, Whisper |

