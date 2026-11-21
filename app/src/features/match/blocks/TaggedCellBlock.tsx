import { Link } from 'react-router-dom'
import { Button, buttonKindTextLink } from '@/ui-mine'
import { WfWarnBadge } from '@/ui-mine'
import { formatScore } from '@/rules/format'
import { hasDifferingScores, deriveSetState, calculateTaggedScore } from '@/rules/match'
import type { SetData } from '@/types/match'
import { cn } from '@/helpers/utils'

export function TaggedCellBlock({
  set,
  tagHref,
  onUseTagged,
}: {
  set: SetData
  tagHref: string
  onUseTagged: () => void
}) {
  const state = deriveSetState(set)
  const tagged = calculateTaggedScore(set)
  if (state === 'none') return <span className="text-muted">Not tagged</span>
  if (!tagged) return <span className="text-muted">Started</span>
  if (state === 'progress') {
    return <span className="text-muted">{formatScore(tagged)} so far</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold text-primary">{formatScore(tagged)}</span>
      {hasDifferingScores(set) ? (
        <>
          <WfWarnBadge>Differs</WfWarnBadge>
          <Button kind="control" variant="secondary" onClick={onUseTagged}>
            Use tagged
          </Button>
          <Link
            to={tagHref}
            className={cn('text-xs font-semibold text-brand underline', buttonKindTextLink)}
          >
            Open set {set.setId}
          </Link>
        </>
      ) : null}
    </span>
  )
}
