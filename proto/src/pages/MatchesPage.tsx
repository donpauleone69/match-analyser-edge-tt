import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty, WfWarnBadge } from '@/layout/Wireframe'
import { matchDiffers, matchLabel } from '@/features/match/matchChecks'
import { setInProgress } from '@/features/tagging/matchOps'
import {
  defaultMatchTab,
  derivePhase,
  isArchived,
  matchMeta,
  phaseLabel,
  useDemo,
  type MatchRecord,
} from '@/data/demoStore'
import {
  activeFilterLabels,
  DEFAULT_INSIGHTS_FILTERS,
  filterChoices,
  filterMatches,
  type InsightsFilters,
} from '@/features/insights/insightsFilterContext'

const FILTER_KEY = 'proto-matches-filters'

function readFilters(): InsightsFilters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY)
    if (!raw) return DEFAULT_INSIGHTS_FILTERS
    const parsed = JSON.parse(raw) as Partial<InsightsFilters>
    return { ...DEFAULT_INSIGHTS_FILTERS, ...parsed, matches: 'All' }
  } catch {
    return DEFAULT_INSIGHTS_FILTERS
  }
}

function countActive(f: InsightsFilters): number {
  let n = 0
  if (f.opponent !== 'Any') n++
  if (f.tournament !== 'Any') n++
  if (f.dates !== 'Any') n++
  return n
}

/** The set a part tagged match can resume, when one is open. */
function continueSet(match: MatchRecord) {
  if (derivePhase(match) !== 'partial' || match.videos.length === 0 || isArchived(match)) return null
  return setInProgress(match)
}

/**
 * Opponent, Tournament and Dates. The Matches picker stays on Insights.
 * Choices come from every match, so an untagged one can still be found.
 */
