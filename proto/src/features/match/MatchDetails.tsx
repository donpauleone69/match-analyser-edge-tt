import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Icon,
  buttonKindControlSquare,
  buttonKindField,
  buttonKindTextLink,
} from '@/ui-mine'
import { WfBadge, WfWarnBadge } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  formatSize,
  isUntouched,
  lastTaggedSetId,
  matchSetsWon,
  resultDiffers,
  resultSetCount,
  setScoresDiffer,
  setState,
  taggedScore,
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
  isRealResult,
  REAL_RESULTS,
  setsLostByResult,
  videoRallyCount,
} from '@/features/match/matchChecks'
import { cn } from '@/helpers/utils'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted'
const inputClass = cn(
  buttonKindField,
  'w-full rounded-md border border-border bg-bg-card px-3 text-sm text-primary'
)
const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary'
const flagRowClass = cn(flagClass, 'flex flex-wrap items-center justify-between gap-2')
const noteRowClass =
  'rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'

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
            kind="control"
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
          <Button kind="control" variant="secondary" onClick={undoRemove}>
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
                          kind="control"
                          variant="secondary"
                          className={buttonKindControlSquare}
                          aria-label={`Move ${v.fileName} up`}
                          disabled={running || i === 0}
                          onClick={() => moveVideo(match.id, v.id, -1)}
                        >
                          <Icon name="chevron-up" size="xs" />
                        </Button>
                        <Button
                          kind="control"
                          variant="secondary"
                          className={buttonKindControlSquare}
                          aria-label={`Move ${v.fileName} down`}
                          disabled={running || i === match.videos.length - 1}
                          onClick={() => moveVideo(match.id, v.id, 1)}
                        >
                          <Icon name="chevron-down" size="xs" />
                        </Button>
                      </>
                    ) : null}
                    <Button
                      kind="control"
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
            <Button kind="control" variant="secondary" onClick={() => setConfirmArchive(true)}>
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
        </>
      ) : null}

      {phase === 'ready' || phase === 'partial' ? (
        <Button kind="main" onClick={() => navigate(`/matches/${match.id}/tag`)}>
          Next: Tag
        </Button>
      ) : null}
    </Card>
  )
}

const resultKey = (r: MatchResult) =>
  r.me !== null && r.them !== null ? `${r.me}-${r.them}` : ''

