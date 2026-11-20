import { useState } from 'react'
import {
  emptySet,
  formatScore,
  taggedScore,
  useDemo,
  type MatchRecord,
  type SetData,
  type VideoAsset,
} from '@/data/demoStore'
import { deleteTags, moveSet, saveMark, unmarkSet } from '@/features/tagging/matchOps'
import {
  allowedMarkNumbers,
  clampWing,
  gapsOf,
  lineAction,
  markBounds,
  markCrosses,
  MIN_SET_S,
  markState,
  setsStartingOn,
  spanBack,
  spanOnto,
  spansOnVideo,
  videoStatus,
  wingLimits,
  type WingEdge,
} from '@/features/tagging/setMark'
import { formatClock, segmentsOf } from '@/features/tagging/timeline'
import { videoRallyCount } from '@/features/match/matchChecks'
import { cn } from '@/helpers/utils'
import { Button, buttonKindTextLink } from '@/ui-mine'

type Drag = { setId: number; edge: WingEdge; local: number }

function setRowLabel(match: MatchRecord, s: SetData): string {
  const state = markState(s)
  const score = taggedScore(s)
  const head =
    (state === 'saved' || state === 'tagging') && score
      ? `Set ${s.setId} · ${formatScore(score)}`
      : `Set ${s.setId}`
  const mark = s.mark
  if (!markCrosses(s) || !mark) return head
  const a = match.videos.findIndex((v) => v.id === mark.from.videoId) + 1
  const b = match.videos.findIndex((v) => v.id === mark.to.videoId) + 1
  return a > 0 && b > 0 ? `${head} · videos ${a} and ${b}` : head
}

/**
 * One video card. The timeline seeks the shared player. The picked set edits here.
 */
