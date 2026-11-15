import { useState, type ReactNode } from 'react'
import { Button, Icon } from '@/ui-mine'
import { formatScore, type SetData } from '@/data/demoStore'
import { cn } from '@/helpers/utils'
import type { Continuity, RallyMark } from './continuity'
import { deletedOf } from './matchOps'
import { servesText, type MarkKind, type RallyData, type Side } from './rally'
import { ZERO, addPoint, type Points } from './score'
import { firstContactG, insertIndex, type Segment } from './timeline'

export type RallyListActions = {
  /** Tag a rally in the gap in front of the rally at `index`. Null when the gap cannot be played. */
  canAddRally: (index: number) => boolean
  onAddRally: (index: number) => void
  /** A point with no video, in front of the rally at `index` (or at the end). */
  onAddPoint: (index: number, winner: Side) => void
  onSwap: (rallyId: string) => void
  onLeave: (rallyId: string, kind: MarkKind) => void
  onRestore: (rallyId: string) => void
  onDeletePoint: (rallyId: string) => void
}

const small = 'min-h-11 lg:min-h-0 lg:h-7 px-2.5 text-xs'

function markText(m: RallyMark, names: Record<Side, string>): string {
  if (m.kind === 'gap') return `${Math.round(m.seconds)}s of video before this rally`
  return `Serve order: ${names[m.served]} served, ${names[m.expected]} expected`
}

/**
 * Saved rallies, newest first, in video order. Opening one puts it in the
 * panel to edit. Continuity marks sit under the rally they belong to, with
 * the four fixes. Deleted rallies stay, crossed out, until the set is finished.
 */
