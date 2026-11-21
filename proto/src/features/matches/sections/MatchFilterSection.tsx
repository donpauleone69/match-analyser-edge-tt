import { Pressable, Button } from '@/ui-mine'
import type { MatchListFilters } from '@/types/filters'
import type { MatchRecord } from '@/types/match'
import { MatchFilterPickersBlock } from '../blocks/MatchFilterPickersBlock'

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
    <>
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
          {active.map((a) => (
            <Pressable
              key={a}
              type="button"
              onClick={() => clearOne(a)}
              className="btn-kind-control inline-flex items-center gap-1 rounded border border-border bg-pill-idle px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-bg-elevated"
              aria-label={`Remove ${a}`}
            >
              {a}
              <span aria-hidden>×</span>
            </Pressable>
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
            <MatchFilterPickersBlock draft={draft} setDraft={setDraft} matches={matches} />
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
              <MatchFilterPickersBlock draft={draft} setDraft={setDraft} matches={matches} />
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
