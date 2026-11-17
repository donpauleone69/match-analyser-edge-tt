import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Card, CardTitle, Icon } from '@/ui-mine'
import { WfBadge } from '@/layout/Wireframe'
import {
  derivePhase,
  formatSize,
  useDemo,
  type MatchRecord,
  type VideoAsset,
} from '@/data/demoStore'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { ARCHIVE_STEPS, startArchive, useArchiveStep } from '@/features/match/archiveJobs'
import { videoRallyCount } from '@/features/match/matchChecks'
import { cn } from '@/helpers/utils'

const UNDO_MS = 6000

function rallies(n: number) {
  return `${n} tagged ${n === 1 ? 'rally' : 'rallies'}`
}

function ConfirmBox({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])
  return (
    <div ref={ref} className="space-y-1.5 rounded-md border border-warning bg-warning/15 px-2 py-1.5 text-xs text-primary scroll-mb-16" role="alertdialog" aria-label={label}>
      {children}
    </div>
  )
}

function RemoveVideoConfirm({
  video,
  uses,
  onRemove,
  onCancel,
}: {
  video: VideoAsset
  uses: number
  onRemove: () => void
  onCancel: () => void
}) {
  return (
    <ConfirmBox label={`Remove ${video.fileName}`}>
      {video.archived ? (
        <>
          <p>
            This is the only copy. The original was removed when it was archived.
            {uses > 0 ? ` ${rallies(uses)} can never be played or shown in reels again.` : ''}
          </p>
          <p className="font-semibold">This cannot be undone.</p>
        </>
      ) : (
        <p>
          {rallies(uses)} {uses === 1 ? 'uses' : 'use'} this video. Tags and scores stay, but{' '}
          {uses === 1 ? 'it' : 'they'} can no longer be played or shown in reels.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button kind="control" onClick={onRemove}>
          {video.archived ? 'Remove the only copy' : 'Remove video'}
        </Button>
        <Button kind="control" variant="ghost" onClick={onCancel}>
          {video.archived ? 'Keep it' : 'Cancel'}
        </Button>
      </div>
    </ConfirmBox>
  )
}

/** Ordered videos. Archive, reorder, remove and undo. One line each so Tag stays short. */
export function VideosCard({ match }: { match: MatchRecord }) {
  const { moveVideo, removeVideo, mutateMatch } = useDemo()
  const phase = derivePhase(match)
  const many = match.videos.length > 1
  const anyOriginal = match.videos.some((v) => !v.archived)
  const archiveStep = useArchiveStep(match.id)
  const running = archiveStep !== null
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [asking, setAsking] = useState<string | null>(null)
  const [removed, setRemoved] = useState<{ video: VideoAsset; index: number } | null>(null)

  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [removed])

  const remove = (video: VideoAsset, index: number, undoable: boolean) => {
    removeVideo(match.id, video.id)
    setAsking(null)
    setRemoved(undoable ? { video, index } : null)
  }

  const onRemove = (video: VideoAsset, index: number) => {
    if (video.archived || videoRallyCount(match, video.id) > 0) setAsking(video.id)
    else remove(video, index, true)
  }

  const undoRemove = () => {
    if (!removed) return
    const { video, index } = removed
    mutateMatch(match.id, (m) => {
      if (m.videos.some((v) => v.id === video.id)) return m
      const videos = [...m.videos]
      videos.splice(Math.min(index, videos.length), 0, video)
      return { ...m, videos }
    })
    setRemoved(null)
  }

  return (
    <Card className="space-y-2" data-videos>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="film" size="sm" className="text-brand" />
          <CardTitle>Videos</CardTitle>
        </div>
        <AddVideoChoice matchId={match.id} disabled={running} />
      </div>

      {match.videos.length === 0 ? (
        <p className="text-sm text-muted">No video yet. Add the match video to start tagging.</p>
      ) : null}

      {removed ? (
        <p className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-2 py-1 text-sm text-primary" role="status">
          <span className="min-w-0 truncate">Removed {removed.video.fileName}</span>
          <Button kind="control" variant="secondary" onClick={undoRemove}>
            Undo
          </Button>
        </p>
      ) : null}

      {match.videos.length > 0 ? (
        <ol className="space-y-1">
          {match.videos.map((v, i) => (
            <li key={v.id} className="rounded-md border border-border bg-bg-card px-2 py-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted tabular-nums">{i + 1}</span>
                <p className="min-w-0 flex-1 truncate text-sm text-primary">{v.fileName}</p>
                <WfBadge>{v.archived ? 'Archived' : 'Original'}</WfBadge>
                <span className="shrink-0 text-[10px] text-muted">{formatSize(v.sizeMb)}</span>
                {many ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Move ${v.fileName} up`}
                      disabled={running || i === 0}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-primary disabled:opacity-40"
                      onClick={() => moveVideo(match.id, v.id, -1)}
                    >
                      <Icon name="chevron-up" size="xs" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${v.fileName} down`}
                      disabled={running || i === match.videos.length - 1}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-primary disabled:opacity-40"
                      onClick={() => moveVideo(match.id, v.id, 1)}
                    >
                      <Icon name="chevron-down" size="xs" />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={cn('shrink-0 text-xs font-semibold text-primary disabled:opacity-40')}
                  disabled={running || asking === v.id}
                  onClick={() => onRemove(v, i)}
                >
                  Remove
                </button>
              </div>
              {asking === v.id ? (
                <RemoveVideoConfirm
                  video={v}
                  uses={videoRallyCount(match, v.id)}
                  onRemove={() => remove(v, i, false)}
                  onCancel={() => setAsking(null)}
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {running ? (
        <div className="space-y-1" role="status">
          <p className="text-xs text-primary">
            {ARCHIVE_STEPS[archiveStep]}
            <span className="text-muted"> · step {archiveStep + 1} of {ARCHIVE_STEPS.length}</span>
          </p>
          <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full bg-brand-primary transition-all duration-500"
              style={{ width: `${((archiveStep + 1) / ARCHIVE_STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted">Carries on if you leave this page.</p>
        </div>
      ) : match.videos.length === 0 ? null : !anyOriginal ? (
        <p className="text-xs text-muted">Tags and reels use the archived copy.</p>
      ) : phase !== 'complete' ? (
        <p className="text-xs text-muted">Archive comes once tagging is finished.</p>
      ) : !confirmArchive ? (
        <Button kind="control" variant="secondary" onClick={() => setConfirmArchive(true)}>
          Archive
        </Button>
      ) : (
        <ConfirmBox label="Archive">
          <p>
            Archive keeps only the rallies, joined with no gaps, at lower quality. Tags and reels then use the
            archived copy. The original is removed once the archive is made and checked.
          </p>
          <p className="font-semibold">This cannot be undone.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              kind="control"
              onClick={() => {
                setConfirmArchive(false)
                setAsking(null)
                startArchive(match.id)
              }}
            >
              Archive
            </Button>
            <Button kind="control" variant="ghost" onClick={() => setConfirmArchive(false)}>
              Cancel
            </Button>
          </div>
        </ConfirmBox>
      )}
    </Card>
  )
}
