import { useState } from 'react'
import { Link, Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'
import { DEMO_MATCH, getDemoSet } from '@/data/demoMatch'

/** Match hub: Insights · Details · Tag. Header names the match. */
export function MatchPage() {
  const { matchId = DEMO_MATCH.id } = useParams()
  const setMatch = useMatch('/matches/:matchId/tag/:setId')
  const setId = setMatch?.params.setId
  const base = `/matches/${matchId}`
  const onSetView = Boolean(setId)
  const backTo = onSetView ? `${base}/tag` : '/home'
  const subtitle = onSetView ? `Set ${setId}` : undefined

  return (
    <div>
      <StickyChrome>
        <PageHeader title={DEMO_MATCH.name} subtitle={subtitle} backTo={backTo} />
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

function ReelRow({ title, meta }: { title: string; meta: string }) {
  return (
    <WfRow
      title={title}
      meta={meta}
      trailing={
        <div className="flex gap-1">
          <Button size="sm" disabled>
            <Icon name="play" size="xs" />
            Play
          </Button>
          <Button size="sm" variant="secondary" disabled>
            <Icon name="download" size="xs" />
            Download
          </Button>
        </div>
      }
    />
  )
}

function InsightBlock({
  title,
  stats,
  reels,
}: {
  title: string
  stats: string
  reels: { title: string; meta: string }[]
}) {
  return (
    <Card className="space-y-3">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{stats}</CardDescription>
      <ul className="space-y-2">
        {reels.map((r) => (
          <ReelRow key={r.title} title={r.title} meta={r.meta} />
        ))}
      </ul>
      <Button size="sm" variant="secondary" disabled>
        <Icon name="download" size="xs" />
        Download all
      </Button>
    </Card>
  )
}

/** Summary · Serve · Receive. Each owns its reels. No Work on. */
export function MatchInsightsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InsightBlock
          title="Summary"
          stats="Set 1 11-7 · Set 2 open · FA 58%"
          reels={[
            { title: 'Highlight', meta: '8 points' },
            { title: 'Key winners', meta: '5 points' },
          ]}
        />
        <InsightBlock
          title="Serve"
          stats="1st in 62% · short 4 · long 9"
          reels={[
            { title: 'Serve +1', meta: '6 points' },
            { title: 'Serve faults', meta: '2 points' },
          ]}
        />
        <InsightBlock
          title="Receive"
          stats="Short receive miss 6 · deep hold 11"
          reels={[
            { title: 'Short receive', meta: '6 points' },
            { title: 'Flick return', meta: '3 points' },
          ]}
        />
      </div>
      <WfEmpty title="No point data" body="Insights empty until sets are tagged." />
    </div>
  )
}

/** Context + scores (shared with Tag checklist) + source video. */
export function MatchDetailsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Match context</CardTitle>
          <div className="space-y-2">
            <WfField label="Opponent" value={DEMO_MATCH.opponent} />
            <WfField label="Handedness" placeholder="Right / Left" />
            <WfField label="Tournament / event" value={DEMO_MATCH.event} />
            <WfField label="Date" value={DEMO_MATCH.date} />
          </div>
          <Button size="sm" disabled>
            Save context (stub)
          </Button>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Scores</CardTitle>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_MATCH.sets.map((s) => (
              <WfField key={s.setId} label={`Set ${s.setId}`} value={s.score} />
            ))}
            <WfField label="Match result" placeholder="Best of 5" />
          </div>
          <Button size="sm" disabled>
            Save scores (stub)
          </Button>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="upload" size="sm" className="text-brand" />
            <CardTitle>Source video</CardTitle>
          </div>
          <WfBadge>attach here</WfBadge>
        </div>
        <CardDescription>Per-set attach status shows on Tag checklist.</CardDescription>
        <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-8 text-center space-y-2">
          <p className="text-sm font-semibold text-primary">demo-match.mp4</p>
          <p className="text-xs text-muted">~42 min · placeholder · sets 1-2</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled>
            <Icon name="upload" size="xs" />
            Attach video (stub)
          </Button>
          <Button variant="secondary" disabled>
            Replace video (stub)
          </Button>
          <Button variant="ghost" disabled>
            Remove (stub)
          </Button>
        </div>
      </Card>
    </div>
  )
}

