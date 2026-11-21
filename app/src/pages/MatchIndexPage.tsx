import { useParams } from 'react-router-dom'
import { MatchIndexComposer } from '@/features/match/composers/MatchIndexComposer'

/** Opens a match on Tag until it is fully tagged, then on Insights. */
export function MatchIndexPage() {
  const { matchId = '' } = useParams()
  return <MatchIndexComposer matchId={matchId} />
}
