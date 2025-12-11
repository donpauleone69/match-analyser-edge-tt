# Analytics Card Implementation Guide

**For Claude agents building analytics cards with no prior context.**

## Architecture Overview

```
Composer (filter state) 
  → Section (FilterBar + card grid) 
    → Card Blocks (use BasicInsightCardTemplate) 
      → Derive Hooks (query DB, call rules) 
        → Rules (pure calculations)
```

**Key Pattern: Hybrid Data Access**
- ✅ Stores for reference data (players, match lists)
- ✅ Direct DB queries for analytics (shotDb.*, rallyDb.*)
- ✅ Pure functions in `rules/analytics` (NO React)
- ❌ Don't load all data into stores
- ❌ Don't query DB in card components

## Critical Import Rules

```typescript
// Card blocks
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { Activity } from 'lucide-react'

// Derive hooks
import { useState, useEffect } from 'react'
import { shotDb, rallyDb } from '@/data'
import { calculateYourMetric } from '@/rules/analytics'

// ❌ NEVER @/components/ui/* (use @/ui-mine/* instead)
```

## Quick Templates

### 1. Card Block (features/analytics/blocks/YourCard.tsx)

```typescript
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { Activity } from 'lucide-react'

export function YourMetricCard({ filter }: { filter: AnalyticsFilterModel }) {
  // TODO: const { data, loading, error } = useDeriveYourMetric(filter)
  
  return (
    <BasicInsightCardTemplate
      title="Your Metric"
      subtitle="What question does this card answer?"
      icon={<Activity className="h-5 w-5" />}
      primaryMetric={{ 
        value: '73%', 
        label: 'Win Rate', // Not displayed, kept for internal use
        description: 'Points Won', // Title Case, short (2-4 words), no "your"
        status: 'good' 
      }}
      secondaryMetrics={[
        { 
          value: '45%', 
          label: 'Successful attacks', // Not displayed
          description: 'of your attacks win the point or force errors' // Lowercase start, directed at player
        },
        { 
          value: '12%', 
          label: 'Unforced errors', // Not displayed
          description: 'of points are lost to unforced errors' // Natural sentence, can be longer
        },
        { 
          value: '8.2', 
          label: 'Rally length', // Not displayed
          description: 'shots per rally on average' // Unit-based metrics work too
        },
      ]}
      chart={<div className="text-neutral-500 text-sm">Chart placeholder</div>}
      insight="Key pattern or trend in one sentence."
      coaching="Action advice: Practice X to improve Y"
      footer="Based on 25 matches"
    />
  )
}
```

**Card Interaction:**
- Cards are **expandable/collapsible** by clicking anywhere on the card
- **Collapsed State**: Shows primary metric + insight text (compact)
- **Expanded State**: Reveals secondary metrics, chart, and coaching recommendation (no divider)
- Visual feedback: Chevron icon (down when collapsed, up when expanded) and border color change on hover/expand

**Metric Layout Pattern (Traditional Dashboard Style):**

- **Primary Metric**: Single row - **description LEFT, percentage RIGHT**
  - No label/header displayed (label prop kept for internal use only)
  - Description is text-lg on LEFT, stat is 5xl font on RIGHT (color-coded by status)
  - Layout: `flex items-center justify-between` for traditional left-to-right reading
  - Example: `Service Points Won                52%`
  
- **Secondary Metrics**: Single column (one per row) - **percentage LEFT, description RIGHT**
  - No label/header displayed
  - Percentage is 2xl font on LEFT (fixed-width w-16, centered), description text-sm on RIGHT
  - Only visible when card is expanded
  - Typically 3 metrics (can be 2-4 as needed)
  - Fixed width for percentage ensures all descriptions align vertically
  - Example: `8%   of your serves are faults`

**Text Writing Rules:**

**Primary Metric Descriptions (Title Case, Short Labels):**
- ✅ Title Case (capitalize all major words)
- ✅ Keep it short and clear (2-4 words max)
- ✅ Direct and objective (no "your" prefix)
- ✅ Examples:
  - "Service Points Won"
  - "Receive Points Won"
  - "3rd Ball Won"
  - "Rally Length"
  - "Attack Success Rate"
