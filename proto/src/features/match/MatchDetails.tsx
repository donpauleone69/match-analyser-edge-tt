import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { WfBadge, WfWarnBadge } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  formatSize,
  isUntouched,
  lastTaggedSetId,
  resultDiffers,
  resultSetCount,
  setScoresDiffer,
  setState,
  taggedResult,
  taggedScore,
  taggedSetsWon,
  useDemo,
  type MatchRecord,
  type MatchResult,
  type SetData,
  type VideoAsset,
} from '@/data/demoStore'
import { applyTaggedScore, applyTaggedScores } from '@/features/tagging/matchOps'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { ARCHIVE_STEPS, startArchive, useArchiveStep } from '@/features/match/archiveJobs'
import {
  enteredScoresMissResult,
  enteredSetsWon,
  isLevelResult,
  setsLostByResult,
  videoRallyCount,
} from '@/features/match/matchChecks'
import { cn } from '@/helpers/utils'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted'
const inputClass =
  'w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary'
const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary'
const flagRowClass = cn(flagClass, 'flex flex-wrap items-center justify-between gap-2')

/** Details: who and when, the videos in order, then result and set scores as one area. */
export function MatchDetails() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  if (!match) return null

  const phase = derivePhase(match)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <MatchFieldsCard match={match} />
          <VideosCard match={match} />
        </div>
        <ResultCard match={match} />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {phase === 'complete' || phase === 'partial' ? (
          <Button
            variant="secondary"
            onClick={() => navigate(`/matches/${match.id}/insights/summary`)}
          >
            Open match Insights
          </Button>
        ) : (
          <span />
        )}
        <DeleteMatch match={match} />
      </div>
    </div>
  )
}

