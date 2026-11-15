import { useEffect, useRef } from 'react'
import { cn } from '@/helpers/utils'
import { hitterOf, stageOf, type Draft, type Mark, type Side } from './rally'

export const railCell =
  'btn-kind-control relative w-full px-1 rounded-md border text-sm font-bold tabular-nums inline-flex items-center justify-center disabled:opacity-40'

const sideTint: Record<Side, string> = {
  me: 'bg-side-me/15 border-side-me/50 text-primary',
  them: 'bg-side-them/15 border-side-them/50 text-primary',
}

const caption = 'h-4 text-[9px] font-bold uppercase tracking-wide leading-4 whitespace-nowrap'

function isSelected(selected: Mark | null, shot: number): boolean {
  return selected?.kind === 'shot' && selected.shot === shot
}

/**
 * The rally as one row of shots in the hitters' colours. It is both the map
 * and the navigation. Shots only: it scrolls on a long rally, keeps the picked
 * shot in view, and follows the shot on screen when none is picked.
 */
export function ShotRail({
  draft,
  selected,
  liveShot,
  onShot,
}: {
  /** Null between rallies: the row shows where shot 1 will go. */
  draft: Draft | null
  selected: Mark | null
  /** The shot on screen while the rally loops. */
  liveShot: number | null
  onShot: (shot: number) => void
}) {
  const stage = draft ? stageOf(draft) : 'contacts'
  const n = draft?.contacts.length ?? 0
  const tapping = stage === 'contacts'
  /** While the result and end shot are entered, only the end shot is live. */
  const locked = stage === 'result' || stage === 'endShot'

  // The picked shot stays in view. With none picked, follow the shot on screen.
  // Only the row moves, never the page.
  const scroller = useRef<HTMLDivElement>(null)
  const focusKey = tapping
    ? `next-${n}`
    : selected?.kind === 'shot'
      ? `shot-${selected.shot}`
      : liveShot
        ? `shot-${liveShot}`
        : null
  useEffect(() => {
    const row = scroller.current
    if (!row || !focusKey) return
    const target = row.querySelector<HTMLElement>(`[data-rail="${focusKey}"]`)
    if (!target) return
    const centred = target.offsetLeft - (row.clientWidth - target.offsetWidth) / 2
    const max = row.scrollWidth - row.clientWidth
    let left = Math.max(0, Math.min(centred, max))
    // Stop on a cell's edge where there is room, so the first cell shown is whole.
    if (left > 0 && left < max) {
      const edges = [...row.children].map((c) => (c as HTMLElement).offsetLeft).filter((x) => x <= left + 1)
      if (edges.length > 0) left = edges[edges.length - 1]
    }
    row.scrollLeft = left
  }, [focusKey])

  return (
    <div className="flex w-full min-w-0 items-start overflow-hidden" data-rail-row>
      <div
        ref={scroller}
        className="relative flex min-w-0 flex-1 items-start gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Shots in this rally"
      >
        {draft
          ? draft.contacts.map((_, i) => {
              const shot = i + 1
              const isEnd = !tapping && shot === n
              const isFa = draft.fa === shot
              const on = isSelected(selected, shot)
              const live = liveShot === shot
              return (
                <div
                  key={shot}
                  className="flex w-[var(--btn-kind-control)] flex-col items-center shrink-0"
                  data-rail={`shot-${shot}`}
                >
                  <button
                    type="button"
                    aria-label={`Shot ${shot}`}
                    aria-pressed={on}
                    aria-current={live ? 'true' : undefined}
                    disabled={tapping || (locked && !isEnd)}
                    onClick={() => onShot(shot)}
                    className={cn(
                      railCell,
                      'w-full',
                      sideTint[hitterOf(draft.server, shot)],
                      isFa && 'border-shot-fa border-2',
                      on && 'ring-2 ring-brand-primary',
                      (tapping || live) && 'disabled:opacity-100'
                    )}
                  >
                    {shot}
                    {live ? (
                      <span
                        data-rail-live
                        aria-hidden
                        className="absolute inset-x-1 bottom-0.5 h-1 rounded-full bg-text"
                      />
                    ) : null}
                  </button>
                  <span className={cn(caption, isFa ? 'text-shot-fa' : 'text-muted')}>
                    {isFa ? 'FA' : isEnd ? (draft.ending ?? '') : shot === 1 ? 'Srv' : ''}
                  </span>
                </div>
              )
            })
          : null}

        {tapping ? (
          <div className="flex w-[var(--btn-kind-control)] flex-col items-center shrink-0" data-rail={`next-${n}`}>
            <span className={cn(railCell, 'w-full border-dashed border-border text-muted opacity-60')}>{n + 1}</span>
            <span className={caption} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
