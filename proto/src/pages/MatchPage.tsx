import { useState } from 'react'
import { Link, Navigate, Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty, WfField } from '@/layout/Wireframe'
import { defaultMatchTab, derivePhase, useDemo } from '@/data/demoStore'
import { InsightsSectionRoute } from '@/features/insights/InsightsScreen'

export function MatchPage() {
  const { matchId = '' } = useParams()
  const { getMatch, mode } = useDemo()
  const setMatch = useMatch('/matches/:matchId/tag/:setId')
  const setId = setMatch?.params.setId
  const match = getMatch(matchId)
  const base = `/matches/${matchId}`
  const onSetView = Boolean(setId)
  const backTo = onSetView ? `${base}/tag` : '/home'
  const subtitle = onSetView ? `Set ${setId}` : undefined

  if (mode === 'empty') {
    return (
      <div>
        <StickyChrome>
          <PageHeader title="Match" backTo="/home" />
        </StickyChrome>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <WfEmpty title="No demo data" body="Switch Prototype to Filled on Account." />
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div>
        <StickyChrome>
          <PageHeader title="Match" backTo="/home" />
        </StickyChrome>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <WfEmpty title="Match not found" body="Return to Home." />
        </div>
      </div>
    )
  }

  return (
    <div>
      <StickyChrome>
        <PageHeader title={match.name} subtitle={subtitle} backTo={backTo} />
        <HubTabs
          ariaLabel="Match sections"
          tabs={[
            { to: `${base}/insights`, label: 'Insights' },
            { to: `${base}/details`, label: 'Details' },
            { to: `${base}/tag`, label: 'Tag' },
          ]}
        />
      </StickyChrome>
      <Outlet />
    </div>
  )
}

/** Index redirect by match phase. */
export function MatchIndexRedirect() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  if (!match) return <Navigate to="/home" replace />
  const tab = defaultMatchTab(derivePhase(match))
  return <Navigate to={`/matches/${matchId}/${tab}`} replace />
}

export function MatchInsightsSection() {
  return <InsightsSectionRoute scope="match" />
}

/** Details: video attach first when new; per-set video from scores. */
export function MatchDetailsStub() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const { getMatch, updateMatch, toggleSetVideo } = useDemo()
  const match = getMatch(matchId)
  if (!match) return null

  const phase = derivePhase(match)
  const hasAnyVideo = match.sets.some((s) => s.videoFile)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="upload" size="sm" className="text-brand" />
          <CardTitle>Source video by set</CardTitle>
        </div>
        <CardDescription>Attach one file per set from the score list.</CardDescription>
        <ul className="space-y-2">
          {match.sets.map((s) => (
            <li
              key={s.setId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-primary">
                  Set {s.setId} · {s.score}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {s.videoFile ? s.videoFile : 'No video'}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => toggleSetVideo(match.id, s.setId)}>
                {s.videoFile ? 'Remove video (stub)' : 'Attach video (stub)'}
              </Button>
            </li>
          ))}
        </ul>
        {hasAnyVideo ? (
          <Button onClick={() => navigate(`/matches/${match.id}/tag`)}>Next: Tag</Button>
        ) : (
          <p className="text-sm text-muted">Attach at least one set video before tagging.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Match context</CardTitle>
          <div className="space-y-2">
            <WfField label="Opponent" value={match.opponent || undefined} placeholder="Empty" />
            <WfField label="Tournament / event" value={match.event || undefined} placeholder="Empty" />
            <WfField label="Date" value={match.date || undefined} placeholder="Empty" />
          </div>
          <Button
            size="sm"
            disabled
            onClick={() =>
              updateMatch(match.id, {
                opponent: match.opponent || 'Opponent',
                name: match.name,
              })
            }
          >
            Save context (stub)
          </Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Scores</CardTitle>
          <div className="grid grid-cols-2 gap-2">
            {match.sets.map((s) => (
              <WfField key={s.setId} label={`Set ${s.setId}`} value={s.score} />
            ))}
          </div>
          <Button size="sm" disabled>
            Save scores (stub)
          </Button>
        </Card>
      </div>

      {phase === 'complete' ? (
        <Button variant="secondary" onClick={() => navigate(`/matches/${match.id}/insights/summary`)}>
          Open match Insights
        </Button>
      ) : null}
    </div>
  )
}

function tagLabel(done: boolean) {
  return done ? 'done' : 'todo'
}

