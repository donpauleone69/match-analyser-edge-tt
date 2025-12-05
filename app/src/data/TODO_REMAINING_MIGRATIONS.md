# Remaining Migration Tasks

## Files Still Using Old Imports

These files still import from `@/database/` or `@/stores/` and need updating:

### Tournament Management
- `app/src/features/tournament-management/composers/TournamentManagementComposer.tsx`
- `app/src/features/tournament-management/sections/TournamentFormSection.tsx`
- `app/src/features/tournament-management/sections/TournamentListSection.tsx`

### Player Management
- `app/src/features/player-management/composers/PlayerManagementComposer.tsx`
- `app/src/features/player-management/sections/PlayerFormSection.tsx`
- `app/src/features/player-management/sections/PlayerListSection.tsx`

### Match Management
- `app/src/features/match-management/sections/MatchListSection.tsx`
- `app/src/features/match-management/sections/SetSelectionModal.tsx`

### Data Viewer
- `app/src/features/data-viewer/composers/DataViewerComposer.tsx`
- `app/src/features/data-viewer/sections/RalliesDataSection.tsx`
- `app/src/features/data-viewer/sections/ShotsDataSection.tsx`
- `app/src/features/data-viewer/sections/SetsDataSection.tsx`
- `app/src/features/data-viewer/sections/ExportControlsSection.tsx`
- `app/src/features/data-viewer/sections/MatchMetadataSection.tsx`

### Tagging UI Prototype V2
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`

## Migration Pattern

For each file:

1. **Replace store imports:**
```typescript
// OLD
import { usePlayerStore } from '@/stores/playerStore'
import { useTournamentStore } from '@/stores/tournamentStore'

// NEW
import { usePlayerStore, useTournamentStore } from '@/data'
```

2. **Replace type imports:**
```typescript
// OLD
import type { DBPlayer, NewPlayer } from '@/database/types'

// NEW
import type { DBPlayer, NewPlayer } from '@/data'
```

3. **Replace service imports:**
```typescript
// OLD
import { getAllPlayers, createPlayer } from '@/database/services/playerService'

// NEW - Use stores instead
import { usePlayerStore } from '@/data'
// OR for entities without stores:
import { setDb, rallyDb, shotDb } from '@/data'
```

4. **Update store method calls:**
```typescript
// OLD
const { loadPlayers, createPlayer } = usePlayerStore()

// NEW
const { load, create } = usePlayerStore()
```

## Quick Reference

### Entities with Stores (Use These)
- `useClubStore` → clubs
- `useTournamentStore` → tournaments
- `usePlayerStore` → players
- `useMatchStore` → matches

### Entities without Stores (Use DB)
- `setDb` → sets
- `rallyDb` → rallies
- `shotDb` → shots

### All Types Available From
```typescript
import type { 
  DBClub, NewClub,
  DBTournament, NewTournament,
  DBPlayer, NewPlayer,
  DBMatch, NewMatch,
  DBSet, NewSet,
  DBRally, NewRally,
  DBShot, NewShot,
} from '@/data'
```

