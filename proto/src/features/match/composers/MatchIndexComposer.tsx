import { Navigate } from 'react-router-dom'
import { deriveDefaultMatchTab, derivePhase } from '@/rules/match'
import { useMatchRecord } from '@/stores/matchStore'

export function MatchIndexComposer({ matchId }: { matchId: string }) {
  const match = useMatchRecord(matchId)
  if (!match) return <Navigate to="/matches" replace />
  const tab = deriveDefaultMatchTab(derivePhase(match))
  return <Navigate to={`/matches/${matchId}/${tab}`} replace />
}
