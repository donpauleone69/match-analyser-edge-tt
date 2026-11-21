import { useParams } from 'react-router-dom'
import { MatchDetailsComposer } from '@/features/match/composers/MatchDetailsComposer'

/** Details for one match. */
export function MatchDetailsPage() {
  const { matchId = '' } = useParams()
  return <MatchDetailsComposer matchId={matchId} />
}