- ❌ Bad: "service points won" (lowercase)
- ❌ Bad: "You win service points" (too verbose, has "you")
- ❌ Bad: "your 3rd ball attacks win immediately" (too long, has "your")

**Secondary Metric Descriptions (Natural Sentences):**
- ✅ Start lowercase (it follows the percentage)
- ✅ Present tense, directed at player (use "your"/"you")
- ✅ Natural, conversational flow
- ✅ Can be 1-2 lines for clarity
- ✅ Examples:
  - "of your serves are faults"
  - "of your 3rd ball attacks win the point immediately"
  - "of your rallies as the receiver survive past the opening (5+ shots)"
  - "of receive points end with you being forced into an error"
- ❌ Bad: "Service Faults" (title case, too short)
- ❌ Bad: "Your serves that are faults: 8%" (repeats percentage)
- ❌ Bad: "Of your serves are faults" (capital O looks odd after percentage)

**Key Rule:** Percentage appears ONCE per metric (never in the description text)

**Quick Comparison Table:**

| Metric Type | Case Style | Length | Player Reference | Example |
|-------------|------------|--------|------------------|---------|
| **Primary** | Title Case | 2-4 words | NO "your"/"you" | "Service Points Won" |
| **Secondary** | lowercase start | 1-2 lines | YES "your"/"you" | "of your serves are faults" |

**Primary Metric Writing Pattern:**
```
✅ Good Primary Descriptions:
- "Service Points Won"
- "Receive Points Won"  
- "3rd Ball Won"
- "Attack Success"
- "Rally Length"

❌ Bad Primary Descriptions:
- "service points won" (not title case)
- "Your Service Points" (has "your")
- "Points You Win On Serve" (too long, has "you")
- "you win 52% of service points" (way too long, repeats %)
```

**Secondary Metric Writing Pattern:**
```
✅ Good Secondary Descriptions:
- "of your serves are faults"
- "of your 3rd ball attacks win the point immediately"
- "of receive points end with you being forced into an error"
- "of your rallies as the receiver survive past the opening (5+ shots)"

❌ Bad Secondary Descriptions:
- "Of your serves are faults" (capital O after percentage)
- "Service Faults" (too short, title case, no context)
- "Your serves: 8% are faults" (repeats percentage)
- "serves that go in the net" (no player reference "your")
```

### 2. Derive Hook (features/analytics/derive/useDeriveYour.ts)

```typescript
import { useState, useEffect } from 'react'
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { shotDb } from '@/data'
import { calculateYourMetric } from '@/rules/analytics'

export function useDeriveYourMetric(filter: AnalyticsFilterModel) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetch() {
      try {
        if (!filter.playerId) throw new Error('Player required')
        const matchIds = await getMatchIds(filter) // Implement based on scopeType
        const shots = await shotDb.getByPlayerIdAcrossMatches(filter.playerId, matchIds)
        setData(calculateYourMetric(shots))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filter])
  
  return { data, loading, error }
}
```

### 3. Calculation (rules/analytics/calculateYour.ts)

```typescript
import type { DBShot } from '@/data'

export function calculateYourMetric(shots: DBShot[]) {
  if (!shots.length) return { primaryValue: 'N/A', metric1: 0, metric2: 0 }
  
  const successful = shots.filter(s => s.rally_end_role === 'winner').length
  const errors = shots.filter(s => s.rally_end_role.includes('error')).length
  
  return {
    primaryValue: `${((successful / shots.length) * 100).toFixed(0)}%`,
    metric1: successful,
    metric2: errors
  }
}
```

## Common Patterns

```typescript
// Status by percentage
const status = rate >= 70 ? 'good' : rate >= 50 ? 'average' : 'poor'

// Empty state
if (!data?.length) return <BasicInsightCardTemplate title="..." primaryMetric={{ value: 'N/A', label: 'No data' }} />

// Filter scope footer
const scope = filter.scopeType === 'recent_n_matches' ? `Last ${filter.recentMatchCount} matches` : '...'
```

## Anti-Patterns

