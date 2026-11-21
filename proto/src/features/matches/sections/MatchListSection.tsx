import type { NavigateFunction } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { WfEmpty } from '@/ui-mine'
import type { MatchRecord } from '@/types/match'
import { MatchRowBlock } from '../blocks/MatchRowBlock'

export function MatchListSection({
  matches,
  shown,
  onNew,
  clear,
  navigate,
}: {
  matches: MatchRecord[]
  shown: MatchRecord[]
  onNew: () => void
  clear: () => void
  navigate: NavigateFunction
}) {
  return matches.length === 0 ? (
    <div className="space-y-3 px-4 py-6 sm:px-6 lg:px-8">
      <WfEmpty title="No matches yet" />
      <Button fullWidth kind="main" onClick={onNew}>
        <Icon name="plus" size="xs" />
        New match
      </Button>
    </div>
  ) : shown.length === 0 ? (
    <div className="space-y-3 px-4 py-6 sm:px-6 lg:px-8">
      <WfEmpty title="Nothing fits this filter" />
      <Button fullWidth kind="main" onClick={clear}>
        Clear filter
      </Button>
    </div>
  ) : (
    <ul>
      {shown.map((m) => (
        <MatchRowBlock key={m.id} m={m} navigate={navigate} />
      ))}
    </ul>
  )
}
