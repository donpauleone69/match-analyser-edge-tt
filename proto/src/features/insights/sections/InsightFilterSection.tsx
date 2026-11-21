import { useState, type ReactNode } from 'react'
import { useMediaQuery } from '@/features/tagging/hooks/useMediaQuery'
import { FilterButtonBlock } from '@/features/matches/blocks/FilterButtonBlock'
import { FilterSheet } from '@/features/matches/blocks/FilterSheetBlock'
import { DEFAULT_INSIGHTS_FILTERS, activeFilterLabels, type InsightsFilters } from '@/rules/filters'
import type { MatchRecord } from '@/types/match'
import { FilterPickersBlock } from '../blocks/FilterPickersBlock'

function countInsightsActive(f: InsightsFilters): number {
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
  const desktop = useMediaQuery('(min-width: 768px)', () => window.matchMedia('(min-width: 768px)').matches)
  const active = activeFilterLabels(filters)
  const n = countInsightsActive(filters)

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

  return (
    <>
      {renderRow(
        <FilterButtonBlock
          n={n}
          open={open}
          onClick={() => {
            setDraft(filters)
            setOpen((v) => !v)
          }}
        />,
      )}
      <FilterSheet
        active={active}
        clearOne={clearOne}
        open={open}
        setOpen={setOpen}
        clear={clear}
        apply={apply}
        show
        mode="media"
        desktop={desktop}
        desktopClass="mt-3 space-y-3 rounded-lg border border-border bg-bg-surface p-4"
        phoneClass="fixed inset-0 z-50"
        pickers={() => <FilterPickersBlock draft={draft} setDraft={setDraft} tagged={tagged} />}
      />
    </>
  )
}
