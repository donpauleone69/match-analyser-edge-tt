import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import { useDemo } from '@/data/demoStore'

/** Set view. Placeholder while the tagging screen is built on the new store. */
export function TagSetScreen() {
  const navigate = useNavigate()
  const { matchId = '', setId = '1' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  const set = match?.sets.find((s) => s.setId === Number(setId))
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
      <WfEmpty
        title={set ? `Set ${set.setId}` : 'Unknown set'}
        body={set ? `${set.rallies.length} rallies saved.` : 'Back to Tag checklist.'}
      />
      <Button variant="secondary" onClick={() => navigate(`/matches/${matchId}/tag`)}>
        Back to Tag
      </Button>
    </div>
  )
}
