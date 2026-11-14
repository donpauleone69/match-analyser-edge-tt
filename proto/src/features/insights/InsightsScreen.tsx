import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { WfBadge, WfEmpty } from '@/layout/Wireframe'
import {
  derivePhase,
  taggedSetIds,
  useDemo,
  type MatchRecord,
} from '@/data/demoStore'
import { useInsightsFilters } from '@/features/insights/insightsFilterContext'

export type InsightsScope = 'global' | 'match'
export type SectionId = 'summary' | 'serve' | 'receive' | 'improve'

const GLOBAL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'serve', label: 'Serve' },
  { id: 'receive', label: 'Receive' },
  { id: 'improve', label: 'Improve' },
]

const MATCH_SECTIONS = GLOBAL_SECTIONS.filter((s) => s.id !== 'improve')

type Reel = { id: string; title: string; meta: string }

type ImproveItem = {
  rank: number
  title: string
  why: string
  reel: Reel
}

function sectionData(
  section: SectionId,
  scope: InsightsScope,
  match?: MatchRecord
): { stats: string; reels: Reel[]; improve?: ImproveItem[] } {
  const prefix = scope === 'match' && match ? match.name : 'All matches'
  const cover =
    scope === 'match' && match
      ? (() => {
          const ids = taggedSetIds(match)
          return ids.length ? `Covers set ${ids.join(', set ')}` : ''
        })()
      : ''

  if (section === 'summary') {
    return {
      stats:
        scope === 'match'
          ? `${cover} · FA 58% · 12 winners`
          : 'Across scope · FA 54% · 3 matches · 41 points',
      reels: [
        { id: 'sum-1', title: 'Highlight', meta: `${prefix} · 8 points` },
        { id: 'sum-2', title: 'Key winners', meta: `${prefix} · 5 points` },
      ],
    }
  }
  if (section === 'serve') {
    return {
      stats:
        scope === 'match'
          ? `${cover} · 1st in 64% · short 3 · long 7`
          : '1st in 62% · short 4 · long 9 · fault 3%',
      reels: [
        { id: 'srv-1', title: 'Serve +1', meta: `${prefix} · 6 points` },
        { id: 'srv-2', title: 'Serve faults', meta: `${prefix} · 2 points` },
        { id: 'srv-3', title: 'Long serve hold', meta: `${prefix} · 4 points` },
      ],
    }
  }
  if (section === 'receive') {
    return {
      stats:
        scope === 'match'
          ? `${cover} · short miss 2 · deep hold 5`
          : 'Short miss 6 · deep hold 11 · flick 4',
      reels: [
        { id: 'rcv-1', title: 'Short receive', meta: `${prefix} · 6 points` },
        { id: 'rcv-2', title: 'Flick return', meta: `${prefix} · 3 points` },
        { id: 'rcv-3', title: 'Deep push', meta: `${prefix} · 5 points` },
      ],
    }
  }
  const improve: ImproveItem[] = [
    {
      rank: 1,
      title: 'Short-ball receive',
      why: '6 misses · 3 matches',
      reel: {
        id: 'imp-1',
        title: 'Short-ball receive',
        meta: '18 points · 3 matches',
      },
    },
    {
      rank: 2,
      title: 'Push depth on BH',
      why: '9 floats long',
      reel: { id: 'imp-2', title: 'Push depth on BH', meta: '9 points' },
    },
    {
      rank: 3,
      title: 'Serve variation',
      why: 'Same long serve 71%',
      reel: { id: 'imp-3', title: 'Serve variation', meta: '11 points' },
    },
  ]
  return {
    stats: 'Ranked work-ons this week',
    reels: improve.map((i) => i.reel),
    improve,
  }
}

