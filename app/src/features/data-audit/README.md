# Phase 1 Audit Feature

## Purpose
Displays all database writes during Phase 1 tagging for a complete match, showing exactly what data is saved to the database and when.

## URL
```
/data-viewer/audit?matchId={matchId}
```

## Structure

```
data-audit/
├── composers/
│   └── Phase1AuditComposer.tsx    # Main page logic (loads data)
├── sections/
│   ├── AuditHeaderSection.tsx     # Sticky header with refresh
│   ├── SchemaReferenceSection.tsx # Prepopulated fields reference
│   ├── SetupPhaseSection.tsx      # Setup data display
│   ├── TaggingPhaseSection.tsx    # Rally-by-rally tagging
│   └── SetAuditSection.tsx        # Complete set audit
├── blocks/
│   ├── DataTableBlock.tsx         # Generic table renderer
│   └── RallyGroupBlock.tsx        # Rally + shots together
├── fieldConfig.ts                 # Field definitions by phase
└── models.ts                      # TypeScript types
```

## Features

### 1. Database Schema Reference
- Collapsible section at the top
- Shows ALL fields NOT modified by Phase 1
- Organized by table (Set, Rally, Shot)
- Documents default values and descriptions

### 2. Match-Level View
- Shows all sets in a match
- Each set displays:
  - Setup Phase (setup fields + stub rallies)
  - Tagging Phase (each tagged rally + shots)

### 3. Clean Data Display
- Only Phase 1 fields shown in data tables
- Prepopulated fields in separate reference
- Color-coded phases (green = setup, blue = tagging)

### 4. Per-Rally Detail
- Rally record with all Phase 1 fields
- Shot records with Phase 1 fields
- Button pressed inference (Net/Long/Forced Error/Win)
- Score progression (before → after)

## Field Categories

### Setup Phase (Green)
- `setup_starting_score_p1/p2`
- `setup_next_server_id`
- `setup_completed_at`

### Tagging Phase (Blue)
- Rally fields: timestamps, participants, scores, end types
- Shot fields: timestamps, player, shot data, rally end markers
- Set updates: progress tracking

### Prepopulated (Not Modified)
- Set: 18 fields (IDs, video contexts, Phase 2/3 fields)
- Rally: 2 fields (id, video_id)
- Shot: 18 fields (id, video_id, all Phase 2/3 fields)

## Usage

### Navigate from Data Viewer
```typescript
// Add button in DataViewer with selected match
<button onClick={() => navigate(`/data-viewer/audit?matchId=${matchId}`)}>
  View Phase 1 Audit
</button>
```

### Direct URL
```
http://localhost:5173/data-viewer/audit?matchId=match-abc123
```

## Data Flow

1. Load match record
2. Load player names from player store
3. Load all sets for match
4. For each set:
   - Load all rallies (sorted by rally_index)
   - Load all shots (sorted by rally, then shot_index)
5. Display in chronological order

## No Changes to Existing Code
- Only adds new route in `App.tsx`
- No modifications to Phase1TimestampComposer
- No modifications to database entities
- Completely self-contained feature

