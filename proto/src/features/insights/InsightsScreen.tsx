import { useMemo, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardDescription, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { WfBadge, WfEmpty } from '@/layout/Wireframe'
import { derivePhase, useDemo, type MatchRecord } from '@/data/demoStore'

export type InsightsScope = 'global' | 'match'
type SectionId = 'summary' | 'serve' | 'receive' | 'improve'

const GLOBAL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'serve', label: 'Serve' },
  { id: 'receive', label: 'Receive' },
  { id: 'improve', label: 'Improve' },
]

const MATCH_SECTIONS = GLOBAL_SECTIONS.filter((s) => s.id !== 'improve')

type Reel = { id: string; title: string; meta: string }

function sectionData(
  section: SectionId,
  scope: InsightsScope,
  match?: MatchRecord
): { stats: string; reels: Reel[] } {
  const prefix = scope === 'match' && match ? match.name : 'All matches'
  const map: Record<SectionId, { stats: string; reels: Reel[] }> = {
    summary: {
      stats:
        scope === 'match' ? 'Set scores · FA 58%' : 'Across scope · FA 54% · 3 matches',
      reels: [
        { id: 'sum-1', title: 'Highlight', meta: `${prefix} · 8 points` },
        { id: 'sum-2', title: 'Key winners', meta: `${prefix} · 5 points` },
      ],
    },
    serve: {
      stats: '1st in 62% · short 4 · long 9',
      reels: [
        { id: 'srv-1', title: 'Serve +1', meta: '6 points' },
        { id: 'srv-2', title: 'Serve faults', meta: '2 points' },
      ],
    },
    receive: {
      stats: 'Short miss 6 · deep hold 11',
      reels: [
        { id: 'rcv-1', title: 'Short receive', meta: '6 points' },
        { id: 'rcv-2', title: 'Flick return', meta: '3 points' },
      ],
    },
    improve: {
      stats: 'Priority cues this week',
      reels: [
        { id: 'imp-1', title: 'Short-ball receive', meta: '18 points · 3 matches' },
        { id: 'imp-2', title: 'Push depth on BH', meta: '9 points' },
      ],
    },
  }
  return map[section]
}

function FilterBar({
  filters,
  setFilters,
}: {
  filters: { matches: string; opponent: string; tournament: string; dates: string }
  setFilters: (next: typeof filters) => void
}) {
  const active = [
    filters.matches !== 'All' ? `Matches: ${filters.matches}` : null,
    filters.opponent !== 'Any' ? `Opponent: ${filters.opponent}` : null,
    filters.tournament !== 'Any' ? `Tournament: ${filters.tournament}` : null,
    filters.dates !== 'Any' ? `Dates: ${filters.dates}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-3 border-b border-border bg-bg-surface px-4 sm:px-6 lg:px-8 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filters</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {(
          [
            ['matches', 'Matches', ['All', 'Last 3', 'This month']],
            ['opponent', 'Opponent', ['Any', 'Sam', 'Pat', 'Lee']],
            ['tournament', 'Tournament', ['Any', 'Club night', 'Club league']],
            ['dates', 'Dates', ['Any', 'This week', 'Last 30 days']],
          ] as const
        ).map(([key, label, options]) => (
          <label key={key} className="block space-y-1">
            <span className="text-xs font-semibold text-muted">{label}</span>
            <select
              className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-primary"
              value={filters[key]}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>Active:</span>
        {active.length === 0 ? (
          <span className="font-medium text-primary">All matches</span>
        ) : (
          active.map((a) => <WfBadge key={a}>{a}</WfBadge>)
        )}
      </div>
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
  const phase = match ? derivePhase(match) : 'complete'

  if (scope === 'match' && phase !== 'complete') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <WfEmpty
          title="Nothing tagged yet"
          body={
            phase === 'new'
              ? 'Tag this match to unlock reels.'
              : 'Finish tagging to unlock reels.'
          }
        />
        <Button onClick={() => navigate(`/matches/${match!.id}/tag`)}>Go to Tag</Button>
      </div>
    )
  }

  const playing = data.reels.find((r) => r.id === playingId) ?? null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {filterNote ? <p className="text-xs text-muted">Showing: {filterNote}</p> : null}
      <Card className="space-y-3">
        <CardDescription>{data.stats}</CardDescription>

        {playing ? (
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">Reel · {playing.title}</p>
              <Button size="sm" variant="ghost" onClick={() => setPlayingId(null)}>
                Close
              </Button>
            </div>
            <div className="aspect-video rounded-md border border-dashed border-border flex items-center justify-center">
              <div className="text-center space-y-1">
                <Icon name="film" size="lg" className="mx-auto text-muted" />
                <p className="text-sm text-muted">Player stub</p>
                <p className="text-xs text-muted">{playing.meta}</p>
              </div>
            </div>
          </div>
        ) : null}

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
}: {
  scope: InsightsScope
  matchId?: string
  section: SectionId
  basePath: string
}) {
  const { mode, matches, getMatch } = useDemo()
  const match = matchId ? getMatch(matchId) : undefined
  const sections = scope === 'global' ? GLOBAL_SECTIONS : MATCH_SECTIONS
  const [filters, setFilters] = useState({
    matches: 'All',
    opponent: 'Any',
    tournament: 'Any',
    dates: 'Any',
  })

  const filterNote = useMemo(() => {
    if (scope !== 'global') return undefined
    return [
      filters.matches === 'All' ? 'All matches' : filters.matches,
      filters.opponent !== 'Any' ? filters.opponent : null,
      filters.tournament !== 'Any' ? filters.tournament : null,
      filters.dates !== 'Any' ? filters.dates : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [filters, scope])

  if (mode === 'empty' || (scope === 'global' && matches.length === 0)) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <WfEmpty title="No insights yet" body="Tag matches first, or switch Prototype to Filled." />
      </div>
    )
  }

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

  return (
    <div>
      {scope === 'global' ? <FilterBar filters={filters} setFilters={setFilters} /> : null}
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border bg-bg-surface px-4 sm:px-6 lg:px-8 pt-2"
        aria-label={scope === 'global' ? 'Insights sections' : 'Match insight sections'}
      >
        {sections.map((s) => (
          <NavLink
            key={s.id}
            to={`${basePath}/${s.id}`}
            className={({ isActive }) =>
              cn(
                'px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-muted hover:text-primary'
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <SectionBody section={section} scope={scope} match={match} filterNote={filterNote} />
    </div>
  )
}

export function InsightsSectionRoute({ scope }: { scope: InsightsScope }) {
  const { matchId, section = 'summary' } = useParams()
  const base = scope === 'global' ? '/insights' : `/matches/${matchId}/insights`
  const allowed =
    scope === 'global'
      ? ['summary', 'serve', 'receive', 'improve']
      : ['summary', 'serve', 'receive']
  const safe = (allowed.includes(section) ? section : 'summary') as SectionId
  return (
    <InsightsScreen scope={scope} matchId={matchId} section={safe} basePath={base} />
  )
}