function tagLabel(done: boolean) {
  return done ? 'done' : 'todo'
}

/** Tag landing: checklist by set from Details scores. */
export function MatchTagStub() {
  const navigate = useNavigate()
  const { matchId = DEMO_MATCH.id } = useParams()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <p className="text-sm text-muted max-w-prose">
        Sets from Details scores. Open a set to tag.
      </p>
      <ul className="space-y-3">
        {DEMO_MATCH.sets.map((s) => (
          <li key={s.setId}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Set {s.setId} · {s.score}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {s.videoAttached ? (
                      'Video attached'
                    ) : (
                      <>
                        No video ·{' '}
                        <Link
                          to={`/matches/${matchId}/details`}
                          className="font-semibold text-brand"
                        >
                          Attach on Details
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {s.videoAttached ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/matches/${matchId}/tag/${s.setId}`)}
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

/** Set tagging: player stub + rallies; select rally for shot timeline + nudge. */
export function MatchTagSetStub() {
  const navigate = useNavigate()
  const { matchId = DEMO_MATCH.id, setId = '1' } = useParams()
  const set = getDemoSet(Number(setId))
  const [selectedId, setSelectedId] = useState(STUB_RALLIES[0].id)
  const selected = STUB_RALLIES.find((r) => r.id === selectedId) ?? STUB_RALLIES[0]

  if (!set) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <WfEmpty title="Unknown set" body="Back to Tag checklist." />
        <Button className="mt-3" variant="secondary" onClick={() => navigate(`/matches/${matchId}/tag`)}>
          Tag checklist
        </Button>
      </div>
    )
  }

  if (!set.videoAttached) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <WfEmpty
          title={`Set ${set.setId} has no video`}
          body="Attach source video on Details first."
        />
        <Button variant="secondary" onClick={() => navigate(`/matches/${matchId}/details`)}>
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
              <p className="text-xs text-muted">Set {set.setId} · no real playback</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled>
              <Icon name="play" size="xs" />
              Play (stub)
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Pause (stub)
            </Button>
          </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {selected.label} · timeline
          </CardTitle>
          <WfBadge>shots</WfBadge>
        </div>
        <CardDescription>
          Rally {selected.start} to {selected.end}. Select markers to nudge.
        </CardDescription>

        <div className="relative h-12 rounded-md border border-border bg-bg-card">
          <div className="absolute inset-x-3 top-1/2 h-0.5 bg-border" />
          {/* Rally start / end */}
          <div
            className="absolute top-1 bottom-1 w-0.5 bg-brand-primary"
            style={{ left: '8%' }}
            title="Rally start"
          />
          <div
            className="absolute top-1 bottom-1 w-0.5 bg-brand-primary"
            style={{ left: '92%' }}
            title="Rally end"
          />
          {selected.shots.map((shot, i) => {
            const pct = 15 + (i / Math.max(selected.shots.length - 1, 1)) * 70
            return (
              <button
                key={shot.id}
                type="button"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-brand-primary border-2 border-bg-surface"
                style={{ left: `${pct}%` }}
                title={`${shot.label} ${shot.t}`}
                aria-label={shot.label}
              />
            )
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 rounded-md border border-border bg-bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rally bounds</p>
            <p className="text-sm text-primary">
              Start {selected.start} · End {selected.end}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled>
                Start -0.1s (stub)
              </Button>
              <Button size="sm" disabled>
                Start +0.1s (stub)
              </Button>
              <Button size="sm" disabled>
                End -0.1s (stub)
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
                <li
                  key={shot.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="text-primary font-medium">
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
