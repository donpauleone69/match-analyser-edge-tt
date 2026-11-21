import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/layout/Wireframe'
import { Button, Icon } from '@/ui-mine'
import { hasTaggedRallies } from '@/rules/match'
import { useMatchStore } from '@/stores/matchStore'
import type { MatchRecord, VideoAsset } from '@/types/match'
import { InsightCard } from '@/features/insights/InsightCard'
import { insightRules, insightsFor, type PlayItem } from '@/rules/insights'
import { PlaylistPlayer } from '@/features/insights/PlaylistPlayer'
import {
  DATE_CHOICES,
  DEFAULT_INSIGHTS_FILTERS,
  activeFilterLabels,
  filterChoices,
  filterIsSet,
  filterMatches,
} from '@/rules/filters'
import { useSettingsStore } from '@/stores/settingsStore'
import type { InsightsFilters } from '@/features/insights/models'

function countActive(f: InsightsFilters): number {
  let n = 0
  if (f.dates !== 'Any') n++
  if (f.opponent !== 'Any') n++
  if (f.event !== 'Any') n++
  return n
}

function FilterPickers({
  draft,
  setDraft,
  tagged,
}: {
  draft: InsightsFilters
  setDraft: (next: InsightsFilters) => void
  tagged: MatchRecord[]
}) {
  const { opponents, events } = filterChoices(tagged)
  const withSaved = (options: string[], saved: string) => (options.includes(saved) ? options : [...options, saved])
  const pickers: { key: 'dates' | 'opponent' | 'event'; label: string; options: string[] }[] = [
    { key: 'dates', label: 'Dates', options: [...DATE_CHOICES] },
    { key: 'opponent', label: 'Opponent', options: withSaved(['Any', ...opponents], draft.opponent) },
    { key: 'event', label: 'Event', options: withSaved(['Any', ...events], draft.event) },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              {picker.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      {draft.dates === 'From and to' ? (
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">From</span>
            <input
              type="date"
              aria-label="From"
              className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">To</span>
            <input
              type="date"
              aria-label="To"
              className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Filter sits in the top row. Chips and the pickers sit under it and scroll
 * away. Desktop: the pickers open in the page flow. Phone: a bottom sheet.
 */
function InsightsFilter({
  tagged,
  renderRow,
}: {
  tagged: MatchRecord[]
  renderRow: (end: ReactNode) => ReactNode
}) {
  const filters = useSettingsStore((s) => s.insightsFilters)
  const setFilters = useSettingsStore((s) => s.setInsightsFilters)
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
    <button
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
    </button>
  )

  return (
    <>
      {renderRow(button)}
      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
          {active.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => clearOne(label)}
              className="btn-kind-control inline-flex items-center gap-1 rounded border border-border bg-pill-idle px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-bg-elevated"
              aria-label={`Remove ${label}`}
            >
              {label}
              <span aria-hidden>×</span>
            </button>
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
            <FilterPickers draft={draft} setDraft={setDraft} tagged={tagged} />
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
              <FilterPickers draft={draft} setDraft={setDraft} tagged={tagged} />
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

type Playing = {
  cardId: string
  name: string
  items: PlayItem[]
  caption: 'name' | 'note'
}

function videosOf(matches: MatchRecord[]): VideoAsset[] {
  const seen = new Set<string>()
  const out: VideoAsset[] = []
  for (const match of matches) {
    for (const video of match.videos) {
      if (seen.has(video.id)) continue
      seen.add(video.id)
      out.push(video)
    }
  }
  return out
}

function GlobalCards({ tagged }: { tagged: MatchRecord[] }) {
  const filters = useSettingsStore((s) => s.insightsFilters)
  const setFilters = useSettingsStore((s) => s.setInsightsFilters)
  const kept = useMemo(() => filterMatches(tagged, filters), [tagged, filters])
  const opponent = filters.opponent === 'Any' ? '' : filters.opponent
  const model = useMemo(
    () => insightsFor(kept, insightRules('global', opponent, filterIsSet(filters)), tagged),
    [kept, opponent, filters, tagged],
  )
  const videos = useMemo(() => videosOf(kept), [kept])
  const [playing, setPlaying] = useState<Playing | null>(null)

  useEffect(() => {
    setPlaying(null)
  }, [filters])

  useEffect(() => {
    if (!playing) return
    document.querySelector(`[data-insight="${playing.cardId}"]`)?.scrollIntoView({ block: 'start' })
  }, [playing])

  const open = (cardId: string, name: string, items: PlayItem[], caption: 'name' | 'note') => {
    setPlaying({ cardId, name, items, caption })
  }

  const clear = () => setFilters(DEFAULT_INSIGHTS_FILTERS)

  return (
    <>
      {playing ? (
        <PlaylistPlayer
          videos={videos}
          name={playing.name}
          items={playing.items}
          caption={playing.caption}
          showVersus
          onClose={() => setPlaying(null)}
        />
      ) : null}
      {kept.length === 0 ? (
        <div className="space-y-3 px-4 py-6 sm:px-6 lg:px-8">
          <WfEmpty title="Nothing fits this filter" />
          <Button fullWidth kind="main" onClick={clear}>
            Clear filter
          </Button>
        </div>
      ) : (
        <div className="insights-cards space-y-3 px-4 py-4 sm:px-6 lg:px-8">
          {model.coverage ? (
            <p className="text-sm text-muted" data-coverage="">
              {model.coverage}
            </p>
          ) : null}
          {model.videoLine ? <p className="text-sm text-muted">{model.videoLine}</p> : null}
          {model.cards.map((card) => (
            <InsightCard
              key={card.id}
              card={card}
              playing={playing?.cardId === card.id}
              onPlay={() => card.playlist && open(card.id, card.playlist.name, card.playlist.items, card.playlist.caption)}
            />
          ))}
          {model.marked?.playlist ? (
            <InsightCard
              card={model.marked}
              playing={playing?.cardId === model.marked.id}
              onPlay={() =>
                model.marked?.playlist &&
                open(model.marked.id, model.marked.playlist.name, model.marked.playlist.items, model.marked.playlist.caption)
              }
            />
          ) : null}
        </div>
      )}
    </>
  )
}

/**
 * Global Insights: the same five cards as a match, pooled across the tagged
 * matches the filter keeps. Empty until some match has tagged rallies.
 */
export function InsightsPage() {
  const matches = useMatchStore((s) => s.matches)
  const tagged = matches.filter(hasTaggedRallies)

  return (
    <>
      {tagged.length === 0 ? (
        <>
          <StickyChrome>
            <PageHeader title="Insights" />
          </StickyChrome>
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <WfEmpty title="No insights yet" body="Tag a rally in any match to see insights." />
          </div>
        </>
      ) : (
        <div className="insights-page">
          <InsightsFilter
            tagged={tagged}
            renderRow={(end) => (
              <StickyChrome>
                <PageHeader title="Insights" end={end} />
              </StickyChrome>
            )}
          />
          <GlobalCards tagged={tagged} />
        </div>
      )}
    </>
  )
}
