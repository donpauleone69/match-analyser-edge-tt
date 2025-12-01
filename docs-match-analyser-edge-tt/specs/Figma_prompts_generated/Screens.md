# TT Rally Tagger - Screen Inventory

## Overview

This document lists all screens in the MVP application with their purposes and core elements.

---

## Screen List

| # | Screen Name | Purpose | Section |
|---|-------------|---------|---------|
| 01 | Home Dashboard | Entry point; quick access to recent matches and actions | Dashboard |
| 02 | Match Setup | Configure players, match structure, video source | Match Creation |
| 03 | Game Score Entry | Enter scores for games without video | Match Creation |
| 04 | Step 1: Contact Tagger | Real-time contact capture while watching video | Rally Tagging |
| 05 | Step 1: Review | Review and adjust contacts before Step 2 | Rally Tagging |
| 06 | Step 2: Shot Detail | Annotate each shot with Q1–Q5 and conditionals | Shot Tagging |
| 07 | Match Stats | Show stats for a single match | Analytics |
| 08 | Player Stats | Aggregate stats across matches for a player | Analytics |
| 09 | Match History | Browse all matches | Management |
| 10 | Players List | Manage player records | Management |
| 11 | Player Detail | View/edit a single player | Management |
| 12 | Settings | App preferences and defaults | Settings |
| 13 | Winner Dialog | Modal for selecting rally winner | Modal |
| 14 | Serve Detail Panel | Conditional serve fields within Step 2 | Component |

---

## User Flow

```
Home Dashboard
    │
    ├── New Match → Match Setup
    │                   │
    │                   ├── [Has Video] → Step 1: Contact Tagger
    │                   │                        │
    │                   │                        └── Step 1: Review
    │                   │                                │
    │                   │                                └── Step 2: Shot Detail
    │                   │                                        │
    │                   │                                        └── Match Stats
    │                   │
    │                   └── [No Video] → Game Score Entry
    │                                          │
    │                                          └── Match Stats
    │
    ├── Recent Match → Match Stats
    │
    ├── Match History → [Select Match] → Match Stats / Resume Tagging
    │
    ├── Players List → Player Detail → Player Stats
    │
    └── Settings
```

---

## Screen Categories

### Dashboard (1 screen)
- **Home Dashboard** - Central hub for all actions

### Match Creation (2 screens)
- **Match Setup** - Player selection, match config, video source
- **Game Score Entry** - Manual score entry for partial/no video

### Rally Tagging - Step 1 (2 screens)
- **Step 1: Contact Tagger** - Real-time timestamp capture
- **Step 1: Review** - Adjust contacts, correct errors

### Shot Tagging - Step 2 (1 screen)
- **Step 2: Shot Detail** - Q1–Q5 annotation per shot

### Analytics (2 screens)
- **Match Stats** - Single match analysis
- **Player Stats** - Aggregate player performance

### Management (3 screens)
- **Match History** - Browse/filter matches
- **Players List** - Player directory
- **Player Detail** - Edit player info

### Settings (1 screen)
- **Settings** - App preferences, sync, account

### Modals & Components (2 items)
- **Winner Dialog** - Rally winner selection modal
- **Serve Detail Panel** - Conditional serve UI

---

## Design System Prompts

| # | File | Purpose |
|---|------|---------|
| DS-01 | `DS_01_core_components.md` | Complete UI component library (buttons, inputs, cards, tables, etc.) |
| DS-02 | `DS_02_app_shell_layout.md` | Application shell, sidebar, header, responsive layouts |
| DS-03 | `DS_03_tokens_reference.md` | Color tokens, typography scale, spacing, radius, shadows |
| DS-04 | `DS_04_video_tagging_components.md` | Video player, timeline, tagging controls, winner dialog |

Full design system specification: `../DesignSystem.md`

---

## Total: 14 screens + 4 design system prompts

