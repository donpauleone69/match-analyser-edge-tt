# TT Rally Tagger - Screen Inventory

## Overview

This document lists all screens in the MVP application with their purposes and core elements.

> **Updated:** v0.8.0 — Unified two-part workflow (Match Framework + Rally Detail)

---

## Screen List

| # | Screen Name | File | Purpose | Section |
|---|-------------|------|---------|---------|
| 01 | Home Dashboard | `01_home_dashboard.md` | Entry point; quick access to recent matches | Dashboard |
| 02 | Match Setup | `02_match_setup.md` | Configure players, date, video source | Match Creation |
| 03 | Game Score Entry | `03_game_score_entry.md` | Enter scores for games without video | Match Creation |
| 04 | Part 1: Match Framework | `04_part1_match_framework.md` | Mark contacts and rally boundaries | Rally Tagging |
| 05 | Part 2: Rally Detail | `05_part2_rally_detail.md` | Review timestamps + shot questions | Shot Tagging |
| 06 | Match Stats | `06_match_stats.md` | Show stats for a single match | Analytics |
| 07 | Player Stats | `07_player_stats.md` | Aggregate stats across matches | Analytics |
| 08 | Match History | `08_match_history.md` | Browse all matches | Management |
| 09 | Players List | `09_players_list.md` | Manage player records | Management |
| 10 | Player Detail | `10_player_detail.md` | View/edit a single player | Management |
| 11 | Settings | `11_settings.md` | App preferences and defaults | Settings |
| 12 | Match Details Modal | `12_match_details_modal.md` | Pre-tagging: first serve, starting scores | Modal |
| 13 | Match Completion Modal | `13_match_completion_modal.md` | Post-tagging: result, final scores | Modal |
| 14 | Shot Question Modal | `14_shot_question_modal.md` | Inline shot annotation (Essential/Full) | Modal |
| 15 | End of Point Modal | `15_end_of_point_modal.md` | Rally completion, forced/unforced | Modal |
| 16 | Spin Grid Component | `16_spin_grid_component.md` | 3×3 serve spin selector | Component |
| 17 | Speed Controls Panel | `17_speed_controls_panel.md` | Tagging/FF/Loop speed presets | Component |

---

## User Flow (v0.8.0)

```
Home Dashboard
    │
    ├── New Match → Match Setup
    │                   │
    │                   ├── [Has Video] → Match Details Modal
    │                   │                        │
    │                   │                        └── Part 1: Match Framework
    │                   │                                │
    │                   │                                └── Match Completion Modal
    │                   │                                        │
    │                   │                                        └── Part 2: Rally Detail
    │                   │                                                │
    │                   │                                                └── Match Stats
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
- **01 Home Dashboard** - Central hub for all actions

### Match Creation (2 screens)
- **02 Match Setup** - Player selection, match config, video source
- **03 Game Score Entry** - Manual score entry for partial/no video

### Rally Tagging — Part 1 (1 screen)
- **04 Part 1: Match Framework** - Real-time contact + rally boundary capture

### Shot Tagging — Part 2 (1 screen)
- **05 Part 2: Rally Detail** - Sequential per-rally review + shot annotation

### Analytics (2 screens)
- **06 Match Stats** - Single match analysis
- **07 Player Stats** - Aggregate player performance

### Management (3 screens)
- **08 Match History** - Browse/filter matches
- **09 Players List** - Player directory
- **10 Player Detail** - Edit player info

### Settings (1 screen)
- **11 Settings** - App preferences, sync, account

### Modals (4 items)
- **12 Match Details Modal** - Pre-tagging setup (first serve, starting scores)
- **13 Match Completion Modal** - Post-tagging (result, final scores, coverage)
- **14 Shot Question Modal** - Inline shot annotation (Essential/Full modes)
- **15 End of Point Modal** - Rally completion (forced/unforced, luck)

### Components (2 items)
- **16 Spin Grid Component** - 3×3 serve spin selector
- **17 Speed Controls Panel** - Playback speed presets

---

## Key Layout: Unified Tagging Screen

Both Part 1 and Part 2 share the same screen layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Back | Title | Progress | Action Button                │
├──────────────────┬──────────────────────────┬───────────────────┤
│                  │                          │                   │
│   Match Panel    │      Video Player        │  Speed Controls   │
│   (Left 280px)   │      (Centre flex)       │  (Right 240px)    │
│                  │                          │                   │
│   - Match Details│      + Status Display    │  - Tagging Speed  │
│   - Rally 1      │      + Keyboard Hints    │  - FF Speed       │
│   - Rally 2      │                          │  - Loop Speed     │
│   - Rally 3      │      [Shot Questions     │  - Preview Buffer │
│   - ...          │       appear inline]     │  - Tagging Mode   │
│   - Match Result │                          │                   │
│                  │                          │                   │
└──────────────────┴──────────────────────────┴───────────────────┘
```

---

## Design System Prompts

| # | File | Purpose |
|---|------|---------|
| DS-01 | `DS_01_core_components.md` | Complete UI component library |
| DS-02 | `DS_02_app_shell_layout.md` | Application shell, sidebar, header |
| DS-03 | `DS_03_tokens_reference.md` | Color tokens, typography, spacing |
| DS-04 | `DS_04_video_tagging_components.md` | Video player, Match Panel, tagging controls |

Full design system specification: `../DesignSystem.md`

---

## Keyboard Shortcuts Summary

### Part 1: Match Framework
| Key | Action |
|-----|--------|
| Space | Mark contact (starts rally if none open) |
| → (Right Arrow) | End rally (scoring) / Increase FF speed |
| ← (Left Arrow) | Decrease FF speed |
| E | Mark end of set (only when no open rally) |
| K | Play/Pause video |
| Ctrl+Z | Undo last action |

### Part 2: Rally Detail
| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate rally tree |
| ← / → | Edit value (timestamp nudge, server toggle, winner select) |
| Space | Play/Pause preview loop |
| H | Toggle highlight for current rally |
| Delete | Delete current shot |
| Shift+Delete | Delete entire rally |
| 1-9 | Select option in question grid |
| F / B | Forehand / Backhand |
| G / A / W | Good / Average / Weak |
| N / L / D | In Net / Missed Long / Missed Wide |

---

## Total: 17 screens/modals/components + 4 design system prompts

