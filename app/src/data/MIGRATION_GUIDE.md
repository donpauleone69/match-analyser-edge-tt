# Data Layer Migration Guide

## Overview

The data layer has been refactored from a split `database/` + `stores/` structure to a unified `data/` folder with entity-based organization.

## Old Structure → New Structure

### Before (Problematic)
```
app/src/
  database/
    db.ts
    types.ts
    services/
      clubService.ts
      playerService.ts
      matchService.ts
      ...
  stores/
    matchManagementStore.ts
    playerStore.ts
    tournamentStore.ts
```

### After (Clean)
```
app/src/
  data/
    db.ts
    index.ts
    entities/
      clubs/
        club.types.ts
        club.db.ts
        club.store.ts
        index.ts
      players/
        player.types.ts
        player.db.ts
        player.store.ts
        index.ts
      ... (similar for all entities)
```

## Import Changes

### Old Imports (❌ Don't use)
```typescript
// OLD - Multiple imports from different places
import { DBPlayer, NewPlayer } from '@/database/types'
import { usePlayerStore } from '@/stores/playerStore'
import { createPlayer, updatePlayer } from '@/database/services/playerService'
```

### New Imports (✅ Use these)
```typescript
// NEW - Single import from data layer
import { DBPlayer, NewPlayer, usePlayerStore } from '@/data'

// For DB operations (entities without stores)
import { setDb, rallyDb, shotDb } from '@/data'
```

## Usage Patterns

### Entities with Stores (Clubs, Tournaments, Players, Matches)

Components use **stores only**, never DB layer directly:

```typescript
import { usePlayerStore } from '@/data'

function MyComponent() {
  const { players, load, create, update, delete: deletePlayer } = usePlayerStore()
  
  useEffect(() => {
    load() // Load from Dexie
  }, [load])
  
  const handleCreate = async (data) => {
    await create(data) // Writes to Dexie + updates cache
    // No need to reload - cache updated automatically
  }
}
```

### Entities without Stores (Sets, Rallies, Shots)

Use DB operations directly:

```typescript
import { setDb, rallyDb, shotDb } from '@/data'

// Destructure what you need
const { create: createSet, getByMatchId } = setDb
const { create: createRally } = rallyDb

async function saveData() {
  const sets = await getByMatchId(matchId)
  const rally = await createRally(rallyData)
}
```

## Architecture Benefits

1. **Co-location**: Everything for an entity in one folder
2. **Clear layers**: `types.ts` → `db.ts` → `store.ts`
3. **Clean imports**: Single source (`@/data`)
4. **Future-proof**: Sync layer slots in easily (`entity.sync.ts`)
5. **Type-safe**: Types exported from entity modules

## Files That Need Updating

If you see these patterns, they need updating:

- ❌ `from '@/database/types'`
- ❌ `from '@/database/services/...'`
- ❌ `from '@/stores/...'`
- ✅ `from '@/data'`

## Store API Changes

All stores now use consistent naming:

| Old | New |
|-----|-----|
| `loadPlayers()` | `load()` |
| `createPlayer()` | `create()` |
| `updatePlayer()` | `update()` |
| `deletePlayer()` | `delete()` |
| `archivePlayer()` | `archive()` |

This allows clean destructuring:
```typescript
const { players, load, create, update, delete: deletePlayer } = usePlayerStore()
```

