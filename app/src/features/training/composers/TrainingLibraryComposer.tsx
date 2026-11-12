/**
 * Training library stub — practice posts live here, not under matches.
 * Slice F fills shot-type and combination comparison.
 */

import { useNavigate } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'

export function TrainingLibraryComposer() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Not a match
        </p>
        <h1 className="text-2xl font-bold text-neutral-50 md:text-3xl">Training</h1>
        <p className="max-w-xl text-sm text-neutral-400">
          Short practice posts for one player: about ten reps of a shot type, or a named
          combination such as serve → open → drive. Compare this month with earlier months.
          No score, opponent, or tournament.
        </p>
      </header>

      <Card className="space-y-3 border-dashed border-neutral-600 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Coming next
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-300">
          <li>Shot-type posts with dated clips</li>
          <li>Combination posts (prove with serve → open → drive)</li>
          <li>Side-by-side month comparison</li>
        </ul>
        <p className="text-sm text-neutral-500">
          Match review, Work on, and match clips stay under Matches — Training never appears there.
        </p>
      </Card>

      <Button variant="secondary" onClick={() => navigate('/matches')}>
        <Icon name="swords" size="sm" />
        Back to matches
      </Button>
    </div>
  )
}