export function TagVideoCard({
  match,
  video,
  index,
  locked,
  running,
  editable,
  active,
  playhead,
  pickedId,
  editHere,
  lastWing,
  hint,
  menuOpen,
  asking,
  onToggleMenu,
  onMove,
  onAskRemove,
  onRemove,
  onCancelRemove,
  onOpen,
  onUndo,
  onPick,
  onUnpick,
  onSeek,
  onScrub,
  onPreview,
  onCommit,
  onHint,
  onNudgeStart,
  onNudgeEnd,
  onEditSets,
  onAdd,
  onRelabelled,
  onSpanned,
}: {
  match: MatchRecord
  video: VideoAsset
  index: number
  locked: boolean
  running: boolean
  editable: boolean
  active: boolean
  playhead: number | null
  pickedId: number | null
  /** The edit area belongs to this card. Wings still show wherever the edge sits. */
  editHere: boolean
  lastWing: WingEdge
  hint: string | null
  menuOpen: boolean
  asking: boolean
  onToggleMenu: () => void
  onMove: (by: -1 | 1) => void
  onAskRemove: () => void
  onRemove: () => void
  onCancelRemove: () => void
  onOpen: (setId: number) => void
  onUndo: (before: SetData, text: string, also?: SetData) => void
  onPick: (setId: number) => void
  onUnpick: () => void
  onSeek: (g: number) => void
  onScrub: (g: number) => void
  onPreview: (local: number) => void
  onCommit: (setId: number, edge: WingEdge, local: number, hint: string | null) => void
  onHint: (text: string) => void
  onNudgeStart: (dir: -1 | 1) => void
  onNudgeEnd: () => void
  onEditSets: () => void
  onAdd: () => void
  onRelabelled: (setId: number) => void
  /** The end moved onto another video. Pick the set on that card. */
  onSpanned: (setId: number, videoId: string) => void
}) {
  const { mutateMatch } = useDemo()
  const [archiveNote, setArchiveNote] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const many = match.videos.length > 1
  const spans = spansOnVideo(match.videos, match.sets, video.id)
  const gap = gapsOf(video.durationS, spans).some((g) => g.b - g.a >= MIN_SET_S)
  const lines = setsStartingOn(match.sets, video.id)
  const status = videoStatus(match, video.id)
  const segs = segmentsOf(match.videos)
  const offset = segs.find((s) => s.id === video.id)?.offset ?? 0
  const duration = video.durationS > 0 ? video.durationS : 1
  const picked = pickedId !== null ? (match.sets.find((s) => s.setId === pickedId) ?? null) : null

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

  const timeOf = (edge: WingEdge) => {
    if (!picked?.mark) return null
    if (edge === 'start' && picked.mark.from.videoId !== video.id) return null
    if (edge === 'end' && picked.mark.to.videoId !== video.id) return null
    if (drag && drag.setId === picked.setId && drag.edge === edge) return drag.local
    return edge === 'start' ? picked.mark.from.t : picked.mark.to.t
  }
  const startT = editable && picked ? timeOf('start') : null
  const endT = editable && picked ? timeOf('end') : null
  const endHere = Boolean(editable && picked?.mark && picked.mark.to.videoId === video.id)
  const onto = endHere && picked ? spanOnto(match, picked.setId) : null
  const back = endHere && picked && !onto ? spanBack(match, picked.setId) : null
  const spanChip = onto
    ? { mark: onto, label: `Runs onto video ${match.videos.findIndex((v) => v.id === onto.to.videoId) + 1}`, kind: 'onto' as const }
    : back
      ? { mark: back, label: `End on video ${match.videos.findIndex((v) => v.id === back.to.videoId) + 1}`, kind: 'back' as const }
      : null

  return (
    <section
      className={cn(
        'space-y-2 rounded-lg border bg-bg-card px-3 py-2',
        active ? 'border-brand-primary' : 'border-border'
      )}
      data-video-block={video.id}
      data-card-active={active ? '' : undefined}
      data-picked={editHere && editable ? (pickedId ?? undefined) : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-primary">
          Video {index + 1} · {formatClock(video.durationS)}
        </h2>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-semibold text-primary"
          aria-expanded={menuOpen}
          aria-label={`Menu for video ${index + 1}`}
          onClick={onToggleMenu}
        >
          Menu
        </button>
      </div>

      <p className="text-sm text-primary" data-video-status={video.id}>
        {status}
      </p>

      {menuOpen ? (
        <div className="flex flex-wrap gap-2" data-video-menu={video.id}>
          {many ? (
            <>
              <Button kind="control" variant="secondary" disabled={running || index === 0} onClick={() => onMove(-1)}>
                Move up
              </Button>
              <Button
                kind="control"
                variant="secondary"
                disabled={running || index === match.videos.length - 1}
                onClick={() => onMove(1)}
              >
                Move down
              </Button>
            </>
          ) : null}
          <Button kind="control" variant="secondary" disabled={running} onClick={onAskRemove}>
            Remove
          </Button>
        </div>
      ) : null}

      {asking ? (
        <div
          className="space-y-1.5 rounded-md border border-warning bg-warning/15 px-2 py-1.5 text-xs text-primary"
          role="alertdialog"
          aria-label={`Remove video ${index + 1}`}
        >
          <p>
            {videoRallyCount(match, video.id)} tagged rallies use this video. Tags and scores stay, but they can no
            longer be played.
          </p>
          {video.archived ? <p className="font-semibold">This cannot be undone.</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button kind="control" onClick={onRemove}>
              {video.archived ? 'Remove the only copy' : 'Remove video'}
            </Button>
            <Button kind="control" variant="ghost" onClick={onCancelRemove}>
              Cancel
            </Button>
          </div>
        </div>
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
        hint={hint}
        onPick={onPick}
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

      {startT !== null || endT !== null ? (
        <div className="relative h-5 text-xs tabular-nums text-muted">
          {startT !== null ? (
            <span className="absolute -translate-x-1/2" style={{ left: `${(startT / duration) * 100}%` }} data-wing-time="start">
              {formatClock(startT)}
            </span>
          ) : null}
          {endT !== null ? (
            <span className="absolute -translate-x-1/2" style={{ left: `${(endT / duration) * 100}%` }} data-wing-time="end">
              {formatClock(endT)}
            </span>
          ) : null}
        </div>
      ) : null}

      {spanChip && picked ? (
        <Button
          kind="control"
          variant="secondary"
          data-span-onto={spanChip.kind === 'onto' ? picked.setId : undefined}
          data-span-back={spanChip.kind === 'back' ? picked.setId : undefined}
          onClick={() => {
            onUndo(picked, `Set ${picked.setId} end moved`)
            mutateMatch(match.id, (m) => saveMark(m, picked.setId, spanChip.mark))
            onSpanned(picked.setId, spanChip.mark.to.videoId)
          }}
        >
          {spanChip.label}
        </Button>
      ) : null}

      {editHere && editable && picked?.mark ? (
        <SetEdit
          match={match}
          set={picked}
          lastWing={lastWing}
          onUnpick={onUnpick}
          onNudgeStart={onNudgeStart}
          onNudgeEnd={onNudgeEnd}
          onRelabel={(n) => {
            if (n === picked.setId) return
            const dest = match.sets.find((x) => x.setId === n) ?? emptySet(n)
            onUndo(picked, `Set ${picked.setId} is now set ${n}`, dest)
            mutateMatch(match.id, (m) => moveSet(m, picked.setId, n))
            onRelabelled(n)
          }}
          onComplete={(complete) => {
            if (!picked.mark || picked.rallies.length > 0 || picked.mark.complete === complete) return
            onUndo(picked, complete ? `Set ${picked.setId} marked complete` : `Set ${picked.setId} part filmed`)
            mutateMatch(match.id, (m) => saveMark(m, picked.setId, { ...picked.mark!, complete }))
          }}
          onDelete={() => {
            if (picked.rallies.length > 0) return
            onUndo(picked, `Set ${picked.setId} deleted`)
            mutateMatch(match.id, (m) => unmarkSet(m, picked.setId))
            onUnpick()
          }}
        />
      ) : null}

      {lines.length > 0 ? (
        <ul className="space-y-1">
          {lines.map((s) => (
            <SetLine
              key={s.setId}
              match={match}
              set={s}
              locked={locked}
              editable={editable}
              onOpen={() => onOpen(s.setId)}
              onPick={() => onPick(s.setId)}
              onUndo={onUndo}
            />
          ))}
        </ul>
      ) : null}

      {editable && gap ? (
        <Button kind="control" variant="secondary" data-mark-set={video.id} onClick={onAdd}>
          Add set
        </Button>
      ) : null}

      {status === 'Done' && !locked ? (
        <div className="flex flex-wrap items-center gap-2">
          {editable ? null : (
            <Button kind="control" variant="secondary" data-edit-sets={video.id} onClick={onEditSets}>
              Edit sets
            </Button>
          )}
          <Button kind="control" variant="secondary" data-archive-video={video.id} onClick={() => setArchiveNote(true)}>
            Archive video
          </Button>
        </div>
      ) : null}
      {archiveNote ? (
        <p className="text-sm text-muted" role="status">
          Archive comes in a later build.
        </p>
      ) : null}
    </section>
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
  hint,
  onPick,
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
  hint: string | null
  onPick: (setId: number) => void
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
        let moved = false
        const finish = () => {
          node.removeEventListener('pointermove', move)
          node.removeEventListener('pointerup', up)
          node.removeEventListener('pointercancel', up)
        }
        const move = (ev: PointerEvent) => {
          const dx = ev.clientX - x0
          const dy = ev.clientY - y0
          if (!moved) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
            if (Math.abs(dy) >= Math.abs(dx) || down.closest('[data-span]')) {
              finish()
              return
            }
            moved = true
            node.setPointerCapture(ev.pointerId)
          }
          onScrub(offset + localOf(node, ev.clientX))
        }
        const up = (ev: PointerEvent) => {
          const was = moved
          finish()
          if (was) return
          const span = down.closest('[data-span]')
          if (span) {
            const id = Number(span.getAttribute('data-span'))
            const start = Number(span.getAttribute('data-a') || 0)
            if (editable) onPick(id)
            onSeek(offset + start)
            return
          }
          onSeek(offset + localOf(node, ev.clientX))
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
                <span
                  key={i}
                  className="card-tick"
                  style={{ left: `${((t - lo) / Math.max(0.05, hi - lo)) * 100}%` }}
                />
              ))}
            </span>
          )
        })}
        {playhead !== null ? (
          <span className="card-playhead" data-playhead style={{ left: `${(playhead / duration) * 100}%` }} />
        ) : null}
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
                data-flash={dragging && hint ? '' : undefined}
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

