import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { WfBadge } from '@/layout/Wireframe'
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
  type SetData,
} from '@/data/demoStore'
import {
  applyTaggedResult,
  applyTaggedScore,
  applyTaggedScores,
} from '@/features/tagging/matchOps'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { cn } from '@/helpers/utils'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted'
const inputClass =
  'w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary'
const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary'

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

const ARCHIVE_STEPS = ['Making archive', 'Checking archive', 'Removing original'] as const
const ARCHIVE_STEP_MS = 1100

/** Ordered, sequential videos for the match. No mapping of sets to videos. */
function VideosCard({ match }: { match: MatchRecord }) {
  const navigate = useNavigate()
  const { moveVideo, removeVideo, archiveVideos } = useDemo()
  const phase = derivePhase(match)
  const many = match.videos.length > 1
  const anyOriginal = match.videos.some((v) => !v.archived)

  // null = idle, 'confirm' = asking, 0..2 = running that archive step
  const [archive, setArchive] = useState<null | 'confirm' | number>(null)
  const running = typeof archive === 'number'

  useEffect(() => {
    if (typeof archive !== 'number') return
    const timer = setTimeout(() => {
      if (archive < ARCHIVE_STEPS.length - 1) {
        setArchive(archive + 1)
      } else {
        archiveVideos(match.id)
        setArchive(null)
      }
    }, ARCHIVE_STEP_MS)
    return () => clearTimeout(timer)
  }, [archive, archiveVideos, match.id])

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="film" size="sm" className="text-brand" />
          <CardTitle>Videos</CardTitle>
        </div>
        <AddVideoChoice matchId={match.id} disabled={running} />
      </div>

      {match.videos.length === 0 ? (
        <p className="text-sm text-muted">No video yet.</p>
      ) : (
        <>
          {many ? <CardDescription>Played in this order.</CardDescription> : null}
          <ol className="space-y-2">
            {match.videos.map((v, i) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-md border border-border bg-bg-card px-3 py-2"
              >
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
                    disabled={running}
                    onClick={() => removeVideo(match.id, v.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          {phase !== 'complete' ? (
            <p className="text-xs text-muted">Archive comes once tagging is finished.</p>
          ) : !anyOriginal ? (
            <p className="text-xs text-muted">Tags and reels use the archived copy.</p>
          ) : archive === null ? (
            <Button size="sm" variant="secondary" onClick={() => setArchive('confirm')}>
              Archive
            </Button>
          ) : archive === 'confirm' ? (
            <div className={cn(flagClass, 'space-y-2')} role="alertdialog" aria-label="Archive">
              <p>
                Archive keeps only the rallies, joined with no gaps, at lower quality. Tags and
                reels then use the archived copy. The original is removed once the archive is made
                and checked.
              </p>
              <p className="font-semibold">This cannot be undone.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setArchive(0)}>
                  Archive
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setArchive(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5" role="status">
              <p className="text-sm text-primary">
                {ARCHIVE_STEPS[archive]}
                <span className="text-muted">
                  {' '}
                  · step {archive + 1} of {ARCHIVE_STEPS.length}
                </span>
              </p>
              <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                <div
                  className="h-full bg-brand-primary transition-all duration-500"
                  style={{ width: `${((archive + 1) / ARCHIVE_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}

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

function TaggedCell({ set, onUseTagged }: { set: SetData; onUseTagged: () => void }) {
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
          <span className="inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Differs
          </span>
          <Button size="sm" variant="secondary" onClick={onUseTagged}>
            Use tagged
          </Button>
        </>
      ) : null}
    </span>
  )
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

  return (
    <Card className="space-y-3">
      <CardTitle>Result</CardTitle>
      <div className="flex flex-wrap items-center gap-2 text-sm text-primary">
        <span>You</span>
        <ResultSelect
          label="Sets you won"
          value={match.result.me}
          onChange={(me) => setResult(match.id, { ...match.result, me })}
        />
        <span>-</span>
        <ResultSelect
          label={`Sets ${them} won`}
          value={match.result.them}
          onChange={(next) => setResult(match.id, { ...match.result, them: next })}
        />
        <span className="min-w-0 truncate">{them}</span>
        <span className="ml-auto text-xs text-muted">
          {count ? `${count} ${count === 1 ? 'set' : 'sets'}` : 'Sets follow the result'}
        </span>
      </div>

      {count !== null && lastTagged > count ? (
        <p className={flagClass}>
          The result gives {count} {count === 1 ? 'set' : 'sets'} but set {lastTagged} is tagged.
        </p>
      ) : null}
      {offerResult ? (
        <div className={cn(flagClass, 'flex flex-wrap items-center justify-between gap-2')}>
          <span>No result entered. Tagged sets give {formatScore(fromTagging)}.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => mutateMatch(match.id, applyTaggedResult)}
          >
            Use tagged result
          </Button>
        </div>
      ) : null}
      {resultDiffers(match) ? (
        <div className={cn(flagClass, 'flex flex-wrap items-center justify-between gap-2')}>
          <span>The result differs from tagging. Tagged sets give {formatScore(fromTagging)}.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => mutateMatch(match.id, applyTaggedResult)}
          >
            Use tagged result
          </Button>
        </div>
      ) : null}
      {differing > 0 ? (
        <div className={cn(flagClass, 'flex flex-wrap items-center justify-between gap-2')}>
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

  const remove = () => {
    deleteMatch(match.id)
    navigate('/home')
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        onClick={() => (isUntouched(match) ? remove() : setConfirming(true))}
      >
        Delete match
      </Button>
    )
  }

  return (
    <div className={cn(flagClass, 'space-y-2')} role="alertdialog" aria-label="Delete match">
      <p>Delete this match and its tagging? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={remove}>
          Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
