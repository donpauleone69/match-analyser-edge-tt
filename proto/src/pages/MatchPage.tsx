import { useState } from 'react'
import { Navigate, Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty } from '@/layout/Wireframe'
import {
  defaultMatchTab,
  derivePhase,
  matchTitle,
  useDemo,
  type RallyData,
} from '@/data/demoStore'
import { InsightsSectionRoute } from '@/features/insights/InsightsScreen'
import { cn } from '@/helpers/utils'

export function MatchPage() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const setMatch = useMatch('/matches/:matchId/tag/:setId')
  const setId = setMatch?.params.setId
  const match = getMatch(matchId)
  const base = `/matches/${matchId}`
  const onSetView = Boolean(setId)
  const backTo = onSetView ? `${base}/tag` : '/home'
  const subtitle = onSetView ? `Set ${setId}` : undefined

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

  const title = matchTitle(match)

  return (
    <div>
      <StickyChrome>
        <PageHeader title={title} subtitle={subtitle} backTo={backTo} />
        {!onSetView ? (
          <HubTabs
            ariaLabel="Match sections"
            tabs={[
              { to: `${base}/insights`, label: 'Insights' },
              { to: `${base}/details`, label: 'Details' },
              { to: `${base}/tag`, label: 'Tag' },
            ]}
          />
        ) : null}
      </StickyChrome>
      <Outlet />
    </div>
  )
}

export function MatchIndexRedirect() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  if (!match) return <Navigate to="/home" replace />
  const tab = defaultMatchTab(derivePhase(match))
  return <Navigate to={`/matches/${matchId}/${tab}`} replace />
}

export function MatchInsightsSection() {
  return <InsightsSectionRoute scope="match" chrome="full" />
}

const TAG_STEPS = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'keyMoments', label: 'Key moments' },
  { id: 'shotDetails', label: 'Shot details' },
  { id: 'optionalExtras', label: 'Optional extras' },
  { id: 'save', label: 'Save' },
] as const

type StepId = (typeof TAG_STEPS)[number]['id']

