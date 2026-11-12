/**
 * ThirdBallCard (First Attack)
 *
 * Server first-attack conversion: clean winners vs lucky vs attack errors.
 * Forced-error term removed — Rally Focus does not tag forced vs unforced.
 */

import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { Zap } from 'lucide-react'
import { useDeriveThirdBallEffectiveness } from '../derive/useDeriveThirdBallEffectiveness'

export interface ThirdBallCardProps {
  filter: AnalyticsFilterModel
}

export function ThirdBallCard({ filter }: ThirdBallCardProps) {
  const { data, loading, error } = useDeriveThirdBallEffectiveness(filter)
  
  // Loading state
  if (loading) {
    return (
      <BasicInsightCardTemplate
        title="First Attack"
        subtitle="How dangerous your first attack is"
        icon={<Zap className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: 'First Attack Success %',
          description: 'First Attack Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Direct winners', description: 'of your first attacks are clean winners' },
          { value: '...', label: 'Lucky', description: 'of your first attacks end as lucky points' },
          { value: '...', label: 'Attack errors', description: 'of your first attacks end in an error' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Loading...
          </div>
        }
        insight="Loading first-attack effectiveness data..."
        coaching=""
        footer="Loading..."
      />
    )
  }
  
  // Error state
  if (error) {
    return (
      <BasicInsightCardTemplate
        title="First Attack"
        subtitle="How dangerous is your first attack?"
        icon={<Zap className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: 'First Attack Success %',
          description: 'First Attack Won',
          status: 'poor',
        }}
        secondaryMetrics={[]}
        chart={
          <div className="flex items-center justify-center h-full text-red-500 text-sm">
            {error}
          </div>
        }
        insight=""
        coaching=""
        footer=""
      />
    )
  }
  
  // No data state
  if (!data || data.metrics.thirdBallOpportunities === 0) {
    return (
      <BasicInsightCardTemplate
        title="First Attack"
        subtitle="How dangerous is your first attack?"
        icon={<Zap className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: 'First Attack Success %',
          description: 'First Attack Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Direct winners', description: 'of your first attacks are clean winners' },
          { value: 'N/A', label: 'Lucky', description: 'of your first attacks end as lucky points' },
          { value: 'N/A', label: 'Attack errors', description: 'of your first attacks end in an error' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No first-attack data available
          </div>
        }
        insight="No first-attack data available for the selected filters."
        coaching="Adjust your filters or tag more matches to see first-attack metrics."
        footer="No data"
      />
    )
  }
  
  // Format metrics
  const { metrics, status, insight, recommendation, footerText } = data
  const successPct = `${Math.round(metrics.thirdBallSuccessRate * 100)}%`
  const winnerPct = `${Math.round(metrics.thirdBallWinnerRate * 100)}%`
  const luckyPct = `${Math.round(metrics.thirdBallLuckyRate * 100)}%`
  const uePct = `${Math.round(metrics.thirdBallUnforcedErrorRate * 100)}%`
  
  return (
    <BasicInsightCardTemplate
      title="First Attack"
      subtitle="How dangerous is your first attack?"
      icon={<Zap className="h-5 w-5" />}
      primaryMetric={{
        value: successPct,
        label: 'First Attack Success %',
        description: 'First Attack Won',
        status,
      }}
      secondaryMetrics={[
        { 
          value: winnerPct, 
          label: 'Direct winners',
          description: 'of your first attacks are clean winners'
        },
        { 
          value: luckyPct, 
          label: 'Lucky',
          description: 'of your first attacks end as lucky points'
        },
        { 
          value: uePct, 
          label: 'Attack errors',
          description: 'of your first attacks end in an error'
        },
      ]}
      chart={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Chart placeholder: Success % by stroke
        </div>
      }
      insight={insight}
      coaching={recommendation}
      footer={footerText}
    />
  )
}

