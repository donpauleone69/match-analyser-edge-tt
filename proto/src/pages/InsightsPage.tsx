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
  filterChoices,
  type InsightsFilters,
} from '@/features/insights/insightsFilterContext'
import { hasTaggedRallies, useDemo } from '@/data/demoStore'
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
  // Opponents and events come from the tagged matches, so every choice finds one.
  const { matches } = useDemo()
  const { opponents, events } = filterChoices(matches.filter(hasTaggedRallies))
  // A choice saved earlier stays listed even if its match is gone.
  const withSaved = (options: string[], saved: string) =>
    options.includes(saved) ? options : [...options, saved]
  const pickers: [keyof InsightsFilters, string, string[]][] = [
    ['matches', 'Matches', ['All', 'Last 3', 'This month']],
    ['opponent', 'Opponent', withSaved(['Any', ...opponents], draft.opponent)],
    ['tournament', 'Tournament', withSaved(['Any', ...events], draft.tournament)],
    ['dates', 'Dates', ['Any', 'This week', 'Last 30 days']],
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {pickers.map(([key, label, options]) => (
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
 * Filter button sits directly after the section pills at every width and the
 * active chips follow it. Desktop: the pickers open in the page flow, so they
 * push the reels down and never cover them. Phone: bottom sheet.
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

  // Closes on Escape and on a press anywhere outside the button and the pickers.
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
    if (label.startsWith('Matches:')) next.matches = 'All'
    if (label.startsWith('Opponent:')) next.opponent = 'Any'
    if (label.startsWith('Tournament:')) next.tournament = 'Any'
    if (label.startsWith('Dates:')) next.dates = 'Any'
    setFilters(next)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <div className="min-w-0 overflow-x-auto">
            <SectionPills sections={GLOBAL_SECTIONS} section={section} basePath="/insights" />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
            data-filter-surface
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Filter{n > 0 ? ` (${n})` : ''}
          </Button>
        </div>
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

      {/* Desktop: in the page flow, so nothing below is covered */}
      {open ? (
        <div
          className="hidden md:block rounded-lg border border-border bg-bg-surface p-4 space-y-3"
          data-filter-surface
          role="group"
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

      {/* Phone bottom sheet */}
      {open ? (
        <div
          className="md:hidden fixed inset-0 z-50"
          data-filter-surface
          role="dialog"
          aria-label="Filters"
        >
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
    </div>
  )
}

function sectionFromPath(pathname: string): SectionId {
  const part = pathname.split('/').pop() || 'summary'
  if (['summary', 'serve', 'receive', 'improve'].includes(part)) return part as SectionId
  return 'summary'
}

/**
 * Global Insights order: title, pills + Filter button + chips, content.
 * Empty until some match has tagged rallies.
 */
export function InsightsPage() {
  const { matches } = useDemo()
  const { pathname } = useLocation()
  const section = sectionFromPath(pathname)
  const empty = !matches.some(hasTaggedRallies)

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
              body="Tag a rally in any match to see insights."
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