export function MatchTagSetStub() {
  const navigate = useNavigate()
  const { matchId = '', setId = '1' } = useParams()
  const { getMatch, patchSet } = useDemo()
  const match = getMatch(matchId)
  const set = match?.sets.find((s) => s.setId === Number(setId))
  const [step, setStep] = useState<StepId>('contacts')
  const [rallies, setRallies] = useState<RallyData[]>(() => set?.rallies ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(
    () => set?.rallies[0]?.id ?? null
  )
  const selected = rallies.find((r) => r.id === selectedId) ?? null
  const video = match?.videos[0]

  if (!match || !set) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <WfEmpty title="Unknown set" body="Back to Tag checklist." />
      </div>
    )
  }

  if (!video || set.skipped) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <WfEmpty
          title={set.skipped ? `Set ${set.setId} not filmed` : 'No video yet'}
          body={set.skipped ? 'Undo it on the Tag checklist.' : 'Add the video on the Tag checklist.'}
        />
        <Button variant="secondary" onClick={() => navigate(`/matches/${match.id}/tag`)}>
          Back to Tag
        </Button>
      </div>
    )
  }

  const addFirstRally = () => {
    const r: RallyData = {
      id: `r-${Date.now()}`,
      label: 'R1 · 0-0',
      meta: 'Open',
      start: '00:00.0',
      end: '00:00.0',
      shots: [],
    }
    setRallies([r])
    setSelectedId(r.id)
  }

  const saveRally = () => {
    const base =
      rallies.length > 0
        ? rallies
        : [
            {
              id: `r-${Date.now()}`,
              label: 'R1 · 0-0',
              meta: 'Saved',
              start: '00:12.0',
              end: '00:16.0',
              shots: [] as RallyData['shots'],
            } satisfies RallyData,
          ]
    const withShots = base.map((r, i) =>
      i === 0 && r.shots.length === 0
        ? {
            ...r,
            meta: 'Saved',
            start: '00:12.0',
            end: '00:16.0',
            shots: [
              { id: 's1', label: 'Contact 1', t: '00:12.3' },
              { id: 's2', label: 'End', t: '00:15.8' },
            ],
          }
        : r
    )
    setRallies(withShots)
    setSelectedId(withShots[0]?.id ?? null)
    patchSet(match.id, set.setId, {
      contacts: true,
      keyMoments: true,
      shotDetails: true,
      optionalExtras: step === 'optionalExtras' || step === 'save' || set.optionalExtras,
      rallies: withShots,
      tagged: set.tagged ?? { me: 11, them: 7 },
    })
  }

  const nextRally = () => {
    saveRally()
    const n = rallies.length + 1
    const r: RallyData = {
      id: `r-${Date.now()}`,
      label: `R${n} · open`,
      meta: 'Open',
      start: '00:00.0',
      end: '00:00.0',
      shots: [],
    }
    const next = [...(rallies.length ? rallies : []), r]
    setRallies(next)
    setSelectedId(r.id)
    setStep('contacts')
    patchSet(match.id, set.setId, { rallies: next })
  }

  const stepIndex = TAG_STEPS.findIndex((s) => s.id === step)

  return (
    <div className="pb-6">
      {/* Pinned player + step strip (phone sticky) */}
      <div className="sticky top-0 z-10 bg-bg-app border-b border-border px-4 sm:px-6 lg:px-8 pt-3 pb-3 space-y-3 md:static md:border-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-dashed border-border bg-bg-card aspect-video max-h-44 md:max-h-none flex items-center justify-center">
            <div className="text-center space-y-1 px-4">
              <Icon name="film" size="lg" className="mx-auto text-muted" />
              <p className="text-sm font-semibold text-primary">Video stub</p>
              <p className="text-xs text-muted">
                Set {set.setId} · {video.fileName}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {TAG_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cn(
                    'px-2 py-1 text-[11px] font-semibold rounded-md border',
                    s.id === step
                      ? 'border-brand-primary bg-brand-primary-muted text-brand-primary'
                      : i < stepIndex
                        ? 'border-border bg-bg-card text-primary'
                        : 'border-border bg-bg-elevated text-muted'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Card className="space-y-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {TAG_STEPS.find((s) => s.id === step)?.label}
              </p>
              {step === 'contacts' ? (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={addFirstRally}>
                    Mark contact (stub)
                  </Button>
                  <Button size="sm" variant="secondary" disabled>
                    Undo contact
                  </Button>
                </div>
              ) : null}
              {step === 'keyMoments' ? (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary">
                    Attack (stub)
                  </Button>
                  <Button size="sm" variant="secondary">
                    FA (stub)
                  </Button>
                </div>
              ) : null}
              {step === 'shotDetails' ? (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary">
                    FH (stub)
                  </Button>
                  <Button size="sm" variant="secondary">
                    BH (stub)
                  </Button>
                </div>
              ) : null}
              {step === 'optionalExtras' ? (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary">
                    Highlight (stub)
                  </Button>
                </div>
              ) : null}
              {step === 'save' ? (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" onClick={saveRally}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={nextRally}>
                    Next rally
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const next = TAG_STEPS[stepIndex + 1]
                    if (next) setStep(next.id)
                  }}
                >
                  Continue
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-4 space-y-4">
        <Card className="space-y-3">
          <CardTitle>Rallies</CardTitle>
          {rallies.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">No rallies yet. Start with Contacts.</p>
              <Button size="sm" variant="secondary" onClick={addFirstRally}>
                Start first rally
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {rallies.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left',
                      r.id === selectedId
                        ? 'border-brand-primary bg-brand-primary-muted'
                        : 'border-border bg-bg-card hover:bg-bg-elevated'
                    )}
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
          )}
        </Card>

        {selected && selected.shots.length > 0 ? (
          <Card className="space-y-3">
            <CardTitle>
              {selected.label} · timeline
            </CardTitle>
            <CardDescription>
              Rally {selected.start} to {selected.end}.
            </CardDescription>
            <div className="relative h-12 rounded-md border border-border bg-bg-card">
              <div className="absolute inset-x-3 top-1/2 h-0.5 bg-border" />
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
          </Card>
        ) : null}
      </div>
    </div>
  )
}
