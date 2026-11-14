/**
 * MatchCreationComposer - Create new match and start tagging
 */

import { useEffect } from 'react'
import { usePlayerStore, useTournamentStore } from '@/data'
import { MatchFormSection } from '../sections/MatchFormSection'
import { Icon } from '@/ui-mine'
import { useCloudStore } from '@/stores/cloudStore'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'

export function MatchCreationComposer() {
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  const profile = useCloudStore((state) => state.profile)
  const focalPlayerId = deriveAccountScope(profile, []).focalPlayerId

  useEffect(() => {
    loadPlayers()
    loadTournaments()
  }, [loadPlayers, loadTournaments])

  return (
    <div className="space-y-3">
      <h1 className="text-lg md:text-xl font-semibold text-primary flex items-center gap-2">
        <Icon name="plus" size="md" className="text-brand-primary" />
        New match
      </h1>

      <MatchFormSection
        players={players}
        tournaments={tournaments}
        focalPlayerId={focalPlayerId}
      />
    </div>
  )
}