function MatchFilterPickers({
  draft,
  setDraft,
  matches,
}: {
  draft: InsightsFilters
  setDraft: (next: InsightsFilters) => void
  matches: MatchRecord[]
}) {
  const { opponents, events } = filterChoices(matches)
  const withSaved = (options: string[], saved: string) =>
    options.includes(saved) ? options : [...options, saved]
  const all: [keyof InsightsFilters, string, string[]][] = [
    ['opponent', 'Opponent', withSaved(['Any', ...opponents], draft.opponent)],
    ['tournament', 'Tournament', withSaved(['Any', ...events], draft.tournament)],
    ['dates', 'Dates', ['Any', 'This week', 'Last 30 days']],
  ]
  const pickers = all.filter(([, , options]) => options.length > 1)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {pickers.map(([key, label, options]) => (
        <label key={key} className="block space-y-1">
          <span className="text-xs font-semibold text-muted">{label}</span>
          <select
            className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
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
  )
}

export function MatchesPage() {
  const navigate = useNavigate()
  const { matches, createMatch } = useDemo()
  const [filters, setFiltersState] = useState<InsightsFilters>(readFilters)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<InsightsFilters>(filters)
  const setFilters = (next: InsightsFilters) => {
    const stored = { ...next, matches: 'All' as const }
    setFiltersState(stored)
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(stored))
    } catch {
      /* ignore */
    }
  }
  const shown = filterMatches(matches, filters)
  const active = activeFilterLabels(filters)
  const n = countActive(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPress = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null
      if (!el?.closest('[data-filter-surface]')) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPress)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPress)
    }
  }, [open])

  const apply = () => {
    setFilters(draft)
    setOpen(false)
  }
  const clear = () => {
    setDraft(DEFAULT_INSIGHTS_FILTERS)
    setFilters(DEFAULT_INSIGHTS_FILTERS)
    setOpen(false)
  }
  const clearOne = (label: string) => {
    const next = { ...filters }
    if (label.startsWith('Opponent:')) next.opponent = 'Any'
    if (label.startsWith('Tournament:')) next.tournament = 'Any'
    if (label.startsWith('Dates:')) next.dates = 'Any'
    setFilters(next)
  }
  const onNew = () => {
    const created = createMatch()
    navigate(`/matches/${created.id}/details`)
  }

  const filterButton = (
    <button
      type="button"
      data-filter-surface
      data-filter-count={n}
      aria-label="Filter"
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className="btn-kind-control btn-kind-square relative inline-flex shrink-0 items-center justify-center text-primary hover:bg-pill-idle"
    >
      <Icon name="filter" size="sm" />
      {n > 0 ? (
        <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-0.5 text-[9px] font-bold leading-none text-[#0b1220]">
          {n}
        </span>
      ) : null}
    </button>
  )

  return (
    <div>
      <StickyChrome>
        <PageHeader
          title="Matches"
          end={
            <div className="flex shrink-0 items-stretch">
              {filterButton}
              <button
                type="button"
                onClick={onNew}
                className="btn-kind-control inline-flex shrink-0 items-center gap-1 px-3 text-sm font-semibold text-brand"
              >
                <Icon name="plus" size="xs" />
                New
              </button>
            </div>
          }
        />
      </StickyChrome>
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
          {active.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => clearOne(a)}
              className="btn-kind-control inline-flex items-center gap-1 rounded border border-border bg-pill-idle px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-bg-elevated"
              aria-label={`Remove ${a}`}
            >
              {a}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="px-4 sm:px-6 lg:px-8">
        {open ? (
          <div
            className="mt-3 hidden rounded-lg border border-border bg-bg-surface p-4 space-y-3 md:block"
            data-filter-surface
            role="group"
            aria-label="Filters"
          >
            <MatchFilterPickers draft={draft} setDraft={setDraft} matches={matches} />
            <div className="flex justify-end gap-2">
              <Button kind="control" variant="ghost" onClick={clear}>
                Clear
              </Button>
              <Button kind="control" onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        ) : null}
        {open ? (
          <div className="fixed inset-0 z-50 md:hidden" data-filter-surface role="dialog" aria-label="Filters">
            <button
              type="button"
              className="absolute inset-0 bg-neutral-50/60"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[100dvh] space-y-3 overflow-auto rounded-t-xl border border-border bg-bg-surface p-4 pb-8 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">Filter</p>
                <Button kind="control" variant="ghost" className="shrink-0 px-2" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
              <MatchFilterPickers draft={draft} setDraft={setDraft} matches={matches} />
              <div className="flex gap-2">
                <Button fullWidth kind="control" variant="ghost" onClick={clear}>
                  Clear
                </Button>
                <Button fullWidth kind="control" onClick={apply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <div className="space-y-3 px-4 py-6 sm:px-6 lg:px-8">
          <WfEmpty title="No matches" body="Create a match or switch Prototype to Filled." />
          <Button fullWidth kind="main" onClick={onNew}>
            <Icon name="plus" size="xs" />
            New match
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <WfEmpty title="Nothing fits this filter" />
        </div>
      ) : (
        <ul>
          {shown.map((m) => {
            const phase = derivePhase(m)
            const resume = continueSet(m)
            return (
              <li key={m.id} className="flex items-center border-b border-border" data-match-row={m.id}>
                <Link
                  to={`/matches/${m.id}/${defaultMatchTab(phase)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-bg-elevated sm:px-6 lg:px-8"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">{matchLabel(m)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {matchMeta(m)}
                      {matchDiffers(m) ? <WfWarnBadge>Differs</WfWarnBadge> : null}
                    </span>
                  </span>
                  {resume ? null : <WfBadge>{phaseLabel(phase)}</WfBadge>}
                </Link>
                {resume ? (
                  <div className="shrink-0 pr-4 sm:pr-6 lg:pr-8">
                    <button
                      type="button"
                      data-continue-set={resume.setId}
                      onClick={() => navigate(`/matches/${m.id}/tag/${resume.setId}`)}
                      className="btn-kind-control rounded-md bg-brand-primary px-3 text-xs font-semibold text-on-accent"
                    >
                      Continue set {resume.setId}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
