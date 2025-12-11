/**
 * ReceivePerformanceCard
 * 
 * Analytics card for receive/return performance metrics.
 * Shows receive win rate, errors, forced errors conceded, and neutralisation rate.
 */

import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { TrendingUp } from 'lucide-react'
import { useDeriveReceivePerformance } from '../derive/useDeriveReceivePerformance'

export interface ReceivePerformanceCardProps {
  filter: AnalyticsFilterModel
}

export function ReceivePerformanceCard({ filter }: ReceivePerformanceCardProps) {
  const { data, loading, error } = useDeriveReceivePerformance(filter)
  
  // Loading state
  if (loading) {
    return (
      <BasicInsightCardTemplate
        title="Receive Performance"
        subtitle="How well do you handle their serve?"
        icon={<TrendingUp className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: 'Receive Win %',
          description: 'Receive Points Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Return errors', description: 'of your returns are errors' },
          { value: '...', label: 'Forced errors', description: 'of receive points end with you being forced into an error' },
          { value: '...', label: 'Neutralised', description: 'of your rallies as the receiver survive past the opening (5+ shots)' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Loading...
          </div>
        }
        insight="Loading receive performance data..."
        coaching=""
        footer="Loading..."
      />
    )
  }
  
  // Error state
  if (error) {
    return (
      <BasicInsightCardTemplate
        title="Receive Performance"
        subtitle="How well do you handle their serve?"
        icon={<TrendingUp className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: 'Receive Win %',
          description: 'Receive Points Won',
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
  if (!data || data.metrics.totalReceiveRallies === 0) {
    return (
      <BasicInsightCardTemplate
        title="Receive Performance"
        subtitle="How well do you handle their serve?"
        icon={<TrendingUp className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: 'Receive Win %',
          description: 'Receive Points Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Return errors', description: 'of your returns are errors' },
          { value: 'N/A', label: 'Forced errors', description: 'of receive points end with you being forced into an error' },
          { value: 'N/A', label: 'Neutralised', description: 'of your rallies as the receiver survive past the opening (5+ shots)' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No receive data available
          </div>
        }
        insight="No receive data available for the selected filters."
        coaching="Adjust your filters or tag more matches to see receive performance metrics."
        footer="No data"
      />
    )
  }
  
  // Format metrics
  const { metrics, status, insight, recommendation, footerText } = data
  const receiveWinPct = `${Math.round(metrics.receiveWinRate * 100)}%`
  const errorPct = `${Math.round(metrics.receiveUnforcedErrorRate * 100)}%`
  const forcedPct = `${Math.round(metrics.forcedErrorsConcededRate * 100)}%`
  const neutralPct = `${Math.round(metrics.neutralisationRate * 100)}%`
  
  return (
    <BasicInsightCardTemplate
      title="Receive Performance"
      subtitle="How well do you handle their serve?"
      icon={<TrendingUp className="h-5 w-5" />}
      primaryMetric={{
        value: receiveWinPct,
        label: 'Receive Win %',
        description: 'Receive Points Won',
        status,
      }}
      secondaryMetrics={[
        { 
          value: errorPct, 
          label: 'Return errors',
          description: 'of your returns are errors'
        },
        { 
          value: forcedPct, 
          label: 'Forced errors',
          description: 'of receive points end with you being forced into an error'
        },
        { 
          value: neutralPct, 
          label: 'Neutralised',
          description: 'of your rallies as the receiver survive past the opening (5+ shots)'
        },
      ]}
      chart={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Chart placeholder: Win % vs serve types
        </div>
      }
      insight={insight}
      coaching={recommendation}
      footer={footerText}
    />
  )
}