function MatchFieldsCard({ match }: { match: MatchRecord }) {
  const { updateMatch } = useDemo()
  return (
    <Card className="space-y-3">
      <CardTitle>Match</CardTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block space-y-1">
          <span className={labelClass}>Opponent</span>
          <input
            className={inputClass}
            value={match.opponent}
            placeholder="Who you played"
            onChange={(e) => updateMatch(match.id, { opponent: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Event</span>
          <input
            className={inputClass}
            value={match.event}
            onChange={(e) => updateMatch(match.id, { event: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            className={inputClass}
            value={match.date}
            onChange={(e) => updateMatch(match.id, { date: e.target.value })}
          />
        </label>
      </div>
    </Card>
  )
}

/**
 * An amber box that asks before something is lost. It opens in place, so it
 * scrolls itself clear of the fold and of the phone's bottom nav.
 */
function ConfirmBox({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])
  return (
    <div
      ref={ref}
      className={cn(flagClass, 'space-y-2 scroll-mb-16 md:scroll-mb-4')}
      role="alertdialog"
      aria-label={label}
    >
      {children}
    </div>
  )
}

const UNDO_MS = 6000

function rallies(n: number) {
  return `${n} tagged ${n === 1 ? 'rally' : 'rallies'}`
}

/** What removing a video costs. Asked before any removal that loses something. */
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
            {uses > 0
              ? ` ${rallies(uses)} can never be played or shown in reels again.`
              : ''}
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
        <Button size="sm" onClick={onRemove}>
          {video.archived ? 'Remove the only copy' : 'Remove video'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {video.archived ? 'Keep it' : 'Cancel'}
        </Button>
      </div>
    </ConfirmBox>
  )
}

/** Ordered, sequential videos for the match. No mapping of sets to videos. */
function VideosCard({ match }: { match: MatchRecord }) {
  const navigate = useNavigate()
  const { moveVideo, removeVideo, mutateMatch } = useDemo()
  const phase = derivePhase(match)
  const many = match.videos.length > 1
  const anyOriginal = match.videos.some((v) => !v.archived)

  // The job runs outside this page, so it carries on if Details is left.
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
    // An Original nothing was tagged on goes at once, with a short undo.
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
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="film" size="sm" className="text-brand" />
          <CardTitle>Videos</CardTitle>
        </div>
        <AddVideoChoice matchId={match.id} disabled={running} />
      </div>

      {match.videos.length === 0 ? <p className="text-sm text-muted">No video yet.</p> : null}

      {removed ? (
        <p
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm text-primary"
          role="status"
        >
          <span className="min-w-0 truncate">Removed {removed.video.fileName}</span>
          <Button size="sm" variant="secondary" onClick={undoRemove}>
            Undo
          </Button>
        </p>
      ) : null}

      {match.videos.length > 0 ? (
        <>
          {many ? <CardDescription>Played in this order.</CardDescription> : null}
          <ol className="space-y-2">
            {match.videos.map((v, i) => (
              <li
                key={v.id}
                className="rounded-md border border-border bg-bg-card px-3 py-2 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary truncate">{v.fileName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <WfBadge>{v.archived ? 'Archived' : 'Original'}</WfBadge>
                      {formatSize(v.sizeMb)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {many ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Move ${v.fileName} up`}
                          disabled={running || i === 0}
                          onClick={() => moveVideo(match.id, v.id, -1)}
                        >
                          <Icon name="chevron-up" size="xs" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={`Move ${v.fileName} down`}
                          disabled={running || i === match.videos.length - 1}
                          onClick={() => moveVideo(match.id, v.id, 1)}
                        >
                          <Icon name="chevron-down" size="xs" />
                        </Button>
                      </>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={running || asking === v.id}
                      onClick={() => onRemove(v, i)}
                    >
                      Remove
                    </Button>
                  </div>
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

          {running ? (
            <div className="space-y-1.5" role="status">
              <p className="text-sm text-primary">
                {ARCHIVE_STEPS[archiveStep]}
                <span className="text-muted">
                  {' '}
                  · step {archiveStep + 1} of {ARCHIVE_STEPS.length}
                </span>
              </p>
              <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                <div
                  className="h-full bg-brand-primary transition-all duration-500"
                  style={{ width: `${((archiveStep + 1) / ARCHIVE_STEPS.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted">Carries on if you leave this page.</p>
            </div>
          ) : !anyOriginal ? (
            <p className="text-xs text-muted">Tags and reels use the archived copy.</p>
          ) : phase !== 'complete' ? (
            <p className="text-xs text-muted">Archive comes once tagging is finished.</p>
          ) : !confirmArchive ? (
            <Button size="sm" variant="secondary" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
          ) : (
            <ConfirmBox label="Archive">
              <p>
                Archive keeps only the rallies, joined with no gaps, at lower quality. Tags and
                reels then use the archived copy. The original is removed once the archive is made
                and checked.
              </p>
              <p className="font-semibold">This cannot be undone.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmArchive(false)
                    setAsking(null)
                    startArchive(match.id)
                  }}
                >
                  Archive
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmArchive(false)}>
                  Cancel
                </Button>
              </div>
            </ConfirmBox>
          )}
        </>
      ) : null}

      {phase === 'ready' || phase === 'partial' ? (
        <Button onClick={() => navigate(`/matches/${match.id}/tag`)}>Next: Tag</Button>
      ) : null}
    </Card>
  )
}

const RESULT_OPTIONS = [0, 1, 2, 3, 4]

function ResultSelect({
  value,
  label,
  onChange,
}: {
  value: number | null
  label: string
  onChange: (next: number | null) => void
}) {
  return (
    <select
      aria-label={label}
      className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold text-primary"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      <option value="">-</option>
      {RESULT_OPTIONS.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
}

function ScoreInput({
  value,
  label,
  flagged,
  onChange,
}: {
  value: string
  label: string
  flagged: boolean
  onChange: (next: string) => void
}) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      className={cn(
        'w-11 rounded-md border bg-bg-card px-1 py-1.5 text-center text-sm text-primary',
        flagged ? 'border-warning' : 'border-border'
      )}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
    />
  )
}

function TaggedCell({
  set,
  tagHref,
  onUseTagged,
}: {
  set: SetData
  tagHref: string
  onUseTagged: () => void
}) {
  const state = setState(set)
  const tagged = taggedScore(set)
  if (state === 'skipped') return <span className="text-muted">Not filmed</span>
  if (state === 'none') return <span className="text-muted">Not tagged</span>
  if (!tagged) return <span className="text-muted">Started</span>
  if (state === 'progress') {
    return <span className="text-muted">{formatScore(tagged)} so far</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold text-primary">{formatScore(tagged)}</span>
      {setScoresDiffer(set) ? (
        <>
          <WfWarnBadge>Differs</WfWarnBadge>
          <Button size="sm" variant="secondary" onClick={onUseTagged}>
            Use tagged
          </Button>
          <Link to={tagHref} className="text-xs font-semibold text-brand underline">
            Open set {set.setId}
          </Link>
        </>
      ) : null}
    </span>
  )
}

function setList(sets: SetData[]): string {
  const names = sets.map((s) => `set ${s.setId}`)
  const text =
    names.length <= 1
      ? names.join('')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Result and set scores as one area. The result dictates the number of sets. */
function ResultCard({ match }: { match: MatchRecord }) {
  const { setResult, setEnteredScore, mutateMatch } = useDemo()
  const count = resultSetCount(match)
  const lastTagged = lastTaggedSetId(match)
  const differing = match.sets.filter(setScoresDiffer).length
  const them = match.opponent.trim() || 'Opponent'
  const fromTagging = taggedResult(match) ?? taggedSetsWon(match)
  // Tagged with no result: offer the result tagging gives. Never automatic.
  const offerResult = count === null && derivePhase(match) === 'complete'

  // A pick that cannot be saved as it stands: a level result, or one that
  // would stop listing sets that hold scores. It waits here, not in the match.
  const [pending, setPending] = useState<{ base: MatchResult; next: MatchResult } | null>(null)
  const waiting = pending && pending.base === match.result ? pending.next : null
  const shown = waiting ?? match.result
  const lost = waiting ? setsLostByResult(match, waiting) : []
  const saved =
    match.result.me !== null && match.result.them !== null
      ? formatScore({ me: match.result.me, them: match.result.them })
      : null

  const pick = (next: MatchResult) => {
    if (isLevelResult(next) || setsLostByResult(match, next).length > 0) {
      setPending({ base: match.result, next })
    } else {
      setResult(match.id, next)
      setPending(null)
    }
  }

  const commitPending = () => {
    if (waiting) setResult(match.id, waiting)
    setPending(null)
  }

  // Nothing left in the way (the scores it would have dropped were cleared): save it.
  const clear = waiting !== null && !isLevelResult(waiting) && lost.length === 0
  useEffect(() => {
    if (clear) commitPending()
  })

  return (
    <Card className="space-y-3">
      <CardTitle>Result</CardTitle>
      <div className="flex flex-wrap items-center gap-2 text-sm text-primary">
        <span>You</span>
        <ResultSelect
          label="Sets you won"
          value={shown.me}
          onChange={(me) => pick({ ...shown, me })}
        />
        <span>-</span>
        <ResultSelect
          label={`Sets ${them} won`}
          value={shown.them}
          onChange={(next) => pick({ ...shown, them: next })}
        />
        <span className="min-w-0 truncate">{them}</span>
        <span className="ml-auto text-xs text-muted">
          {count ? `${count} ${count === 1 ? 'set' : 'sets'}` : 'Sets follow the result'}
        </span>
      </div>

      {waiting && isLevelResult(waiting) ? (
        <div className={flagRowClass} role="alert">
          <span>
            A match cannot end {waiting.me} - {waiting.them}.{' '}
            {saved ? `The result is still ${saved}.` : 'No result is saved.'}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setPending(null)}>
            {saved ? `Keep ${saved}` : 'Undo'}
          </Button>
        </div>
      ) : waiting && lost.length > 0 ? (
        <ConfirmBox label="Change result">
          <p>
            {waiting.me} - {waiting.them} gives {(waiting.me ?? 0) + (waiting.them ?? 0)} sets.{' '}
            {setList(lost)} {lost.length === 1 ? 'has' : 'have'} entered scores or a Not filmed
            mark that will be removed.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={commitPending}>
              Change to {waiting.me} - {waiting.them}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              {saved ? `Keep ${saved}` : 'Cancel'}
            </Button>
          </div>
        </ConfirmBox>
      ) : null}
      {!waiting && isLevelResult(match.result) && count !== null ? (
        <p className={flagClass}>A match cannot end {saved}. Pick the result again.</p>
      ) : null}
      {count !== null && lastTagged > count ? (
        <p className={flagClass}>
          The result gives {count} {count === 1 ? 'set' : 'sets'} but set {lastTagged} is tagged.
        </p>
      ) : null}
      {enteredScoresMissResult(match) ? (
        <p className={flagClass}>
          The entered set scores give {formatScore(enteredSetsWon(match))}. The result says {saved}.
        </p>
      ) : null}
      {offerResult ? (
        <div className={flagRowClass}>
          <span>No result entered. Tagged sets give {formatScore(fromTagging)}.</span>
          <Button size="sm" variant="secondary" onClick={() => pick(fromTagging)}>
            Use tagged result
          </Button>
        </div>
      ) : null}
      {resultDiffers(match) ? (
        <div className={flagRowClass}>
          <span>The result differs from tagging. Tagged sets give {formatScore(fromTagging)}.</span>
          <Button size="sm" variant="secondary" onClick={() => pick(fromTagging)}>
            Use tagged result
          </Button>
        </div>
      ) : null}
      {differing > 0 ? (
        <div className={flagRowClass}>
          <span>{differing === 1 ? '1 set differs' : `${differing} sets differ`} from tagging.</span>
          {differing > 1 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => mutateMatch(match.id, applyTaggedScores)}
            >
              Use tagged scores
            </Button>
          ) : null}
        </div>
      ) : null}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className={cn(labelClass, 'pb-1 pr-3')}>Set</th>
            <th className={cn(labelClass, 'pb-1 pr-3')}>Entered</th>
            <th className={cn(labelClass, 'pb-1')}>Tagged</th>
          </tr>
        </thead>
        <tbody>
          {match.sets.map((s) => {
            const flagged = setScoresDiffer(s)
            return (
              <tr key={s.setId} className="border-t border-border">
                <td className="py-2 pr-3 font-medium text-primary tabular-nums">{s.setId}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <ScoreInput
                      label={`Set ${s.setId}, your points`}
                      value={s.entered.me}
                      flagged={flagged}
                      onChange={(me) => setEnteredScore(match.id, s.setId, { ...s.entered, me })}
                    />
                    <span className="text-muted">-</span>
                    <ScoreInput
                      label={`Set ${s.setId}, ${them} points`}
                      value={s.entered.them}
                      flagged={flagged}
                      onChange={(next) =>
                        setEnteredScore(match.id, s.setId, { ...s.entered, them: next })
                      }
                    />
                  </span>
                </td>
                <td className="py-2">
                  <TaggedCell
                    set={s}
                    tagHref={`/matches/${match.id}/tag/${s.setId}`}
                    onUseTagged={() => mutateMatch(match.id, (m) => applyTaggedScore(m, s.setId))}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function DeleteMatch({ match }: { match: MatchRecord }) {
  const navigate = useNavigate()
  const { deleteMatch } = useDemo()
  const [confirming, setConfirming] = useState(false)
  const archiving = useArchiveStep(match.id) !== null

  const remove = () => {
    deleteMatch(match.id)
    navigate('/home')
  }

  if (!confirming || archiving) {
    return (
      <Button
        variant="ghost"
        disabled={archiving}
        onClick={() => (isUntouched(match) ? remove() : setConfirming(true))}
      >
        Delete match
      </Button>
    )
  }

  return (
    <ConfirmBox label="Delete match">
      <p>Delete this match and its tagging? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={remove}>
          Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </ConfirmBox>
  )
}