```typescript
// ❌ Don't query DB in components
useEffect(() => { shotDb.getAll().then(setShots) }, [])

// ❌ Don't calculate in components  
const winRate = shots.filter(s => s.winner).length / shots.length

// ❌ Don't use @/components/ui
import { Button } from '@/components/ui/Button'

// ✅ Do use derive hooks + rules
const { data } = useDeriveYourMetric(filter) // hooks query DB, call rules

// ✅ Do use @/ui-mine
import { Button } from '@/ui-mine/Button'
```

## Wiring Steps

1. Create card in `features/analytics/blocks/YourCard.tsx`
2. Export from `features/analytics/blocks/index.ts`
3. Import and add to grid in `features/analytics/sections/AnalyticsOverviewSection.tsx`
4. Create derive hook in `features/analytics/derive/` (optional)
5. Add calculation in `rules/analytics/calculateYour.ts`

## Visual Example

**Collapsed Card:**
```
┌─────────────────────────────────────────────┐
│ 📊 Serve Performance           [v]          │
│    How effective is your serve?             │
├─────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐│
│ │ Service Points Won              52%      ││
│ └──────────────────────────────────────────┘│
│                                             │
│ Your serve is a strong weapon with a low   │
│ fault rate of 8%.                           │
└─────────────────────────────────────────────┘
```

**Expanded Card (click to reveal):**
```
┌─────────────────────────────────────────────┐
│ 📊 Serve Performance           [^]          │
│    How effective is your serve?             │
├─────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐│
│ │ Service Points Won              52%      ││
│ └──────────────────────────────────────────┘│
│                                             │
│ Your serve is a strong weapon with a low   │
│ fault rate of 8%.                           │
│                                             │
│ ┌──────────────────────────────────────────┐│
│ │  8%   of your serves are faults          ││
│ └──────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────┐│
│ │ 45%   of your 3rd ball attacks win the   ││
│ │       point immediately                  ││
│ └──────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────┐│
│ │ 12%   of your 3rd ball attacks are       ││
│ │       unforced errors                    ││
│ └──────────────────────────────────────────┘│
│                                             │
│ [Chart Placeholder]                         │
│                                             │
│ 💡 Keep building patterns around your      │
│    strong serve and 3rd ball attack.       │
│                                             │
│         Based on 2 matches (50 serves)     │
└─────────────────────────────────────────────┘
```

## Data Available

See `phase1dataavailable.md` for schema. Key fields:
- **Shots:** `shot_label` (serve/receive/third_ball/rally_shot), `rally_end_role` (winner/forced_error/unforced_error/none), `shot_result` (in_play/in_net/missed_long/fault)
- **Rallies:** `server_id`, `receiver_id`, `winner_id`, `point_end_type`
- **Filter:** `playerId`, `scopeType`, `contextFilter` (all_points/serve_only/receive_only), `setFilter`

## Real Examples from Production Cards

**Serve Performance Card:**
- Primary: `description: 'Service Points Won'` → displays as `Service Points Won    52%`
- Secondary 1: `description: 'of your serves are faults'` → displays as `8%   of your serves are faults`
- Secondary 2: `description: 'of your 3rd ball attacks win the point immediately'`
- Secondary 3: `description: 'of your 3rd ball attacks are unforced errors'`

**Receive Performance Card:**
- Primary: `description: 'Receive Points Won'`
- Secondary 1: `description: 'of your returns are errors'`
- Secondary 2: `description: 'of receive points end with you being forced into an error'`
- Secondary 3: `description: 'of your rallies as the receiver survive past the opening (5+ shots)'`

**3rd Ball Effectiveness Card:**
- Primary: `description: '3rd Ball Won'`
- Secondary 1: `description: 'of your 3rd ball attacks are unreturnable winners'`
- Secondary 2: `description: 'of your 3rd ball attacks force opponent errors'`
- Secondary 3: `description: 'of your 3rd ball attacks are unforced errors'`

**Subtitle Pattern (Question Format):**
- "How effective is your serve?"
- "How well do you handle their serve?"
- "How dangerous is your 3rd ball attack?"

## Reference

- Existing cards: `ServePerformanceCard.tsx`, `ReceivePerformanceCard.tsx`, `ThirdBallCard.tsx`
- Architecture: `Architecture.md`
- Full schema: `DataSchema.md`