function SetEdit({
  match,
  set: s,
  lastWing,
  onUnpick,
  onNudgeStart,
  onNudgeEnd,
  onRelabel,
  onComplete,
  onDelete,
}: {
  match: MatchRecord
  set: SetData
  lastWing: WingEdge
  onUnpick: () => void
  onNudgeStart: (dir: -1 | 1) => void
  onNudgeEnd: () => void
  onRelabel: (n: number) => void
  onComplete: (complete: boolean) => void
  onDelete: () => void
}) {
  const bounds = s.mark ? markBounds(match.videos, s.mark) : null
  const numbers = bounds ? allowedMarkNumbers(match, bounds.start, s.setId) : []
  const tagged = s.rallies.length > 0
  const point = s.mark ? (lastWing === 'start' ? s.mark.from : s.mark.to) : null
  const hold = (dir: -1 | 1) => (e: { preventDefault: () => void }) => {
    e.preventDefault()
    onNudgeStart(dir)
    const stop = () => {
      onNudgeEnd()
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }
  return (
    <div className="space-y-2" data-edit-area={s.setId}>
      <div className="flex flex-wrap items-center gap-1" data-number-chips={s.setId}>
        {numbers.map((n) => (
          <Button
            key={n}
            kind="control"
            variant={n === s.setId ? 'primary' : 'secondary'}
            aria-pressed={n === s.setId}
            data-set-chip={n}
            onClick={() => onRelabel(n)}
          >
            {n}
          </Button>
        ))}
      </div>
      {tagged ? (
        <p className="text-sm text-muted" data-complete-fixed={s.setId}>
          Complete
        </p>
      ) : (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Complete or part filmed">
          <Button
            kind="control"
            variant={s.mark?.complete !== false ? 'primary' : 'secondary'}
            data-complete-switch={s.setId}
            onClick={() => onComplete(true)}
          >
            Complete
          </Button>
          <Button
            kind="control"
            variant={s.mark?.complete === false ? 'primary' : 'secondary'}
            data-part-switch={s.setId}
            onClick={() => onComplete(false)}
          >
            Part filmed
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-primary" data-nudge-edge>
          {lastWing === 'start' ? 'Start' : 'End'}
        </span>
        <Button kind="control" variant="secondary" data-nudge="-1" onPointerDown={hold(-1)}>
          -1 s
        </Button>
        <span className="text-sm tabular-nums text-primary" data-nudge-time>
          {point ? formatClock(point.t) : ''}
        </span>
        <Button kind="control" variant="secondary" data-nudge="1" onPointerDown={hold(1)}>
          +1 s
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button kind="control" variant="secondary" disabled={tagged} data-delete-set={s.setId} onClick={onDelete}>
          {tagged ? 'Delete the tags first' : 'Delete set'}
        </Button>
        <Button kind="control" variant="secondary" data-edit-done={s.setId} onClick={onUnpick}>
          Done
        </Button>
      </div>
    </div>
  )
}

function SetLine({
  match,
  set: s,
  locked,
  editable,
  onOpen,
  onPick,
  onUndo,
}: {
  match: MatchRecord
  set: SetData
  locked: boolean
  editable: boolean
  onOpen: () => void
  onPick: () => void
  onUndo: (before: SetData, text: string, also?: SetData) => void
}) {
  const { mutateMatch } = useDemo()
  const [menu, setMenu] = useState(false)
  const action = lineAction(s)
  const state = markState(s)
  const canDelete = state === 'tagging' || state === 'saved'
  const label = setRowLabel(match, s)
  return (
    <li className="space-y-1" data-set-line={s.setId} data-set-state={state}>
      <div className="flex items-center justify-between gap-2">
        {editable ? (
          <button
            type="button"
            className={cn(buttonKindTextLink, 'min-w-0 max-w-full truncate text-left text-sm text-primary')}
            data-set-label
            data-pick-set={s.setId}
            onClick={onPick}
          >
            {label}
          </button>
        ) : (
          <p className="min-w-0 text-sm text-primary" data-set-label>
            {label}
          </p>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {state === 'part' ? (
            <span className="px-1 text-sm text-muted" data-part-filmed={s.setId}>
              Part filmed
            </span>
          ) : action ? (
            <Button
              kind="control"
              variant="secondary"
              disabled={locked && action !== 'Open'}
              data-set-action={action}
              onClick={onOpen}
            >
              {action}
            </Button>
          ) : null}
          {!locked && canDelete ? (
            <Button
              kind="control"
              variant="ghost"
              aria-expanded={menu}
              data-set-menu-button={s.setId}
              onClick={() => setMenu((open) => !open)}
            >
              Menu
            </Button>
          ) : null}
        </span>
      </div>
      {menu && !locked && canDelete ? (
        <div className="flex flex-wrap gap-1" data-set-menu={s.setId}>
          <Button
            kind="control"
            variant="secondary"
            data-delete-tags={s.setId}
            onClick={() => {
              onUndo(s, `Set ${s.setId} tags deleted`)
              mutateMatch(match.id, (m) => deleteTags(m, s.setId))
              setMenu(false)
            }}
          >
            Delete tags
          </Button>
        </div>
      ) : null}
    </li>
  )
}
