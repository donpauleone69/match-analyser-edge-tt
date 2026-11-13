/**
 * useDeriveHome — loads matches, sets and rally counts for the Home screen.
 */

import { useEffect, useMemo, useState } from 'react'
import { matchDb, rallyDb, setDb, usePlayerStore } from '@/data'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'
import { isIncompleteTaggedRally } from '@/rules/analytics/isCompleteScoringRally'
import { buildHome, type HomeMatchInput } from './buildHome'
import type { HomeModel } from '../models'
import { useCloudStore } from '@/stores/cloudStore'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'

export function useDeriveHome() {
  const { players, load: loadPlayers } = usePlayerStore()
  const profile = useCloudStore((state) => state.profile)
  const [inputs, setInputs] = useState<HomeMatchInput[] | null>(null)

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    let active = true
    ;(async () => {
      const allMatches = await matchDb.getAll()
      const matches = deriveAccountScope(profile, allMatches).matches
      const loaded = await Promise.all(
        matches.map(async (match): Promise<HomeMatchInput> => {
          const sets = await setDb.getByMatchId(match.id)
          const perSet = await Promise.all(
            sets.map(async (s) => {
              const rallies = await rallyDb.getBySetId(s.id)
              return {
                setId: s.id,
                count: rallies.length,
                incomplete: rallies.filter(isIncompleteTaggedRally).length,
              }
            })
          )
          return {
            match,
            sets,
            rallyCounts: new Map(perSet.map((r) => [r.setId, r.count])),
            incompleteRallyCount: perSet.reduce((n, r) => n + r.incomplete, 0),
          }
        })
      )
      if (active) setInputs(loaded)
    })().catch((err) => {
      console.error('[Home] Failed to load matches:', err)
      if (active) setInputs([])
    })
    return () => {
      active = false
    }
  }, [profile])

  const home = useMemo<HomeModel | null>(() => {
    if (!inputs) return null
    const byId = new Map(players.map((p) => [p.id, p]))
    const nameOf = (id: string | null) => {
      const p = id ? byId.get(id) : undefined
      return p ? `${p.first_name} ${p.last_name}`.trim() : id ? 'Unknown player' : THEM_SIDE_LABEL
    }
    return buildHome(inputs, nameOf)
  }, [inputs, players])

  return { home, isLoading: inputs === null }
}
