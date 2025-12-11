/**
 * ThirdBallCard
 * 
 * Analytics card for 3rd ball attack effectiveness metrics.
 * Shows 3rd ball success rate, winners, forced errors, and unforced errors.
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
        title="3rd Ball Effectiveness"
        subtitle="How dangerous your first attack is"
        icon={<Zap className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: '3rd Ball Success %',
          description: '3rd Ball Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Direct winners', description: 'of your 3rd ball attacks are unreturnable winners' },
          { value: '...', label: 'Forced errors', description: 'of your 3rd ball attacks force opponent errors' },
          { value: '...', label: 'Attack errors', description: 'of your 3rd ball attacks are unforced errors' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Loading...
          </div>
        }
        insight="Loading 3rd ball effectiveness data..."
        coaching=""
        footer="Loading..."
      />
    )
  }
  
  // Error state
  if (error) {
    return (
      <BasicInsightCardTemplate
        title="3rd Ball Effectiveness"
        subtitle="How dangerous is your 3rd ball attack?"
        icon={<Zap className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: '3rd Ball Success %',
          description: '3rd Ball Won',
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
        title="3rd Ball Effectiveness"
        subtitle="How dangerous is your 3rd ball attack?"
        icon={<Zap className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: '3rd Ball Success %',
          description: '3rd Ball Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Direct winners', description: 'of your 3rd ball attacks are unreturnable winners' },
          { value: 'N/A', label: 'Forced errors', description: 'of your 3rd ball attacks force opponent errors' },
          { value: 'N/A', label: 'Attack errors', description: 'of your 3rd ball attacks are unforced errors' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No 3rd ball data available
          </div>
        }
        insight="No 3rd ball data available for the selected filters."
        coaching="Adjust your filters or tag more matches to see 3rd ball effectiveness metrics."
        footer="No data"
      />
    )
  }
  
  // Format metrics
  const { metrics, status, insight, recommendation, footerText } = data
  const successPct = `${Math.round(metrics.thirdBallSuccessRate * 100)}%`
  const winnerPct = `${Math.round(metrics.thirdBallWinnerRate * 100)}%`
  const forcedPct = `${Math.round(metrics.thirdBallForcedErrorRate * 100)}%`
  const uePct = `${Math.round(metrics.thirdBallUnforcedErrorRate * 100)}%`
  
  return (
    <BasicInsightCardTemplate
      title="3rd Ball Effectiveness"
      subtitle="How dangerous is your 3rd ball attack?"
      icon={<Zap className="h-5 w-5" />}
      primaryMetric={{
        value: successPct,
        label: '3rd Ball Success %',
        description: '3rd Ball Won',
        status,
      }}
      secondaryMetrics={[
        { 
          value: winnerPct, 
          label: 'Direct winners',
          description: 'of your 3rd ball attacks are unreturnable winners'
        },
        { 
          value: forcedPct, 
          label: 'Forced errors',
          description: 'of your 3rd ball attacks force opponent errors'
        },
        { 
          value: uePct, 
          label: 'Attack errors',
          description: 'of your 3rd ball attacks are unforced errors'
        },
      ]}
      chart={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Chart placeholder: Success % by shot type
        </div>
      }
      insight={insight}
      coaching={recommendation}
      footer={footerText}
    />
  )
}

