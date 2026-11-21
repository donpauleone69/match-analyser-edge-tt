import { Fragment, useLayoutEffect, useRef } from 'react'
import { cn } from '@/helpers/utils'
import { formatScore } from '@/rules/match'
import type { SetData } from '@/types/match'
import type { RallyData, Side } from '@/types/rally'
import { countPoints, setEndIndex } from '@/rules/score'
import type { EditGapStop } from '@/rules/matchOps'
import { zoneButton, zonePressed, zoneRest } from './styles'

/**
 * The Set Zone. One row: the pills, then Edit Set in the star's box.
 * The set number is not repeated here.
 */
export function SetZone({
  rallies,
  picked,
  gaps,
  pickedGap,
  open,
  insert,
  serveBreaks,
  onGap,
  onRally,
  editing,
  dim,
  onEdit,
}: {
  rallies: RallyData[]
  picked: string | null
  gaps: EditGapStop[] | null
  pickedGap: number | null
  /** Null hides the next pill: Edit Set, a finished set, and Set over. */
  open: { n: number; server: Side | null } | null
  insert: { index: number; n: number; server: Side } | null
  serveBreaks: number[]
  onGap: (index: number) => void
  /** While review is on, a rally pill jumps there and the star stays on. */
  onRally?: (id: string) => void
  editing: boolean
  /** No saved rally yet. A press still runs, so the hint can say so. */
  dim: boolean
  onEdit: () => void
}) {
  return (
    <div className="tag-setzone" data-set-zone>
      <SetPills
        rallies={rallies}
        picked={picked}
        gaps={gaps}
        pickedGap={pickedGap}
        open={open}
        insert={insert}
        serveBreaks={serveBreaks}
        onGap={onGap}
        onRally={onRally}
      />
      <button
        type="button"
        data-edit-set
        data-edit-dim={dim ? '' : undefined}
        aria-pressed={editing}
        className={zoneButton}
        style={editing ? zonePressed() : { ...zoneRest(), opacity: dim ? 0.45 : 1 }}
        onClick={onEdit}
      >
        Edit Set
      </button>
    </div>
  )
}

function SetPills({
  rallies,
  picked,
  gaps,
  pickedGap,
  open,
  insert,
  serveBreaks,
  onGap,
  onRally,
}: {
  rallies: SetData['rallies']
  picked: string | null
  gaps: EditGapStop[] | null
  pickedGap: number | null
  open: { n: number; server: Side | null } | null
  insert: { index: number; n: number; server: Side } | null
  serveBreaks: number[]
  onGap: (index: number) => void
  onRally?: (id: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const end = setEndIndex(rallies.map((r) => r.winner))
  const overrun = end >= 0 && end < rallies.length - 1
  let lead = 0
  while (lead < rallies.length && rallies[lead].point) lead++
  const start = lead > 0 ? countPoints(rallies.slice(0, lead).map((r) => r.winner)) : null
  const pills = rallies.flatMap((r, i) => (r.point ? [] : [{ r, n: i + 1, i, warn: overrun && i > end }]))
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const pill =
      pickedGap !== null
        ? el.querySelector(`[data-gap-index="${pickedGap}"]`)
        : picked
          ? el.querySelector(`[data-pill-id="${picked}"]`)
          : null
    if (pill instanceof HTMLElement) {
      el.scrollLeft = Math.max(0, pill.offsetLeft - (el.clientWidth - pill.offsetWidth) / 2)
      return
    }
    el.scrollLeft = el.scrollWidth
  }, [picked, pickedGap, pills.length, open?.n, start?.me, start?.them])
  return (
    <div ref={scroller} className="tag-pills" data-set-pills>
      {start ? (
        <span className="tag-pill tag-pill-start" data-start-pill>
          {formatScore(start)}
        </span>
      ) : null}
      {pills.map(({ r, n, i, warn }) => {
        const slot = gaps?.find((g) => g.index === i) ?? null
        const on = slot !== null && slot.index === pickedGap
        const inserting = insert !== null && slot !== null && insert.index === slot.index
        const serve = serveBreaks.includes(i)
        return (
          <Fragment key={r.id}>
            {inserting && insert ? (
              <span
                className={cn('tag-pill tag-pill-open', insert.server === 'me' ? 'text-side-me' : 'text-side-them')}
                data-open-pill={insert.n}
                data-gap-index={slot.index}
              >
                {insert.n}
              </span>
            ) : slot ? (
              <button
                type="button"
                data-gap-slot=""
                data-gap-index={slot.index}
                data-on={on ? '' : undefined}
                data-likely={slot.likely ? '' : undefined}
                className="tag-gap-hit btn-kind-control"
                aria-current={on ? 'true' : undefined}
                aria-label={`Before rally ${slot.n}`}
                onClick={() => onGap(slot.index)}
              >
                <span className="tag-gap-slot" data-on={on ? '' : undefined} data-likely={slot.likely ? '' : undefined} />
              </button>
            ) : null}
            {onRally ? (
              <button
                type="button"
                data-set-pill={n}
                data-pill-id={r.id}
                data-pill-warn={warn ? '' : undefined}
                data-pill-serve={serve ? '' : undefined}
                data-pill-on={picked === r.id ? '' : undefined}
                aria-current={picked === r.id ? 'true' : undefined}
                aria-label={`Rally ${n}`}
                className={cn(
                  'tag-pill',
                  r.winner === 'me' ? 'bg-side-me' : 'bg-side-them',
                  gaps && 'tag-pill-dim',
                  picked === r.id && 'tag-pill-on',
                  warn && 'tag-pill-warn',
                  serve && 'tag-pill-serve',
                )}
                onClick={() => onRally(r.id)}
              >
                {n}
              </button>
            ) : (
              <span
                data-set-pill={n}
                data-pill-id={r.id}
                data-pill-warn={warn ? '' : undefined}
                data-pill-serve={serve ? '' : undefined}
                data-pill-on={picked === r.id ? '' : undefined}
                className={cn(
                  'tag-pill',
                  r.winner === 'me' ? 'bg-side-me' : 'bg-side-them',
                  gaps && 'tag-pill-dim',
                  picked === r.id && 'tag-pill-on',
                  warn && 'tag-pill-warn',
                  serve && 'tag-pill-serve',
                )}
              >
                {n}
              </span>
            )}
          </Fragment>
        )
      })}
      {open ? (
        <span
          className={cn(
            'tag-pill tag-pill-open',
            open.server === null ? 'tag-pill-wait' : open.server === 'me' ? 'text-side-me' : 'text-side-them',
          )}
          data-open-pill={open.n}
          data-open-grey={open.server === null ? '' : undefined}
        >
          {open.n}
        </span>
      ) : null}
    </div>
  )
}
