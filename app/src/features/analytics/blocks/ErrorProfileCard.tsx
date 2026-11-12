/**
 * ErrorProfileCard
 * 
 * Analytics card for error profile metrics.
 * Shows where errors happen and their impact on points.
 */

import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { AlertTriangle } from 'lucide-react'
import { useDeriveErrorProfile } from '../derive/useDeriveErrorProfile'

export interface ErrorProfileCardProps {
  filter: AnalyticsFilterModel
}

export function ErrorProfileCard({ filter }: ErrorProfileCardProps) {
  const { data, loading, error } = useDeriveErrorProfile(filter)
  
  // Loading state
  if (loading) {
    return (
      <BasicInsightCardTemplate
        title="Error Profile"
        subtitle="Where your points are lost (and gained)"
        icon={<AlertTriangle className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: 'Error Rate',
          description: 'Error Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Serve errors', description: 'of your errors happen on the serve' },
          { value: '...', label: 'Receive errors', description: 'of your errors happen on the receive' },
          { value: '...', label: 'Attack errors', description: 'of your errors happen on the first-attack exchange' },
          { value: '...', label: 'Continuation errors', description: 'of your errors happen in continuation' },
          { value: '...', label: 'Opponent errors', description: 'of points are won from opponent errors' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Loading...
          </div>
        }
        insight="Loading error profile data..."
        coaching=""
        footer="Loading..."
      />
    )
  }
  
  // Error state
  if (error) {
    return (
      <BasicInsightCardTemplate
        title="Error Profile"
        subtitle="Where your points are lost (and gained)"
        icon={<AlertTriangle className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: 'Error Rate',
          description: 'Error Rate',
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
  if (!data || data.metrics.totalRalliesPlayed === 0) {
    return (
      <BasicInsightCardTemplate
        title="Error Profile"
        subtitle="Where your points are lost (and gained)"
        icon={<AlertTriangle className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: 'Error Rate',
          description: 'Error Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Serve errors', description: 'of your errors happen on the serve' },
          { value: 'N/A', label: 'Receive errors', description: 'of your errors happen on the receive' },
          { value: 'N/A', label: 'Attack errors', description: 'of your errors happen on the first-attack exchange' },
          { value: 'N/A', label: 'Continuation errors', description: 'of your errors happen in continuation' },
          { value: 'N/A', label: 'Opponent errors', description: 'of points are won from opponent errors' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No data available
          </div>
        }
        insight="Not enough data to analyze error profile."
        coaching=""
        footer="No data"
      />
    )
  }
  
  // Format metrics
  const { metrics, status, insight, recommendation, footerText } = data
  const uePct = `${Math.round(metrics.unforcedErrorRate * 100)}%`
  const serveUEpct = `${Math.round(metrics.serveUEshare * 100)}%`
  const receiveUEpct = `${Math.round(metrics.receiveUEshare * 100)}%`
  const attackUEpct = `${Math.round(metrics.attackUEshare * 100)}%`
  const rallyUEpct = `${Math.round(metrics.rallyUEshare * 100)}%`
  const oppUEpct = `${Math.round(metrics.opponentUErate * 100)}%`
  
  return (
    <BasicInsightCardTemplate
      title="Error Profile"
      subtitle="Where your points are lost (and gained)"
      icon={<AlertTriangle className="h-5 w-5" />}
      primaryMetric={{
        value: uePct,
        label: 'Error Rate',
        description: 'Error Rate',
        status,
      }}
      secondaryMetrics={[
        { 
          value: serveUEpct, 
          label: 'Serve errors',
          description: 'of your errors happen on the serve'
        },
        { 
          value: receiveUEpct, 
          label: 'Receive errors',
          description: 'of your errors happen on the receive'
        },
        { 
          value: attackUEpct, 
          label: 'Attack errors',
          description: 'of your errors happen on the first-attack exchange'
        },
        { 
          value: rallyUEpct, 
          label: 'Continuation errors',
          description: 'of your errors happen in continuation'
        },
        { 
          value: oppUEpct, 
          label: 'Opponent errors',
          description: 'of points are won from opponent errors'
        },
      ]}
      chart={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Chart placeholder
        </div>
      }
      insight={insight}
      coaching={recommendation}
      footer={footerText}
    />
  )
}
