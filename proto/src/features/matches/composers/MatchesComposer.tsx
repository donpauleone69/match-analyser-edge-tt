import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { useMatchStore } from '@/stores/matchStore'
import {
  DEFAULT_MATCH_LIST_FILTERS as DEFAULT_FILTERS,
  type MatchListFilters,
} from '@/types/filters'
import { useSettingsStore } from '@/stores/settingsStore'
import { FilterButtonBlock } from '../blocks/FilterButtonBlock'
import { useDeriveMatchList } from '../derive/deriveMatchList'
import { MatchFilterSection } from '../sections/MatchFilterSection'
import { MatchListSection } from '../sections/MatchListSection'

export function MatchesComposer() {
  const navigate = useNavigate()
  const matches = useMatchStore((s) => s.matches)
  const createMatch = useMatchStore((s) => s.createMatch)
  const filters = useSettingsStore((s) => s.matchesFilters)
  const setFilters = useSettingsStore((s) => s.setMatchesFilters)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MatchListFilters>(filters)
  const { shown, active, n, hasMatches } = useDeriveMatchList(matches, filters)

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

  return (
    <div>
      <StickyChrome>
        <PageHeader
          title="Matches"
          end={
            <div className="flex shrink-0 items-stretch">
              {hasMatches ? (
                <FilterButtonBlock n={n} open={open} onClick={() => setOpen((v) => !v)} />
              ) : null}
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
      <MatchFilterSection
        active={active}
        open={open}
        hasMatches={hasMatches}
        draft={draft}
        setDraft={setDraft}
        matches={matches}
        clear={clear}
        apply={apply}
        clearOne={clearOne}
        setOpen={setOpen}
      />
      <MatchListSection matches={matches} shown={shown} onNew={onNew} clear={clear} navigate={navigate} />
    </div>
  )
}
