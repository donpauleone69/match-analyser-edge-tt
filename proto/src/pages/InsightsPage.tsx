import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { SectionPills, type SectionId } from '@/features/insights/InsightsScreen'
import { InsightsSectionRoute } from '@/features/insights/InsightsScreen'
import {
  InsightsFilterProvider,
  useInsightsFilters,
  activeFilterLabels,
  DEFAULT_INSIGHTS_FILTERS,
  type InsightsFilters,
} from '@/features/insights/insightsFilterContext'
import { useDemo } from '@/data/demoStore'
import { WfEmpty } from '@/layout/Wireframe'
import { Button } from '@/ui-mine'

const GLOBAL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'serve', label: 'Serve' },
  { id: 'receive', label: 'Receive' },
  { id: 'improve', label: 'Improve' },
]

function countActive(f: InsightsFilters): number {
  let n = 0
  if (f.matches !== 'All') n++
  if (f.opponent !== 'Any') n++
  if (f.tournament !== 'Any') n++
  if (f.dates !== 'Any') n++
  return n
}

function FilterPickers({
  draft,
  setDraft,
}: {
  draft: InsightsFilters
  setDraft: (next: InsightsFilters) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

/**
 * Filter control at the right of the pill row.
 * Desktop: anchored panel. Phone: bottom sheet.
 * Active chips sit under the pills only when something is set.
 */
function PillRowWithFilter({ section }: { section: SectionId }) {
  const { filters, setFilters } = useInsightsFilters()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<InsightsFilters>(filters)
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
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    if (label.startsWith('Matches:')) next.matches = 'All'
    if (label.startsWith('Opponent:')) next.opponent = 'Any'
    if (label.startsWith('Tournament:')) next.tournament = 'Any'
    if (label.startsWith('Dates:')) next.dates = 'Any'
    setFilters(next)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2 space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <SectionPills
            sections={GLOBAL_SECTIONS}
            section={section}
            basePath="/insights"
          />
        </div>
        <div className="relative shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            Filter{n > 0 ? ` (${n})` : ''}
          </Button>

          {/* Desktop panel */}
          {open ? (
            <div
              className="hidden md:block absolute right-0 top-full mt-2 z-40 w-80 rounded-lg border border-border bg-bg-surface shadow-lg p-4 space-y-3"
              role="dialog"
              aria-label="Filters"
            >
              <FilterPickers draft={draft} setDraft={setDraft} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={clear}>
                  Clear
                </Button>
                <Button size="sm" onClick={apply}>
                  Apply
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Active chips: only when something is set */}
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 min-h-0">
          {active.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => clearOne(a)}
              className="inline-flex items-center gap-1 rounded border border-border bg-pill-idle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-bg-elevated"
              aria-label={`Remove ${a}`}
            >
              {a}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Phone bottom sheet */}
      {open ? (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-50/60"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-xl border border-border bg-bg-surface p-4 pb-8 space-y-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">Filter</p>
              <button
                type="button"
                className="text-sm font-semibold text-muted"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <FilterPickers draft={draft} setDraft={setDraft} />
            <div className="flex gap-2">
              <Button fullWidth variant="ghost" onClick={clear}>
                Clear
              </Button>
              <Button fullWidth onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Desktop click-away */}
      {open ? (
        <button
          type="button"
          className="hidden md:block fixed inset-0 z-30 cursor-default"
          aria-label="Close filters"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

function sectionFromPath(pathname: string): SectionId {
  const part = pathname.split('/').pop() || 'summary'
  if (['summary', 'serve', 'receive', 'improve'].includes(part)) return part as SectionId
  return 'summary'
}

/**
 * Global Insights order: title, pills + Filter button, optional chips, content.
 * Unfiltered looks like Match Insights (no chip row).
 */
export function InsightsPage() {
  const { matches } = useDemo()
  const { pathname } = useLocation()
  const section = sectionFromPath(pathname)
  const empty = matches.length === 0

  return (
    <InsightsFilterProvider>
      <div>
        <StickyChrome>
          <PageHeader title="Insights" />
        </StickyChrome>
        {empty ? (
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <WfEmpty
              title="No insights yet"
              body="Tag matches first, or switch Prototype to Filled."
            />
          </div>
        ) : (
          <>
            <PillRowWithFilter section={section} />
            <Outlet />
          </>
        )}
      </div>
    </InsightsFilterProvider>
  )
}

export function InsightsSectionPage() {
  return <InsightsSectionRoute scope="global" chrome="body" />
}
