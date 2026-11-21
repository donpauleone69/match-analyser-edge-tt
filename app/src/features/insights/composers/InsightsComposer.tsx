import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/ui-mine'
import { hasTaggedRallies } from '@/rules/match'
import { sceneAt } from '@/data/seed/script'
import { useEffect } from 'react'
import { idsForNameFilters } from '@/rules/filters'
import { useMatchStore } from '@/stores/matchStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { GlobalInsightsComposer } from './GlobalInsightsComposer'
import { InsightFilterSection } from '../sections/InsightFilterSection'

/**
 * Global Insights: the same five cards as a match, pooled across the tagged
 * matches the filter keeps. Empty until some match has tagged rallies.
 */
export function InsightsComposer() {
  const matches = useMatchStore((s) => s.matches)
  const opponents = useMatchStore((s) => s.opponents)
  const events = useMatchStore((s) => s.events)
  const filters = useSettingsStore((s) => s.insightsFilters)
  const setFilters = useSettingsStore((s) => s.setInsightsFilters)
  const tagged = matches.filter(hasTaggedRallies)

  useEffect(() => {
    const next = idsForNameFilters(filters, opponents, events)
    if (next !== filters) setFilters(next)
  }, [filters, opponents, events, setFilters])

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
          <InsightFilterSection
            filters={filters}
            setFilters={setFilters}
            opponents={opponents}
            events={events}
            renderRow={(end) => (
              <StickyChrome>
                <PageHeader title="Insights" end={end} />
              </StickyChrome>
            )}
          />
          <GlobalInsightsComposer tagged={tagged} sceneAt={sceneAt} opponents={opponents} events={events} />
        </div>
      )}
    </>
  )
}
