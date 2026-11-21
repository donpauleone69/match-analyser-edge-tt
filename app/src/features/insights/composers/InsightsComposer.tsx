import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/ui-mine'
import { hasTaggedRallies } from '@/rules/match'
import { sceneAt } from '@/data/seed/script'
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
  const filters = useSettingsStore((s) => s.insightsFilters)
  const setFilters = useSettingsStore((s) => s.setInsightsFilters)
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
          <InsightFilterSection
            tagged={tagged}
            filters={filters}
            setFilters={setFilters}
            renderRow={(end) => (
              <StickyChrome>
                <PageHeader title="Insights" end={end} />
              </StickyChrome>
            )}
          />
          <GlobalInsightsComposer tagged={tagged} sceneAt={sceneAt} />
        </div>
      )}
    </>
  )
}
