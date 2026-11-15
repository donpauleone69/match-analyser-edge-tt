import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { hitterOf, stageOf, type Draft, type Mark, type Side } from './rally'

const cell =
  'h-9 min-w-9 px-1 rounded-md border text-sm font-bold tabular-nums inline-flex items-center justify-center disabled:opacity-40'

const sideTint: Record<Side, string> = {
  me: 'bg-side-me/15 border-side-me/50 text-primary',
  them: 'bg-side-them/15 border-side-them/50 text-primary',
}

const caption = 'h-4 text-[9px] font-bold uppercase tracking-wide leading-4'

function isSelected(selected: Mark | null, mark: Mark): boolean {
  if (!selected || selected.kind !== mark.kind) return false
  return mark.kind !== 'shot' || (selected.kind === 'shot' && selected.shot === mark.shot)
}

/**
 * The rally as one row: start mark, a cell per shot in the hitter's colour,
 * end mark, No attack and highlight. It is both the map and the navigation.
 */
export function ShotRail({
  draft,
  selected,
  onShot,
  onMark,
  onClearFa,
  onNoAttack,
  onHighlight,
  readOnly = false,
}: {
  draft: Draft
  selected: Mark | null
  onShot: (shot: number) => void
  onMark: (mark: Mark) => void
  onClearFa: () => void
  onNoAttack: () => void
  onHighlight: () => void
  /** Shots can be picked to watch them; nothing can be changed. */
  readOnly?: boolean
}) {
  const stage = stageOf(draft)
  const n = draft.contacts.length
  const tapping = stage === 'contacts'
  /** While the result and end shot are entered, only the end shot is live. */
  const locked = stage === 'result' || stage === 'endShot'
  const marksOff = tapping || locked || readOnly
  const showNoAttack = !tapping && n > 1 && (stage === 'pickFa' || draft.noAttack)
  const marks = !tapping && !readOnly

  return (
    <div className="flex items-start gap-1 overflow-x-auto py-1" aria-label="Shots in this rally">
      {marks ? (
        <div className="flex flex-col items-center shrink-0">
          <button
            type="button"
            aria-label="Rally start"
            aria-pressed={isSelected(selected, { kind: 'start' })}
            disabled={marksOff}
            onClick={() => onMark({ kind: 'start' })}
            className={cn(
              cell,
              'min-w-6 border-border bg-bg-card text-muted',
              isSelected(selected, { kind: 'start' }) && 'ring-2 ring-brand-primary'
            )}
          >
            [
          </button>
          <span className={cn(caption, 'text-muted')}>Start</span>
        </div>
      ) : null}

      {draft.contacts.map((_, i) => {
        const shot = i + 1
        const isEnd = !tapping && shot === n
        const isFa = draft.fa === shot
        const on = isSelected(selected, { kind: 'shot', shot })
        return (
          <div key={shot} className="flex flex-col items-center shrink-0">
            <button
              type="button"
              aria-label={`Shot ${shot}`}
              aria-pressed={on}
              disabled={tapping || (locked && !isEnd)}
              onClick={() => onShot(shot)}
              className={cn(
                cell,
                sideTint[hitterOf(draft.server, shot)],
                isFa && 'border-shot-fa border-2',
                on && 'ring-2 ring-brand-primary',
                tapping && 'disabled:opacity-100'
              )}
            >
              {shot}
            </button>
            {isFa && !locked && !readOnly ? (
              <button
                type="button"
                onClick={onClearFa}
                aria-label={`Clear first attack on shot ${shot}`}
                className={cn(caption, 'text-shot-fa underline')}
              >
                {isEnd ? 'FA · End' : 'FA'}
              </button>
            ) : (
              <span className={cn(caption, isFa ? 'text-shot-fa' : 'text-muted')}>
                {isFa && isEnd ? 'FA · End' : isFa ? 'FA' : isEnd ? 'End' : shot === 1 ? 'Srv' : ''}
              </span>
            )}
          </div>
        )
      })}

      {tapping ? (
        <div className="flex flex-col items-center shrink-0">
          <span className={cn(cell, 'border-dashed border-border text-muted opacity-60')}>{n + 1}</span>
          <span className={caption} />
        </div>
      ) : !marks ? null : (
        <div className="flex flex-col items-center shrink-0">
          <button
            type="button"
            aria-label="Rally end"
            aria-pressed={isSelected(selected, { kind: 'end' })}
            disabled={marksOff}
            onClick={() => onMark({ kind: 'end' })}
            className={cn(
              cell,
              'min-w-6 border-border bg-bg-card text-muted',
              isSelected(selected, { kind: 'end' }) && 'ring-2 ring-brand-primary'
            )}
          >
            ]
          </button>
          <span className={cn(caption, 'text-muted')}>Stop</span>
        </div>
      )}

      {showNoAttack ? (
        <div className="flex flex-col items-center shrink-0 ml-1">
          <button
            type="button"
            aria-pressed={draft.noAttack}
            disabled={readOnly}
            onClick={onNoAttack}
            className={cn(
              cell,
              'px-2 text-xs',
              draft.noAttack
                ? 'bg-danger text-white border-danger'
                : 'bg-bg-card border-border text-primary'
            )}
          >
            No attack
          </button>
          <span className={caption} />
        </div>
      ) : null}

      {!tapping && (!readOnly || draft.highlight) ? (
        <div className="flex flex-col items-center shrink-0">
          <button
            type="button"
            aria-label="Highlight rally"
            aria-pressed={draft.highlight}
            disabled={locked || readOnly}
            onClick={onHighlight}
            className={cn(
              cell,
              draft.highlight
                ? 'bg-warning/25 border-warning text-primary'
                : 'bg-bg-card border-border text-muted'
            )}
          >
            <Icon name="star" size="sm" />
          </button>
          <span className={caption} />
        </div>
      ) : null}
    </div>
  )
}
