import { useEffect, useRef, useState, type ReactNode } from 'react'
import { emptySet, useDemo, type MatchRecord, type SetData, type SetMark, type VideoAsset } from '@/data/demoStore'
import { videoRallyCount } from '@/features/match/matchChecks'
import { deleteTags, moveSet, unmarkSet } from '@/features/tagging/matchOps'
import {
  allowedMarkNumbers,
  clampWing,
  gapsOf,
  lineAction,
  markBounds,
  MIN_SET_S,
  markState,
  setsStartingOn,
  spansOnVideo,
  wingLimits,
  type WingEdge,
} from '@/features/tagging/setMark'
import { formatClock, segmentsOf } from '@/features/tagging/timeline'
import { cn } from '@/helpers/utils'
import { Button, Card, CardTitle, Icon, buttonKindField, buttonKindTextLink } from '@/ui-mine'

type Drag = { setId: number; edge: WingEdge; local: number }

/**
 * One video as a Details card. The bar seeks the shared player. One selected
 * set grows its number and Delete in place. Confirms open here, not in a sheet.
 */
export function TagVideoCard({
  match,
  video,
  index,
  locked,
  active,
  playhead,
  pickedId,
  onMove,
  onRemove,
  onOpen,
  allow,
  onSelect,
  onClear,
  onSeek,
  onScrub,
  onPreview,
  onCommit,
  onHint,
  onAdd,
}: {
  match: MatchRecord
  video: VideoAsset
  index: number
  locked: boolean
  active: boolean
  playhead: number | null
  pickedId: number | null
  onMove: (by: -1 | 1) => void
  onRemove: () => void
  onOpen: (setId: number) => void
  /** False during the moment after Save set, so a resting finger does nothing. */
  allow?: () => boolean
  onSelect: (setId: number, mark: SetMark) => void
  onClear: () => void
  onSeek: (g: number) => void
  onScrub: (g: number) => void
  onPreview: (local: number) => void
  onCommit: (setId: number, edge: WingEdge, local: number, hint: string | null) => void
  onHint: (text: string) => void
  onAdd: () => void
}) {
  const { mutateMatch } = useDemo()
  const [removing, setRemoving] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const many = match.videos.length > 1
  const spans = spansOnVideo(match.videos, match.sets, video.id)
  const gap = gapsOf(video.durationS, spans).some((g) => g.b - g.a >= MIN_SET_S)
  const lines = setsStartingOn(match.sets, video.id)
  const segs = segmentsOf(match.videos)
  const offset = segs.find((s) => s.id === video.id)?.offset ?? 0
  const duration = video.durationS > 0 ? video.durationS : 1
  const tagged = videoRallyCount(match, video.id) > 0
  const editable = !locked

  const clampEdge = (setId: number, edge: WingEdge, local: number) => {
    const limit = wingLimits(match, setId, edge)
    if (!limit) return { local, hint: null as string | null }
    const clamped = clampWing(limit, offset + local)
    return {
      local: Math.min(video.durationS, Math.max(0, clamped.at - offset)),
      hint: clamped.hint,
    }
  }

  const edgeOnThis = (edge: WingEdge, setId: number) => {
    if (!editable || pickedId !== setId) return false
    const s = match.sets.find((x) => x.setId === setId)
    if (!s?.mark) return false
    return edge === 'start' ? s.mark.from.videoId === video.id : s.mark.to.videoId === video.id
  }

  return (
    <Card
      className={cn('space-y-2', active ? 'border-brand-primary' : undefined)}
      data-video-block={video.id}
      data-card-active={active ? '' : undefined}
      data-picked={pickedId ?? undefined}
    >
      <div className="flex h-11 items-center gap-1">
        <CardTitle className="min-w-0 flex-1 truncate text-sm">
          Video {index + 1} · {formatClock(video.durationS)}
        </CardTitle>
        {many ? (
          <>
            {index > 0 ? (
              <button
                type="button"
                className="btn-kind-control btn-kind-square shrink-0 rounded-md text-primary"
                aria-label={`Move video ${index + 1} up`}
                disabled={locked}
                onClick={() => onMove(-1)}
              >
                <Icon name="chevron-up" size="sm" />
              </button>
            ) : null}
            {index < match.videos.length - 1 ? (
              <button
                type="button"
                className="btn-kind-control btn-kind-square shrink-0 rounded-md text-primary"
                aria-label={`Move video ${index + 1} down`}
                disabled={locked}
                onClick={() => onMove(1)}
              >
                <Icon name="chevron-down" size="sm" />
              </button>
            ) : null}
          </>
        ) : null}
        <Button kind="control" variant="ghost" disabled={locked} onClick={() => setRemoving(true)}>
          Remove
        </Button>
      </div>

      {removing ? (
        <ConfirmBox label={`Remove video ${index + 1}`}>
          <p>Remove video {index + 1}?</p>
          {tagged ? <p>Its tags stay but will not play</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button kind="control" onClick={onRemove}>
              Remove
            </Button>
            <Button kind="control" variant="ghost" onClick={() => setRemoving(false)}>
              Cancel
            </Button>
          </div>
        </ConfirmBox>
      ) : null}

      <CardTimeline
        match={match}
        video={video}
        duration={duration}
        offset={offset}
        editable={editable}
        playhead={playhead}
        pickedId={pickedId}
        drag={drag}
        onSelect={onSelect}
        onSeek={onSeek}
        onScrub={onScrub}
        onPreview={onPreview}
        onHint={onHint}
        edgeOnThis={edgeOnThis}
        clampEdge={clampEdge}
        onDrag={setDrag}
        onCommit={(setId, edge, local, stop) => {
          setDrag(null)
          onCommit(setId, edge, local, stop)
        }}
      />

      {lines.length > 0 ? (
        <ul className="space-y-1">
          {lines.map((s) =>
            s.mark ? (
              <SetRow
                key={s.setId}
                match={match}
                set={s}
                mark={s.mark}
                locked={locked}
                selected={pickedId === s.setId}
                onOpen={() => onOpen(s.setId)}
                allow={allow}
                onSelect={() => onSelect(s.setId, s.mark!)}
                onClear={onClear}
                onRelabel={(n) => {
                  if (n === s.setId || !s.mark) return
                  const dest = match.sets.find((x) => x.setId === n) ?? emptySet(n)
                  if (dest.mark) return
                  mutateMatch(match.id, (m) => moveSet(m, s.setId, n))
                  onSelect(n, s.mark)
                }}
                onDeleteTags={() => mutateMatch(match.id, (m) => deleteTags(m, s.setId))}
                onDeleteSet={() => {
                  mutateMatch(match.id, (m) => unmarkSet(deleteTags(m, s.setId), s.setId))
                  onClear()
                }}
              />
            ) : null
          )}
        </ul>
      ) : null}

      {editable && gap ? (
        <Button kind="control" variant="secondary" data-mark-set={video.id} onClick={onAdd}>
          Add set
        </Button>
      ) : null}
    </Card>
  )
}

function SetRow({
  match,
  set: s,
  mark,
  locked,
  selected,
  onOpen,
  allow,
  onSelect,
  onClear,
  onRelabel,
  onDeleteTags,
  onDeleteSet,
}: {
  match: MatchRecord
  set: SetData
  mark: SetMark
  locked: boolean
  selected: boolean
  onOpen: () => void
  allow?: () => boolean
  onSelect: () => void
  onClear: () => void
  onRelabel: (n: number) => void
  onDeleteTags: () => void
  onDeleteSet: () => void
}) {
  const [asking, setAsking] = useState(false)
  const action = lineAction(s)
  const state = markState(s)
  const bounds = markBounds(match.videos, mark)
  const numbers = bounds ? allowedMarkNumbers(match, bounds.start, s.setId) : [s.setId]
  const tagged = s.rallies.length > 0
  const go = () => {
    if (allow && !allow()) return
    onOpen()
  }
  const toggle = () => {
    if (allow && !allow()) return
    if (selected) onClear()
    else onSelect()
  }

  return (
    <li className="space-y-1" data-set-line={s.setId} data-set-state={state} data-set-selected={selected ? '' : undefined}>
      <div className={cn('flex h-11 items-center gap-1 rounded-md px-1', selected && 'bg-brand-primary/10')}>
        {selected && !locked && numbers.length > 1 ? (
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary">
            <button
              type="button"
              className={cn(buttonKindTextLink, 'shrink-0 text-sm font-semibold')}
              data-set-label
              data-pick-set={s.setId}
              onClick={toggle}
            >
              Set
            </button>
            <select
              aria-label={`Set ${s.setId} number`}
              className={cn(buttonKindField, 'rounded-md border border-border bg-bg-card px-2 text-sm text-primary')}
              value={s.setId}
              onChange={(e) => onRelabel(Number(e.target.value))}
            >
              {numbers.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            type="button"
            className={cn(buttonKindTextLink, 'min-w-0 flex-1 truncate text-left text-sm font-semibold')}
            data-set-label
            data-pick-set={s.setId}
            onClick={toggle}
          >
            Set {s.setId}
          </button>
        )}
        {selected && !locked ? (
          <Button kind="control" variant="ghost" data-delete-set={s.setId} onClick={() => setAsking(true)}>
            Delete
          </Button>
        ) : null}
        {action ? (
          <Button
            kind="control"
            variant="secondary"
            className="shrink-0"
            disabled={locked && action !== 'Open'}
            data-set-action={action}
            onClick={go}
          >
            {action}
          </Button>
        ) : null}
      </div>
      {asking && selected ? (
        <ConfirmBox label={tagged ? `Delete set ${s.setId} or only its tags` : `Delete set ${s.setId}`}>
          <p>{tagged ? `Delete set ${s.setId} or only its tags?` : `Delete set ${s.setId}?`}</p>
          <div className="flex flex-wrap gap-2">
            {tagged ? (
              <Button
                kind="control"
                data-delete-tags={s.setId}
                onClick={() => {
                  onDeleteTags()
                  setAsking(false)
                }}
              >
                Delete tags
              </Button>
            ) : null}
            <Button kind="control" onClick={onDeleteSet}>
              {tagged ? 'Delete set' : 'Delete'}
            </Button>
            <Button kind="control" variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </ConfirmBox>
      ) : null}
    </li>
  )
}

function ConfirmBox({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])
  return (
    <div
      ref={ref}
      className="space-y-2 scroll-mb-16 rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary md:scroll-mb-4"
      role="alertdialog"
      aria-label={label}
    >
      {children}
    </div>
  )
}

function CardTimeline({
  match,
  video,
  duration,
  offset,
  editable,
  playhead,
  pickedId,
  drag,
  onSelect,
  onSeek,
  onScrub,
  onPreview,
  onHint,
  edgeOnThis,
  clampEdge,
  onDrag,
  onCommit,
}: {
  match: MatchRecord
  video: VideoAsset
  duration: number
  offset: number
  editable: boolean
  playhead: number | null
  pickedId: number | null
  drag: Drag | null
  onSelect: (setId: number, mark: SetMark) => void
  onSeek: (g: number) => void
  onScrub: (g: number) => void
  onPreview: (local: number) => void
  onHint: (text: string) => void
  edgeOnThis: (edge: WingEdge, setId: number) => boolean
  clampEdge: (setId: number, edge: WingEdge, local: number) => { local: number; hint: string | null }
  onDrag: (drag: Drag | null) => void
  onCommit: (setId: number, edge: WingEdge, local: number, hint: string | null) => void
}) {
  const spans = spansOnVideo(match.videos, match.sets, video.id)
  const localOf = (node: HTMLElement, x: number) => {
    const box = node.getBoundingClientRect()
    const p = box.width > 0 ? (x - box.left) / box.width : 0
    return Math.min(duration, Math.max(0, p * duration))
  }

  return (
    <div
      className="card-time"
      data-card-time={video.id}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest('[data-wing]')) return
        const node = e.currentTarget
        const x0 = e.clientX
        const y0 = e.clientY
        const down = e.target as HTMLElement
        onSeek(offset + localOf(node, e.clientX))
        let moved = false
        let cancelled = false
        const finish = () => {
          node.removeEventListener('pointermove', move)
          node.removeEventListener('pointerup', up)
          node.removeEventListener('pointercancel', up)
        }
        const move = (ev: PointerEvent) => {
          const dx = ev.clientX - x0
          const dy = ev.clientY - y0
          if (!moved && !cancelled) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
            if (Math.abs(dy) >= Math.abs(dx)) {
              cancelled = true
              finish()
              return
            }
            moved = true
            node.setPointerCapture(ev.pointerId)
          }
          onScrub(offset + localOf(node, ev.clientX))
        }
        const up = () => {
          const was = moved
          const skip = cancelled
          finish()
          if (was || skip || !editable) return
          const span = down.closest('[data-span]')
          if (!span) return
          const id = Number(span.getAttribute('data-span'))
          const set = match.sets.find((s) => s.setId === id)
          if (set?.mark) onSelect(id, set.mark)
        }
        node.addEventListener('pointermove', move)
        node.addEventListener('pointerup', up)
        node.addEventListener('pointercancel', up)
      }}
    >
      <div className="card-time-track">
        {spans.map((span) => {
          const set = match.sets.find((s) => s.setId === span.setId)
          if (!set?.mark) return null
          let a = span.a
          let b = span.b
          if (drag && drag.setId === span.setId) {
            if (drag.edge === 'start' && set.mark.from.videoId === video.id) a = drag.local
            if (drag.edge === 'end' && set.mark.to.videoId === video.id) b = drag.local
          }
          const fromHere = set.mark.from.videoId === video.id
          const toHere = set.mark.to.videoId === video.id
          const cut = !fromHere && !toHere ? 'both' : !fromHere ? 'start' : !toHere ? 'end' : undefined
          const state = markState(set)
          const fromN = match.videos.findIndex((v) => v.id === set.mark?.from.videoId) + 1
          const toN = match.videos.findIndex((v) => v.id === set.mark?.to.videoId) + 1
          const label =
            !fromHere && fromN > 0
              ? `S${set.setId} from video ${fromN}`
              : !toHere && toN > 0
                ? `S${set.setId} to video ${toN}`
                : `S${set.setId}`
          const lo = Math.min(a, b)
          const hi = Math.max(a, b)
          const ticks =
            state === 'tagging' || state === 'saved'
              ? set.rallies.flatMap((r) => {
                  if (r.videoId !== video.id) return []
                  const t = r.contacts?.[0] ?? r.start
                  return t >= lo - 0.05 && t <= hi + 0.05 ? [t] : []
                })
              : []
          return (
            <span
              key={span.setId}
              className="card-span"
              data-span={span.setId}
              data-a={lo}
              data-state={state}
              data-cut={cut}
              style={{ left: `${(lo / duration) * 100}%`, width: `${Math.max(((hi - lo) / duration) * 100, 0.8)}%` }}
            >
              {label}
              {ticks.map((t, i) => (
                <span key={i} className="card-tick" style={{ left: `${((t - lo) / Math.max(0.05, hi - lo)) * 100}%` }} />
              ))}
            </span>
          )
        })}
        {playhead !== null ? <span className="card-playhead" data-playhead style={{ left: `${(playhead / duration) * 100}%` }} /> : null}
      </div>
      {pickedId !== null
        ? (['start', 'end'] as const).map((edge) => {
            if (!edgeOnThis(edge, pickedId)) return null
            const set = match.sets.find((s) => s.setId === pickedId)
            if (!set?.mark) return null
            const saved = edge === 'start' ? set.mark.from.t : set.mark.to.t
            const local = drag && drag.setId === pickedId && drag.edge === edge ? drag.local : saved
            const dragging = Boolean(drag && drag.setId === pickedId && drag.edge === edge)
            return (
              <div
                key={edge}
                className="card-wing"
                data-wing={edge}
                style={{ left: `${(local / duration) * 100}%` }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  e.stopPropagation()
                  const wing = e.currentTarget
                  const box = wing.parentElement
                  if (!box) return
                  wing.setPointerCapture(e.pointerId)
                  const x0 = e.clientX
                  let started = false
                  let last = local
                  let stop: string | null = null
                  const finish = () => {
                    wing.removeEventListener('pointermove', move)
                    wing.removeEventListener('pointerup', up)
                    wing.removeEventListener('pointercancel', up)
                  }
                  const move = (ev: PointerEvent) => {
                    if (!started) {
                      if (Math.abs(ev.clientX - x0) < 6) return
                      started = true
                    }
                    const asked = localOf(box, ev.clientX)
                    const clamped = clampEdge(pickedId, edge, asked)
                    last = clamped.local
                    stop = clamped.hint
                    if (clamped.hint) onHint(clamped.hint)
                    onDrag({ setId: pickedId, edge, local: last })
                    onPreview(last)
                  }
                  const up = () => {
                    const did = started
                    finish()
                    if (!did) return
                    onCommit(pickedId, edge, last, stop)
                  }
                  wing.addEventListener('pointermove', move)
                  wing.addEventListener('pointerup', up)
                  wing.addEventListener('pointercancel', up)
                }}
              >
                <span className="card-wing-grip" />
                {dragging ? (
                  <span className="card-wing-readout" data-wing-readout={edge}>
                    {formatClock(local)}
                  </span>
                ) : null}
              </div>
            )
          })
        : null}
    </div>
  )
}
