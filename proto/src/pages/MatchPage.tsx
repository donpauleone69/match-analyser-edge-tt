import { useParams } from 'react-router-dom'
import { MatchHubComposer } from '@/features/match/composers/MatchHubComposer'

/** Match hub: header, tabs, and the open tab. */
export function MatchPage() {
  const { matchId = '' } = useParams()
  return <MatchHubComposer matchId={matchId} />
}
