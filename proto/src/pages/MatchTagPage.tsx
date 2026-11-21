import { useParams } from 'react-router-dom'
import { MatchTagComposer } from '@/features/match/composers/MatchTagComposer'

/** Tag checklist for one match. */
export function MatchTagPage() {
  const { matchId = '' } = useParams()
  return <MatchTagComposer matchId={matchId} />
}
