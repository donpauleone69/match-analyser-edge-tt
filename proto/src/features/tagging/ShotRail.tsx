import { useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/helpers/utils'
import { hitterOf, isError, stageOf, type Draft, type Mark, type Side } from './rally'

export const railCell =
  'btn-kind-control relative w-full px-1 rounded-md border text-sm font-bold tabular-nums inline-flex items-center justify-center'

const caption = 'h-4 text-[9px] font-bold uppercase tracking-wide leading-4 whitespace-nowrap'

/** Player token, or that token at 15%. Open is the solid token. */
function shotPaint(side: Side, open: boolean, fa: boolean, dim: boolean): CSSProperties {
  const token = side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'
  const fill = open ? token : `color-mix(in srgb, ${token} 15%, transparent)`
  const line = open
    ? token
    : fa
      ? 'var(--color-tag-first-attack)'
      : side === 'me'
        ? 'var(--tag-shot-line-a)'
        : 'var(--tag-shot-line-b)'
  const ink = open ? 'var(--color-tag-on-solid)' : 'var(--color-text)'
  return {
    backgroundColor: fill,
    borderColor: line,
    color: ink,
    ['--shot-fill' as string]: fill,
    ['--shot-line' as string]: line,
    ['--shot-ink' as string]: ink,
    ['--shot-fade' as string]: dim ? '0.6' : '1',
  }
}

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
  endOpen,
  onShot,
  onEnd,
}: {
  /** Null between rallies: the row shows where shot 1 will go. */
  draft: Draft | null
  selected: Mark | null
  /** The shot on screen while the rally loops. */
  liveShot: number | null
  /** End is the open cell. The row scrolls it into view. */
  endOpen: boolean
  onShot: (shot: number) => void
  onEnd: () => void
}) {
  const stage = draft ? stageOf(draft) : 'contacts'
  const n = draft?.contacts.length ?? 0
  const tapping = stage === 'contacts'
  /** Before the result, every shot stays at 15% and 60% opacity, and cannot be pressed. */
  const beforeResult = stage === 'result'
  /** After the result, until the last shot's stroke and wing are in, only that shot is live. */
  const locked = stage === 'endShot'

  // The picked shot stays in view. With none picked, follow the shot on screen.
  // Only the row moves, never the page.
  const scroller = useRef<HTMLDivElement>(null)
  const focusKey = tapping
    ? `next-${n}`
    : endOpen
      ? 'end'
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
              const side = hitterOf(draft.server, shot)
              /** Open is the solid cell. Before the result, and while tapping, nothing is open. */
              const openLook = on && !tapping && !beforeResult
              const keep = tapping || beforeResult
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
                    disabled={keep || (locked && !isEnd)}
                    data-shot-look={keep ? 'keep' : undefined}
                    onClick={() => onShot(shot)}
                    className={cn(railCell, 'w-full', isFa && !openLook && 'border-2')}
                    style={shotPaint(side, openLook, isFa && !openLook, beforeResult)}
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
                  <span className={cn(caption, isFa ? 'text-tag-first-attack' : 'text-muted')}>
                    {isFa ? 'FA' : shot === 1 ? 'Srv' : ''}
                  </span>
                </div>
              )
            })
          : null}

        {!tapping && n > 0 && draft ? (
          <div className="flex w-12 flex-col items-center shrink-0" data-rail="end">
            <button
              type="button"
              aria-label="End of the point"
              aria-pressed={endOpen}
              onClick={onEnd}
              className={cn(railCell, 'w-full text-xs')}
              style={
                endOpen
                  ? {
                      backgroundColor: 'var(--color-tag-end-open)',
                      borderColor: 'var(--color-tag-end-open)',
                      color: '#fff',
                    }
                  : {
                      backgroundColor: 'var(--tag-cell-rest)',
                      borderColor: 'var(--tag-cell-rest-line)',
                      color: 'var(--color-text)',
                    }
              }
            >
              End
            </button>
            <span className={cn(caption, draft.ending && isError(draft.ending) ? 'text-tag-error' : 'text-muted')}>
              {draft.ending ?? ''}
            </span>
          </div>
        ) : null}

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
