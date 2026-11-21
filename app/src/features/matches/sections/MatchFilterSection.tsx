import type { MatchListFilters } from '@/types/filters'
import type { MatchRecord } from '@/types/match'
import { MatchFilterPickersBlock } from '../blocks/MatchFilterPickersBlock'
import { FilterSheet } from '../blocks/FilterSheetBlock'

export function MatchFilterSection({
  active,
  open,
  hasMatches,
  draft,
  setDraft,
  matches,
  clear,
  apply,
  clearOne,
  setOpen,
}: {
  active: string[]
  open: boolean
  hasMatches: boolean
  draft: MatchListFilters
  setDraft: (next: MatchListFilters) => void
  matches: MatchRecord[]
  clear: () => void
  apply: () => void
  clearOne: (label: string) => void
  setOpen: (open: boolean) => void
}) {
  return (
    <FilterSheet
      active={active}
      clearOne={clearOne}
      open={open}
      setOpen={setOpen}
      clear={clear}
      apply={apply}
      show={hasMatches}
      mode="css"
      desktop={false}
      desktopClass="mt-3 hidden rounded-lg border border-border bg-bg-surface p-4 space-y-3 md:block"
      phoneClass="fixed inset-0 z-50 md:hidden"
      pickers={() => <MatchFilterPickersBlock draft={draft} setDraft={setDraft} matches={matches} />}
    />
  )
}
