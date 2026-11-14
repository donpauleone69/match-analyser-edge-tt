/** Shared stub match. Tag checklist sets come from scores here (not a hardcoded five). */

export type SetTagStatus = {
  setId: number
  score: string
  videoAttached: boolean
  contacts: boolean
  keyMoments: boolean
  shotDetails: boolean
}

export const DEMO_MATCH = {
  id: 'demo-1',
  name: 'Demo vs Opponent',
  opponent: 'Demo Opponent',
  event: 'Club league',
  date: '2026-11-08',
  /** Sets present from Details scores. */
  sets: [
    {
      setId: 1,
      score: '11-7',
      videoAttached: true,
      contacts: true,
      keyMoments: true,
      shotDetails: true,
    },
    {
      setId: 2,
      score: 'In progress',
      videoAttached: true,
      contacts: true,
      keyMoments: false,
      shotDetails: false,
    },
    {
      setId: 3,
      score: '-',
      videoAttached: false,
      contacts: false,
      keyMoments: false,
      shotDetails: false,
    },
  ] satisfies SetTagStatus[],
}

export function getDemoSet(setId: number): SetTagStatus | undefined {
  return DEMO_MATCH.sets.find((s) => s.setId === setId)
}