/** One picker that lists only results a match can end on. */
function ResultSelect({
  value,
  onChange,
}: {
  value: MatchResult
  onChange: (next: MatchResult) => void
}) {
  const key = resultKey(value)
  const listed = REAL_RESULTS.some((g) => g.results.some((r) => resultKey(r) === key))
  return (
    <select
      aria-label="Result"
      className={cn(
        buttonKindField,
        'rounded-md border border-border bg-bg-card px-2 text-sm font-semibold text-primary'
      )}
      value={key}
      onChange={(e) => {
        const [me, them] = e.target.value.split('-').map(Number)
        onChange(e.target.value === '' ? { me: null, them: null } : { me, them })
      }}
    >
      <option value="">Not entered</option>
      {/* A result saved from tagging that no match can end on still shows as it is. */}
      {key !== '' && !listed ? <option value={key}>{key.replace('-', ' - ')}</option> : null}
      {REAL_RESULTS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.results.map((r) => (
            <option key={resultKey(r)} value={resultKey(r)}>
              {formatScore(r)}
            </option>
          ))}
        </optgroup>
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
        buttonKindField,
        'w-11 rounded-md border bg-bg-card px-1 text-center text-sm text-primary',
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
          <Button kind="control" variant="secondary" onClick={onUseTagged}>
            Use tagged
          </Button>
          <Link
            to={tagHref}
            className={cn('text-xs font-semibold text-brand underline', buttonKindTextLink)}
          >
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

/**
 * Result and set scores as one area. The result dictates the number of sets.
 * At most two lines sit above the scores: one about the result, one about
 * the set scores.
 */
function ResultCard({ match }: { match: MatchRecord }) {
  const { setResult, setEnteredScore, mutateMatch } = useDemo()
  const count = resultSetCount(match)
  const lastTagged = lastTaggedSetId(match)
  const differing = match.sets.filter(setScoresDiffer).length
  const them = match.opponent.trim() || 'Opponent'
  const fromTagging = matchSetsWon(match)
  const tagged = derivePhase(match) === 'complete'
  const saved =
    match.result.me !== null && match.result.them !== null
      ? { me: match.result.me, them: match.result.them }
      : null

  // A lower result that would stop listing sets that hold scores waits here,
  // not in the match, until it is confirmed.
  const [pending, setPending] = useState<{ base: MatchResult; next: MatchResult } | null>(null)
  const waiting = pending && pending.base === match.result ? pending.next : null
  const lost = waiting ? setsLostByResult(match, waiting) : []

  // Links that say "enter the result" land on the picker.
  const { hash } = useLocation()
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (hash !== '#result') return
    cardRef.current?.scrollIntoView({ block: 'center' })
    cardRef.current?.querySelector('select')?.focus({ preventScroll: true })
  }, [hash])

  const pick = (next: MatchResult) => {
    if (setsLostByResult(match, next).length > 0) {
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
  const clear = waiting !== null && lost.length === 0
  useEffect(() => {
    if (clear) commitPending()
  })

  const useTaggedResult = isRealResult(fromTagging) ? (
    <Button kind="control" variant="secondary" onClick={() => pick(fromTagging)}>
      Use tagged result
    </Button>
  ) : null

  // One line about the result. The first that applies.
  const resultLine =
    waiting && lost.length > 0 ? (
      <ConfirmBox label="Change result">
        <p>
          {formatScore({ me: waiting.me ?? 0, them: waiting.them ?? 0 })} gives{' '}
          {(waiting.me ?? 0) + (waiting.them ?? 0)} sets. {setList(lost)}{' '}
          {lost.length === 1 ? 'has' : 'have'} entered scores or a Not filmed mark that will be
          removed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button kind="control" onClick={commitPending}>
            Change to {formatScore({ me: waiting.me ?? 0, them: waiting.them ?? 0 })}
          </Button>
          <Button kind="control" variant="ghost" onClick={() => setPending(null)}>
            {saved ? `Keep ${formatScore(saved)}` : 'Cancel'}
          </Button>
        </div>
      </ConfirmBox>
    ) : resultDiffers(match) ? (
      <div className={flagRowClass}>
        <span className="inline-flex flex-wrap items-center gap-2">
          <WfWarnBadge>Differs</WfWarnBadge>
          Tagged sets give {formatScore(fromTagging)}.
        </span>
        {useTaggedResult}
      </div>
    ) : saved && !isRealResult(saved) ? (
      <p className={flagClass}>A match cannot end {formatScore(saved)}. Pick the result.</p>
    ) : count !== null && lastTagged > count ? (
      <p className={flagClass}>
        {formatScore(saved ?? fromTagging)} gives {count} sets. Set {lastTagged} is tagged.
      </p>
    ) : count === null && tagged ? (
      <div className={noteRowClass}>
        <span>Tagged sets give {formatScore(fromTagging)}.</span>
        {useTaggedResult}
      </div>
    ) : null

  // One line about the set scores. A single differing set is said on its row.
  const scoresLine =
    differing > 1 ? (
      <div className={flagRowClass}>
        <span>{differing} sets differ from tagging.</span>
        <Button
          kind="control"
          variant="secondary"
          onClick={() => mutateMatch(match.id, applyTaggedScores)}
        >
          Use tagged scores
        </Button>
      </div>
    ) : saved && enteredScoresMissResult(match) && !resultDiffers(match) ? (
      <p className={flagClass}>
        Entered set scores add up to {formatScore(enteredSetsWon(match))}, not {formatScore(saved)}.
      </p>
    ) : null

  return (
    <Card ref={cardRef} id="result" className="space-y-3">
      <CardTitle>Result</CardTitle>
      <div className="flex flex-wrap items-center gap-2 text-sm text-primary">
        <span>You</span>
        <ResultSelect value={waiting ?? match.result} onChange={pick} />
        <span className="min-w-0 truncate">{them}</span>
        <span className="ml-auto text-xs text-muted">
          {count ? `${count} ${count === 1 ? 'set' : 'sets'}` : 'Sets follow the result'}
        </span>
      </div>

      {resultLine}
      {scoresLine}

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
        kind="control"
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
        <Button kind="control" onClick={remove}>
          Delete
        </Button>
        <Button kind="control" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </ConfirmBox>
  )
}
