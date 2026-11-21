import { useParams } from 'react-router-dom'
import { MatchInsightsComposer } from '@/features/insights/composers/MatchInsightsComposer'

/** Insights tab for one match. */
export function MatchInsightsPage() {
  const { matchId = '' } = useParams()
  return <MatchInsightsComposer matchId={matchId} />
}
