import type { ReactNode } from 'react'
import { Button, Icon } from '@/ui-mine'
import { formatScore, type SetData } from '@/data/demoStore'
import { cn } from '@/helpers/utils'
import { faLine } from './bestFlow'
import { bandLine, serveBands, type RallyMark, type ServeBand } from './continuity'
import { deletedOf } from './matchOps'
import { servesText, type MarkKind, type RallyData, type Side } from './rally'
import { ZERO, addPoint, type Points } from './score'
import { firstContactG, insertIndex, type Segment } from './timeline'

export type RallyListActions = {
  /** Tag a rally in the gap in front of the rally at `index`. */
  canAddRally: (index: number) => boolean
  onAddRally: (index: number) => void
  onReview: (band: ServeBand) => void
  /** Play the gaps between saved rallies, longest first. */
  onCheckGaps: () => void
  /** Play the one gap in front of the rally at `index`. */
  onCheckGap: (index: number) => void
  /** Set while a rally is open and not saved. Review serves and Check gaps stay shut. */
  hold: string | null
  onLeave: (rallyId: string, kind: MarkKind) => void
  onRestore: (rallyId: string) => void
  onDeletePoint: (rallyId: string) => void
}

const small = 'px-2.5 text-xs'

/**
 * Saved rallies, newest first, in video order. A serve break is one band for
 * the whole stretch, not a mark on one rally. A long gap is a quiet hint.
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
  onCopyTimings,
}: {
  set: SetData
  names: Record<Side, string>
  segs: Segment[]
  marks: RallyMark[]
  scoreMark: { kind: 'past' | 'differs'; tagged: Points; entered: Points } | null
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
  /** Copies the side log. Shown only when the address has a flow. */
  onCopyTimings?: () => void
}) {
  let running = ZERO
  const rows = set.rallies.map((r, index) => {
    running = addPoint(running, r.winner)
    return { r, index, after: running }
  })
  const deleted = deletedOf(set).map((r) => {
    const g = firstContactG(segs, r)
    return { r, at: g === null ? set.rallies.length : insertIndex(segs, set.rallies, g) }
  })
  const bands = serveBands(set.rallies, set.firstServer)
  const dot = (side: Side) => cn('h-2 w-2 rounded-full shrink-0', side === 'me' ? 'bg-side-me' : 'bg-side-them')
  const n = set.rallies.length

  /** What sits in the gap in front of rally `index`: the band, a hint, deleted rallies. */
  const gap = (index: number): ReactNode => {
    const band = bands.find((b) => b.to === index)
    const hint = marks.find((m) => m.kind === 'gap' && m.index === index)
    const gone = deleted.filter((d) => d.at === index)
    if (!band && !hint && gone.length === 0 && addingAt !== index) return null
    return (
      <div key={`gap-${index}`} className="space-y-1" data-gap={index}>
        {band ? (
          <div
            role="status"
            data-serve-band
            className="rounded-md border border-warning bg-warning/15 px-2 py-1.5 space-y-1.5"
          >
            <p className="text-xs font-semibold text-primary">{bandLine(band, set.rallies, set.firstServer)}</p>
            {actions ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  kind="control"
                  variant="secondary"
                  disabled={Boolean(actions.hold)}
                  onClick={() => actions.onReview(band)}
                >
                  Review serves
                </Button>
                <Button
                  kind="control"
                  variant="ghost"
                  onClick={() => {
                    for (const index of band.breaks) actions.onLeave(set.rallies[index].id, 'serve')
                  }}
                >
                  Leave it
                </Button>
                {actions.hold ? (
                  <p className="text-xs text-muted" data-review-hold>
                    {actions.hold}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {hint && hint.kind === 'gap' ? (
          <div
            data-gap-hint
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-border px-2 py-1.5"
          >
            <p className="text-xs text-muted">{Math.round(hint.seconds)}s before this rally</p>
            {actions ? (
              <Button
                kind="control"
                variant="ghost"
                disabled={Boolean(actions.hold)}
                onClick={() => actions.onCheckGap(hint.index)}
              >
                Check
              </Button>
            ) : null}
          </div>
        ) : null}
        {addingAt === index ? (
          <p className="rounded-md border border-dashed border-brand-primary px-2 py-1.5 text-xs font-semibold text-primary" role="status">
            Adding a rally here
          </p>
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
          {bands.length > 0 ? ` · ${bands.length} to check` : ''}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {onCopyTimings ? (
            <Button kind="control" variant="ghost" data-copy-timings onClick={onCopyTimings}>
              Copy timings
            </Button>
          ) : null}
          {actions && n > 1 ? (
            <Button kind="control" variant="ghost" disabled={Boolean(actions.hold)} onClick={actions.onCheckGaps}>
              Check gaps
            </Button>
          ) : null}
          {actions?.hold ? (
            <p className="text-xs text-muted" data-review-hold>
              {actions.hold}
            </p>
          ) : null}
          {finish === 'ok' ? (
            <Button size="sm" variant="ghost" onClick={onFinish}>
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
              className="btn-kind-control w-full flex items-center gap-2 rounded-md border border-border bg-bg-card px-2 text-xs"
            >
              <span className="w-5 text-center tabular-nums text-muted">{index + 1}</span>
              <span className={dot(r.winner)} />
              <span className="font-semibold text-primary w-16 truncate">{names[r.winner]}</span>
              <span className="flex-1 min-w-0 truncate text-muted">Point, no video · {names[r.server]} served</span>
              {actions ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(small, 'btn-kind-square shrink-0')}
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
              className={cn(
                'btn-kind-control w-full flex items-center gap-2 rounded-md border px-2 text-left text-xs disabled:opacity-60',
                editingId === r.id
                  ? 'border-brand-primary bg-brand-primary-muted'
                  : 'border-border bg-bg-card hover:bg-bg-elevated'
              )}
            >
              <span className="w-5 text-center tabular-nums text-muted">{index + 1}</span>
              <span className={dot(r.winner)} />
              <span className="font-semibold text-primary w-16 truncate">{names[r.winner]}</span>
              <span className="flex-1 min-w-0 truncate text-muted">
                {r.contacts.length} {r.contacts.length === 1 ? 'shot' : 'shots'}
                {r.idea?.result ?? r.ending ? ` · ${r.idea?.result ?? r.ending}` : ''}
                {r.idea?.check ? ` · ${r.idea.check}` : ''}
                {faLine(r) ? ` · ${faLine(r)}` : ''} · {names[r.server]} served
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
