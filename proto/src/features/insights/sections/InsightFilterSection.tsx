import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, Button, Icon } from '@/ui-mine'
import { DEFAULT_INSIGHTS_FILTERS, activeFilterLabels, type InsightsFilters } from '@/rules/filters'
import type { MatchRecord } from '@/types/match'
import { FilterPickersBlock } from '../blocks/FilterPickersBlock'

function countActive(f: InsightsFilters): number {
  let n = 0
  if (f.dates !== 'Any') n++
  if (f.opponent !== 'Any') n++
  if (f.event !== 'Any') n++
  return n
}

/**
 * Filter sits in the top row. Chips and the pickers sit under it and scroll
 * away. Desktop: the pickers open in the page flow. Phone: a bottom sheet.
 */
export function InsightFilterSection({
  tagged,
  renderRow,
  filters,
  setFilters,
}: {
  tagged: MatchRecord[]
  renderRow: (end: ReactNode) => ReactNode
  filters: InsightsFilters
  setFilters: (filters: InsightsFilters) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<InsightsFilters>(filters)
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const active = activeFilterLabels(filters)
  const n = countActive(filters)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

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
    if (label.startsWith('Dates:')) {
      next.dates = 'Any'
      next.from = ''
      next.to = ''
    }
    if (label.startsWith('Opponent:')) next.opponent = 'Any'
    if (label.startsWith('Event:')) next.event = 'Any'
    setFilters(next)
  }

  const button = (
    <Pressable
      type="button"
      data-filter-surface
      data-filter-count={n}
      aria-label="Filter"
      aria-expanded={open}
      onClick={() => {
        setDraft(filters)
        setOpen((v) => !v)
      }}
      className="btn-kind-control btn-kind-square relative inline-flex shrink-0 items-center justify-center text-primary hover:bg-pill-idle"
    >
      <Icon name="filter" size="sm" />
      {n > 0 ? (
        <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-0.5 text-[9px] font-bold leading-none text-[#0b1220]">
          {n}
        </span>
      ) : null}
    </Pressable>
  )

  return (
    <>
      {renderRow(button)}
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
          {active.map((label) => (
            <Pressable
              key={label}
              type="button"
              onClick={() => clearOne(label)}
              className="btn-kind-control inline-flex items-center gap-1 rounded border border-border bg-pill-idle px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-bg-elevated"
              aria-label={`Remove ${label}`}
            >
              {label}
              <span aria-hidden>×</span>
            </Pressable>
          ))}
        </div>
      ) : null}
      <div className="px-4 sm:px-6 lg:px-8">
        {open && desktop ? (
          <div
            className="mt-3 space-y-3 rounded-lg border border-border bg-bg-surface p-4"
            data-filter-surface
            role="group"
            aria-label="Filters"
          >
            <FilterPickersBlock draft={draft} setDraft={setDraft} tagged={tagged} />
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
        {open && !desktop ? (
          <div className="fixed inset-0 z-50" data-filter-surface role="dialog" aria-label="Filters">
            <Pressable
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
              <FilterPickersBlock draft={draft} setDraft={setDraft} tagged={tagged} />
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
    </>
  )
}
