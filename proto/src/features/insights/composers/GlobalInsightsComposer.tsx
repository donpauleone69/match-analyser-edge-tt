import { useEffect, useState } from 'react'
import { Button } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import { DEFAULT_INSIGHTS_FILTERS } from '@/rules/filters'
import type { PlayItem } from '@/rules/insights'
import { useSettingsStore } from '@/stores/settingsStore'
import type { MatchRecord } from '@/types/match'
import type { SceneAt } from '@/features/tagging/models'
import { useDeriveGlobalInsights } from '../derive/deriveGlobalInsights'
import { InsightCardsSection } from '../sections/InsightCardsSection'
import { PlaylistSection } from '../sections/PlaylistSection'

type Playing = {
  cardId: string
  name: string
  items: PlayItem[]
  caption: 'name' | 'note'
}

export function GlobalInsightsComposer({ tagged, sceneAt }: { tagged: MatchRecord[]; sceneAt: SceneAt }) {
  const filters = useSettingsStore((s) => s.insightsFilters)
  const setFilters = useSettingsStore((s) => s.setInsightsFilters)
  const { kept, model, videos } = useDeriveGlobalInsights(tagged, filters)
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
        <PlaylistSection
          sceneAt={sceneAt}
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
        <InsightCardsSection model={model} playing={playing} open={open} />
      )}
    </>
  )
}