export function RallyList({
  set,
  names,
  segs,
  marks,
  scoreMark,
  nextServer,
  editingId,
  addingAt,
  hasVideo,
  onOpen,
  finish,
  score,
  onFinish,
  actions,
}: {
  set: SetData
  names: Record<Side, string>
  segs: Segment[]
  marks: RallyMark[]
  scoreMark: Continuity['score']
  nextServer: Side
  editingId: string | null
  /** The gap a rally is being added in right now. */
  addingAt: number | null
  /** False for a rally whose video was removed: listed, not playable. */
  hasVideo: (videoId: string) => boolean
  onOpen: (r: RallyData, index: number) => void
  /** Finish at the score so far. Null while the panel offers it, or it cannot be. */
  finish: 'ok' | 'level' | null
  score: Points
  onFinish: () => void
  /** Null when nothing can be changed: a finished set, or an archive. */
  actions: RallyListActions | null
}) {
  /** Add mode shows a place to add in every gap. */
  const [adding, setAdding] = useState(false)
  /** The place a point is being added: who won is asked there. */
  const [pointAt, setPointAt] = useState<number | null>(null)

  let running = ZERO
  const rows = set.rallies.map((r, index) => {
    running = addPoint(running, r.winner)
    return { r, index, after: running }
  })
  const deleted = deletedOf(set).map((r) => {
    const g = firstContactG(segs, r)
    return { r, at: g === null ? set.rallies.length : insertIndex(segs, set.rallies, g) }
  })
  const dot = (side: Side) => cn('h-2 w-2 rounded-full shrink-0', side === 'me' ? 'bg-side-me' : 'bg-side-them')
  const n = set.rallies.length

  const whoWon = (index: number) => (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Who won the point">
      <span className="text-xs text-primary">Who won?</span>
      {(['me', 'them'] as const).map((side) => (
        <Button
          key={side}
          size="sm"
          variant="secondary"
          className={small}
          onClick={() => {
            actions?.onAddPoint(index, side)
            setPointAt(null)
            setAdding(false)
          }}
        >
          <span className={dot(side)} />
          {names[side]}
        </Button>
      ))}
      <Button size="sm" variant="ghost" className={small} onClick={() => setPointAt(null)}>
        Cancel
      </Button>
    </div>
  )

  /** What sits in the gap in front of rally `index`: marks, a place to add, deleted rallies. */
  const gap = (index: number): ReactNode => {
    const r = set.rallies[index]
    const here = r ? marks.filter((m) => m.rallyId === r.id) : []
    const gone = deleted.filter((d) => d.at === index)
    const canRally = Boolean(actions && r && actions.canAddRally(index))
    const asking = pointAt === index
    const open = actions && (adding || asking) && here.length === 0
    if (here.length === 0 && gone.length === 0 && !open && addingAt !== index) return null
    return (
      <div key={`gap-${index}`} className="space-y-1" data-gap={index}>
        {here.map((m) => (
          <div
            key={m.kind}
            role="alert"
            data-mark={m.kind}
            className="rounded-md border border-warning bg-warning/15 px-2 py-1.5 space-y-1.5"
          >
            <p className="text-xs font-semibold text-primary">{markText(m, names)}</p>
            {actions ? (
              asking ? (
                whoWon(index)
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {canRally ? (
                    <Button size="sm" variant="secondary" className={small} onClick={() => actions.onAddRally(index)}>
                      Add rally here
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" className={small} onClick={() => setPointAt(index)}>
                    Add point
                  </Button>
                  {m.kind === 'serve' ? (
                    <Button size="sm" variant="secondary" className={small} onClick={() => actions.onSwap(m.rallyId)}>
                      Swap players
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className={small} onClick={() => actions.onLeave(m.rallyId, m.kind)}>
                    Leave it
                  </Button>
                </div>
              )
            ) : null}
          </div>
        ))}
        {addingAt === index ? (
          <p className="rounded-md border border-dashed border-brand-primary px-2 py-1.5 text-xs font-semibold text-primary" role="status">
            Adding a rally here
          </p>
        ) : null}
        {open ? (
          <div className="rounded-md border border-dashed border-border-strong px-2 py-1.5" data-add-slot={index}>
            {asking ? (
              whoWon(index)
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {canRally ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className={small}
                    onClick={() => {
                      setAdding(false)
                      actions.onAddRally(index)
                    }}
                  >
                    Add rally here
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" className={small} onClick={() => setPointAt(index)}>
                  Add point
                </Button>
              </div>
            )}
          </div>
        ) : null}
        {gone.map(({ r: d }) => (
          <div
            key={d.id}
            data-deleted
            className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted"
          >
            <span className="w-5" />
            <span className="flex-1 min-w-0 truncate line-through">
              {d.point
                ? `Point, no video · ${names[d.winner]}`
                : `${names[d.winner]} · ${d.contacts.length} ${d.contacts.length === 1 ? 'shot' : 'shots'} · ${d.ending ?? ''}`}
            </span>
            <span>Deleted</span>
            {actions ? (
              <Button size="sm" variant="secondary" className={small} onClick={() => actions.onRestore(d.id)}>
                Restore
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="px-2 py-2 space-y-1" aria-label="Rally list">
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {n} {n === 1 ? 'rally' : 'rallies'}
          {marks.length > 0 ? ` · ${marks.length} to check` : ''}
        </p>
        <div className="flex items-center gap-1">
          {actions && n > 0 ? (
            <Button
              size="sm"
              variant={adding ? 'secondary' : 'ghost'}
              className="min-h-11 lg:min-h-0"
              aria-pressed={adding}
              onClick={() => {
                setAdding(!adding)
                setPointAt(null)
              }}
            >
              <Icon name={adding ? 'x' : 'plus'} size="xs" />
              {adding ? 'Done' : 'Add'}
            </Button>
          ) : null}
          {finish === 'ok' ? (
            <Button size="sm" variant="ghost" className="min-h-11 lg:min-h-0" onClick={onFinish}>
              Finish at {formatScore(score)}
            </Button>
          ) : finish === 'level' ? (
            <p className="text-xs text-muted">Level, so it cannot finish</p>
          ) : null}
        </div>
      </div>
      {scoreMark ? (
        <p
          role="alert"
          data-mark="score"
          className="rounded-md border border-warning bg-warning/15 px-2 py-1.5 text-xs font-semibold text-primary"
        >
          Tagged {formatScore(scoreMark.tagged)} · Details says {formatScore(scoreMark.entered)}
        </p>
      ) : null}
      {!set.finished ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted">
          <span className="w-5 text-center tabular-nums">{n + 1}</span>
          <span className={dot(set.draft?.server ?? nextServer)} />
          <span>
            {set.draft
              ? hasVideo(set.draft.videoId)
                ? 'Rally open'
                : 'Rally open · video removed'
              : `Next rally · ${servesText(names, nextServer)}`}
          </span>
        </div>
      ) : null}
      {gap(n)}
      {[...rows].reverse().map(({ r, index, after }) => (
        <div key={r.id} className="space-y-1">
          {r.point ? (
            <div
              data-point
              aria-label={`Rally ${index + 1}`}
              className="w-full min-h-11 lg:min-h-0 flex items-center gap-2 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs"
            >
              <span className="w-5 text-center tabular-nums text-muted">{index + 1}</span>
              <span className={dot(r.winner)} />
              <span className="font-semibold text-primary w-16 truncate">{names[r.winner]}</span>
              <span className="flex-1 min-w-0 truncate text-muted">Point, no video · {names[r.server]} served</span>
              {actions ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className={small}
                  aria-label={`Delete point ${index + 1}`}
                  onClick={() => actions.onDeletePoint(r.id)}
                >
                  <Icon name="trash" size="xs" />
                </Button>
              ) : null}
              <span className="font-semibold text-primary tabular-nums">{formatScore(after)}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(r, index)}
              disabled={!hasVideo(r.videoId)}
              aria-label={`Rally ${index + 1}`}
              aria-pressed={editingId === r.id}
              data-marked={marks.some((m) => m.rallyId === r.id) || undefined}
              className={cn(
                'w-full min-h-11 lg:min-h-0 flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs disabled:opacity-60',
                editingId === r.id
                  ? 'border-brand-primary bg-brand-primary-muted'
                  : marks.some((m) => m.rallyId === r.id)
                    ? 'border-warning bg-bg-card hover:bg-bg-elevated'
                    : 'border-border bg-bg-card hover:bg-bg-elevated'
              )}
            >
              <span className="w-5 text-center tabular-nums text-muted">{index + 1}</span>
              <span className={dot(r.winner)} />
              <span className="font-semibold text-primary w-16 truncate">{names[r.winner]}</span>
              <span className="flex-1 min-w-0 truncate text-muted">
                {r.contacts.length} {r.contacts.length === 1 ? 'shot' : 'shots'} · {r.ending}
                {r.fa !== null ? ` · FA ${r.fa}` : ''} · {names[r.server]} served
              </span>
              {r.highlight ? <Icon name="star" size="xs" className="text-warning" /> : null}
              <span className="font-semibold text-primary tabular-nums">{formatScore(after)}</span>
            </button>
          )}
          {gap(index)}
        </div>
      ))}
    </div>
  )
}