/** Tag checklist from the same set data as Details. */
export function MatchTagStub() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  if (!match) return null

  const phase = derivePhase(match)
  const hasVideo = match.sets.some((s) => s.videoFile)

  if (!hasVideo) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <WfEmpty title="No video yet" body="Attach a set video on Details first." />
        <Button onClick={() => navigate(`/matches/${match.id}/details`)}>Go to Details</Button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <p className="text-sm text-muted">Sets from Details scores.</p>
      <ul className="space-y-3">
        {match.sets.map((s) => (
          <li key={s.setId}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Set {s.setId} · {s.score}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {s.videoFile ? (
                      'Video attached'
                    ) : (
                      <>
                        No video ·{' '}
                        <Link to={`/matches/${match.id}/details`} className="font-semibold text-brand">
                          Attach on Details
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {s.videoFile ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/matches/${match.id}/tag/${s.setId}`)}
                  >
                    Open set
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Open set (needs video)
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <WfBadge>contacts {tagLabel(s.contacts)}</WfBadge>
                <WfBadge>key moments {tagLabel(s.keyMoments)}</WfBadge>
                <WfBadge>shot details {tagLabel(s.shotDetails)}</WfBadge>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {phase === 'complete' ? (
        <Button variant="ghost" onClick={() => navigate(`/matches/${match.id}/insights/summary`)}>
          Open match Insights
        </Button>
      ) : null}
    </div>
  )
}

const STUB_RALLIES = [
  {
    id: 'r1',
    label: 'R1 · 0-0',
    meta: 'Won · FA',
    start: '04:12.0',
    end: '04:18.2',
    shots: [
      { id: 's1', label: 'Contact 1', t: '04:12.3' },
      { id: 's2', label: 'Contact 2', t: '04:13.8' },
      { id: 's3', label: 'End', t: '04:18.0' },
    ],
  },
  {
    id: 'r2',
    label: 'R2 · 1-0',
    meta: 'Lost · No Attack',
    start: '04:22.0',
    end: '04:27.5',
    shots: [
      { id: 's1', label: 'Contact 1', t: '04:22.4' },
      { id: 's2', label: 'End', t: '04:27.1' },
    ],
  },
  {
    id: 'r3',
    label: 'R3 · open',
    meta: 'Resume Contacts',
    start: '04:31.0',
    end: '04:31.0',
    shots: [{ id: 's1', label: 'Contact 1', t: '04:31.2' }],
  },
]

export function MatchTagSetStub() {
  const navigate = useNavigate()
  const { matchId = '', setId = '1' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  const set = match?.sets.find((s) => s.setId === Number(setId))
  const [selectedId, setSelectedId] = useState(STUB_RALLIES[0].id)
  const selected = STUB_RALLIES.find((r) => r.id === selectedId) ?? STUB_RALLIES[0]

  if (!match || !set) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <WfEmpty title="Unknown set" body="Back to Tag checklist." />
      </div>
    )
  }

  if (!set.videoFile) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <WfEmpty title={`Set ${set.setId} has no video`} body="Attach on Details first." />
        <Button variant="secondary" onClick={() => navigate(`/matches/${match.id}/details`)}>
          Go to Details
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Player</CardTitle>
          <div className="rounded-lg border border-dashed border-border bg-bg-card aspect-video flex items-center justify-center">
            <div className="text-center space-y-2 px-4">
              <Icon name="film" size="lg" className="mx-auto text-muted" />
              <p className="text-sm font-semibold text-primary">Video stub</p>
              <p className="text-xs text-muted">
                Set {set.setId} · {set.videoFile}
              </p>
            </div>
          </div>
          <Button size="sm" disabled>
            <Icon name="play" size="xs" />
            Play (stub)
          </Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Rallies</CardTitle>
          <ul className="space-y-2">
            {STUB_RALLIES.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left ${
                    r.id === selectedId
                      ? 'border-brand-primary bg-brand-primary-muted'
                      : 'border-border bg-bg-card hover:bg-bg-elevated'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">{r.label}</p>
                    <p className="text-xs text-muted mt-0.5">{r.meta}</p>
                  </div>
                  {r.id === selectedId ? <WfBadge>selected</WfBadge> : null}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="space-y-3">
        <CardTitle>
          {selected.label} · timeline
        </CardTitle>
        <CardDescription>
          Rally {selected.start} to {selected.end}.
        </CardDescription>
        <div className="relative h-12 rounded-md border border-border bg-bg-card">
          <div className="absolute inset-x-3 top-1/2 h-0.5 bg-border" />
          <div className="absolute top-1 bottom-1 w-0.5 bg-brand-primary" style={{ left: '8%' }} />
          <div className="absolute top-1 bottom-1 w-0.5 bg-brand-primary" style={{ left: '92%' }} />
          {selected.shots.map((shot, i) => {
            const pct = 15 + (i / Math.max(selected.shots.length - 1, 1)) * 70
            return (
              <button
                key={shot.id}
                type="button"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-brand-primary border-2 border-bg-surface"
                style={{ left: `${pct}%` }}
                aria-label={shot.label}
              />
            )
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rally bounds</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled>
                Start -0.1s (stub)
              </Button>
              <Button size="sm" disabled>
                End +0.1s (stub)
              </Button>
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Shot markers</p>
            <ul className="space-y-2">
              {selected.shots.map((shot) => (
                <li key={shot.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-primary">
                    {shot.label} · {shot.t}
                  </span>
                  <span className="flex gap-1">
                    <Button size="sm" disabled>
                      -0.1s
                    </Button>
                    <Button size="sm" disabled>
                      +0.1s
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
