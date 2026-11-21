import { useParams } from 'react-router-dom'
import { TagSetComposer } from '@/features/tagging/composers/TagSetComposer'

/** Set Tagger for one set of a match. */
export function TagSetPage() {
  const { matchId = '', setId = '1' } = useParams()
  return <TagSetComposer matchId={matchId} setId={setId} />
}
