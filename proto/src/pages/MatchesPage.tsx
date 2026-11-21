import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/layout/Wireframe'
import { matchName, matchRowLine, matchRowStatus } from '@/rules/matchStatus'
import { derivePhase } from '@/rules/match'
import { useDemo } from '@/data/demoStore'
import type { MatchRecord } from '@/types/match'
import { filterChoices } from '@/rules/filters'

const FILTER_KEY = 'proto-matches-filters'

type MatchStatus = 'Any' | 'Not tagged' | 'Part tagged' | 'Tagged'

type MatchListFilters = {
  opponent: string
  event: string
  status: MatchStatus
}

const DEFAULT_FILTERS: MatchListFilters = {
  opponent: 'Any',
  event: 'Any',
  status: 'Any',
}

const STATUSES: MatchStatus[] = ['Any', 'Not tagged', 'Part tagged', 'Tagged']

function readFilters(): MatchListFilters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY)
    if (!raw) return DEFAULT_FILTERS
    const parsed = JSON.parse(raw) as Partial<MatchListFilters> & { tournament?: string }
    const status = STATUSES.includes(parsed.status as MatchStatus)
      ? (parsed.status as MatchStatus)
      : 'Any'
    return {
      opponent: parsed.opponent || 'Any',
      event: parsed.event || parsed.tournament || 'Any',
      status,
    }
  } catch {
    return DEFAULT_FILTERS
  }
}

function countActive(f: MatchListFilters): number {
  let n = 0
  if (f.opponent !== 'Any') n++
  if (f.event !== 'Any') n++
  if (f.status !== 'Any') n++
  return n
}

function matchesStatus(match: MatchRecord, status: MatchStatus): boolean {
  if (status === 'Any') return true
  const phase = derivePhase(match)
  if (status === 'Not tagged') return phase === 'new' || phase === 'ready'
  if (status === 'Part tagged') return phase === 'partial'
  return phase === 'complete'
}

function filterMatchList(matches: MatchRecord[], f: MatchListFilters): MatchRecord[] {
  return matches.filter((m) => {
    if (f.opponent !== 'Any' && m.opponent.trim() !== f.opponent) return false
    if (f.event !== 'Any' && m.event.trim() !== f.event) return false
    return matchesStatus(m, f.status)
  })
}

function activeLabels(f: MatchListFilters): string[] {
  const out: string[] = []
  if (f.opponent !== 'Any') out.push(`Opponent: ${f.opponent}`)
  if (f.event !== 'Any') out.push(`Event: ${f.event}`)
  if (f.status !== 'Any') out.push(`Status: ${f.status}`)
  return out
}

function MatchFilterPickers({
  draft,
  setDraft,
  matches,
}: {
  draft: MatchListFilters
  setDraft: (next: MatchListFilters) => void
  matches: MatchRecord[]
}) {
  const { opponents, events } = filterChoices(matches)
  const withSaved = (options: string[], saved: string) =>
    options.includes(saved) ? options : [...options, saved]
  const pickers: { key: keyof MatchListFilters; label: string; options: string[] }[] = [
    { key: 'opponent', label: 'Opponent', options: withSaved(['Any', ...opponents], draft.opponent) },
    { key: 'event', label: 'Event', options: withSaved(['Any', ...events], draft.event) },
    { key: 'status', label: 'Status', options: STATUSES },
  ]
  return (
    <div className="grid grid-cols-1 gap-3">
      {pickers
        .filter((picker) => picker.options.length > 1)
        .map((picker) => (
          <label key={picker.key} className="block space-y-1">
            <span className="text-xs font-semibold text-muted">{picker.label}</span>
            <select
              className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
              value={draft[picker.key]}
              onChange={(e) => setDraft({ ...draft, [picker.key]: e.target.value })}
            >
              {picker.options.map((o) => (
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
  const [filters, setFiltersState] = useState<MatchListFilters>(readFilters)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MatchListFilters>(filters)
  const setFilters = (next: MatchListFilters) => {
    setFiltersState(next)
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  const shown = filterMatchList(matches, filters)
  const active = activeLabels(filters)
  const n = countActive(filters)
  const hasMatches = matches.length > 0

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
    setDraft(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setOpen(false)
  }
  const clearOne = (label: string) => {
    const next = { ...filters }
    if (label.startsWith('Opponent:')) next.opponent = 'Any'
    if (label.startsWith('Event:')) next.event = 'Any'
    if (label.startsWith('Status:')) next.status = 'Any'
    setFilters(next)
  }
  const onNew = () => {
    const created = createMatch()
    navigate(`/matches/${created.id}/details`)
  }

  const filterButton = hasMatches ? (
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
  ) : null

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
        {open && hasMatches ? (
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
        {open && hasMatches ? (
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
          <WfEmpty title="No matches yet" />
          <Button fullWidth kind="main" onClick={onNew}>
            <Icon name="plus" size="xs" />
            New match
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="space-y-3 px-4 py-6 sm:px-6 lg:px-8">
          <WfEmpty title="Nothing fits this filter" />
          <Button fullWidth kind="main" onClick={clear}>
            Clear filter
          </Button>
        </div>
      ) : (
        <ul>
          {shown.map((m) => {
            const status = matchRowStatus(m)
            const line = matchRowLine(m)
            const to =
              status.tab === 'details'
                ? `/matches/${m.id}/details#result`
                : `/matches/${m.id}/${status.tab}`
            return (
              <li key={m.id} className="flex items-center border-b border-border" data-match-row={m.id} data-row-status={status.kind}>
                <Link
                  to={to}
                  className="flex min-h-[62px] min-w-0 flex-1 items-center px-4 py-3 hover:bg-bg-elevated sm:px-6 lg:px-8"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-primary">{matchName(m)}</span>
                    <span className="mt-0.5 block h-4 truncate text-xs text-muted">{line}</span>
                  </span>
                  {status.kind === 'continue' ? null : (
                    <span className="ml-3 shrink-0 text-right text-xs text-muted">{status.text}</span>
                  )}
                </Link>
                {status.kind === 'continue' && status.setId !== null ? (
                  <div className="shrink-0 pr-4 sm:pr-6 lg:pr-8">
                    <Button
                      kind="control"
                      variant="secondary"
                      data-continue-set={status.setId}
                      onClick={() => navigate(`/matches/${m.id}/tag/${status.setId}`)}
                    >
                      {status.text}
                    </Button>
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