/** Segmented pills inside page content (not header tabs). */
export function SectionPills({
  sections,
  section,
  basePath,
}: {
  sections: { id: SectionId; label: string }[]
  section: SectionId
  basePath: string
}) {
  const navigate = useNavigate()
  return (
    <div
      className="inline-flex flex-nowrap gap-1 p-1 rounded-lg bg-bg-elevated border border-border"
      role="tablist"
      aria-label="Insight sections"
    >
      {sections.map((s) => {
        const active = s.id === section
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => navigate(`${basePath}/${s.id}`)}
            className={cn(
              'shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
              active
                ? 'bg-bg-surface text-brand-primary shadow-sm border border-border'
                : 'text-muted hover:text-primary border border-transparent'
            )}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

function SectionBody({
  section,
  scope,
  match,
  filterNote,
}: {
  section: SectionId
  scope: InsightsScope
  match?: MatchRecord
  filterNote?: string
}) {
  const navigate = useNavigate()
  const data = sectionData(section, scope, match)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    setPlayingId(null)
  }, [section])

  if (scope === 'match' && match) {
    const tagged = taggedSetIds(match)
    if (tagged.length === 0) {
      const phase = derivePhase(match)
      return (
        <div className="space-y-3">
          <WfEmpty
            title="Nothing tagged yet"
            body={
              phase === 'new'
                ? 'Add video on Details, then tag.'
                : 'Tag a rally to unlock reels for this match.'
            }
          />
          <Button onClick={() => navigate(`/matches/${match.id}/tag`)}>Go to Tag</Button>
        </div>
      )
    }
  }

  const playing = data.reels.find((r) => r.id === playingId) ?? null

  return (
    <div className="space-y-4">
      {filterNote ? <p className="text-xs text-muted">Showing: {filterNote}</p> : null}
      {scope === 'match' && match && taggedSetIds(match).length > 0 ? (
        <p className="text-xs text-muted">
          Covers set {taggedSetIds(match).join(', set ')}.
        </p>
      ) : null}

      <Card className="space-y-3">
        <CardDescription>{data.stats}</CardDescription>

        {playing ? (
          <div className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">Reel · {playing.title}</p>
              <Button size="sm" variant="ghost" onClick={() => setPlayingId(null)}>
                Close
              </Button>
            </div>
            <div className="max-h-48 md:max-h-56 w-full rounded-md border border-dashed border-border flex items-center justify-center bg-bg-elevated">
              <div className="text-center space-y-1 py-6 px-4">
                <Icon name="film" size="lg" className="mx-auto text-muted" />
                <p className="text-sm text-muted">Player stub</p>
                <p className="text-xs text-muted">{playing.meta}</p>
              </div>
            </div>
          </div>
        ) : null}

        {section === 'improve' && data.improve ? (
          <ol className="space-y-3">
            {data.improve.map((item) => (
              <li
                key={item.reel.id}
                className="rounded-md border border-border bg-bg-card px-3 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      {item.rank}. {item.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{item.why}</p>
                  </div>
                  <WfBadge>work on</WfBadge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" onClick={() => setPlayingId(item.reel.id)}>
                    <Icon name="play" size="xs" />
                    Play evidence
                  </Button>
                  <Button size="sm" variant="secondary" disabled>
                    <Icon name="download" size="xs" />
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-2">
            {data.reels.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">{r.title}</p>
                  <p className="text-xs text-muted mt-0.5">{r.meta}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => setPlayingId(r.id)}>
                    <Icon name="play" size="xs" />
                    Play
                  </Button>
                  <Button size="sm" variant="secondary" disabled>
                    <Icon name="download" size="xs" />
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button size="sm" variant="secondary" disabled>
          <Icon name="download" size="xs" />
          Download all
        </Button>
      </Card>
    </div>
  )
}

export function InsightsScreen({
  scope,
  matchId,
  section,
  basePath,
  chrome = 'full',
}: {
  scope: InsightsScope
  matchId?: string
  section: SectionId
  basePath: string
  /** full = pills + body (match). body = content only (global chrome on InsightsPage). */
  chrome?: 'full' | 'body'
}) {
  const { getMatch } = useDemo()
  const match = matchId ? getMatch(matchId) : undefined
  const sections = scope === 'global' ? GLOBAL_SECTIONS : MATCH_SECTIONS

  if (scope === 'match' && !match) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <WfEmpty title="Match not found" body="Return to Home." />
        <div className="mt-3">
          <Link to="/home" className="text-sm font-semibold text-brand">
            Home
          </Link>
        </div>
      </div>
    )
  }

  if (chrome === 'body') {
    return <GlobalBody section={section} scope={scope} match={match} />
  }

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <SectionPills sections={sections} section={section} basePath={basePath} />
      </div>
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <SectionBody key={section} section={section} scope={scope} match={match} />
      </div>
    </div>
  )
}

function GlobalBody({
  section,
  scope,
  match,
}: {
  section: SectionId
  scope: InsightsScope
  match?: MatchRecord
}) {
  const { filters } = useInsightsFilters()
  const filterNote = useMemo(
    () =>
      [
        filters.matches === 'All' ? 'All matches' : filters.matches,
        filters.opponent !== 'Any' ? filters.opponent : null,
        filters.tournament !== 'Any' ? filters.tournament : null,
        filters.dates !== 'Any' ? filters.dates : null,
      ]
        .filter(Boolean)
        .join(' · '),
    [filters]
  )
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <SectionBody
        key={section}
        section={section}
        scope={scope}
        match={match}
        filterNote={filterNote}
      />
    </div>
  )
}

export function InsightsSectionRoute({
  scope,
  chrome = 'full',
}: {
  scope: InsightsScope
  chrome?: 'full' | 'body'
}) {
  const { matchId, section = 'summary' } = useParams()
  const base = scope === 'global' ? '/insights' : `/matches/${matchId}/insights`
  const allowed =
    scope === 'global'
      ? ['summary', 'serve', 'receive', 'improve']
      : ['summary', 'serve', 'receive']
  const safe = (allowed.includes(section) ? section : 'summary') as SectionId
  return (
    <InsightsScreen
      scope={scope}
      matchId={matchId}
      section={safe}
      basePath={base}
      chrome={chrome}
    />
  )
}
