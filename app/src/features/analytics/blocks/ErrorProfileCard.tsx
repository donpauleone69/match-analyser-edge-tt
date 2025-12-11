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
          label: 'Unforced Error Rate',
          description: 'Unforced Error Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Forced errors conceded', description: 'of points are lost to opponent forcing you into errors' },
          { value: '...', label: 'Serve UEs', description: 'of your unforced errors happen on the serve' },
          { value: '...', label: 'Receive UEs', description: 'of your unforced errors happen on the receive' },
          { value: '...', label: 'Rally UEs', description: 'of your unforced errors happen in rallies (4+ shots)' },
          { value: '...', label: 'Opponent UEs', description: 'of points are won from opponent unforced errors' },
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
          label: 'Unforced Error Rate',
          description: 'Unforced Error Rate',
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
          label: 'Unforced Error Rate',
          description: 'Unforced Error Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Forced errors conceded', description: 'of points are lost to opponent forcing you into errors' },
          { value: 'N/A', label: 'Serve UEs', description: 'of your unforced errors happen on the serve' },
          { value: 'N/A', label: 'Receive UEs', description: 'of your unforced errors happen on the receive' },
          { value: 'N/A', label: 'Rally UEs', description: 'of your unforced errors happen in rallies (4+ shots)' },
          { value: 'N/A', label: 'Opponent UEs', description: 'of points are won from opponent unforced errors' },
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
  const forcedPct = `${Math.round(metrics.forcedErrorsConcededRate * 100)}%`
  const serveUEpct = `${Math.round(metrics.serveUEshare * 100)}%`
  const receiveUEpct = `${Math.round(metrics.receiveUEshare * 100)}%`
  const rallyUEpct = `${Math.round(metrics.rallyUEshare * 100)}%`
  const oppUEpct = `${Math.round(metrics.opponentUErate * 100)}%`
  
  return (
    <BasicInsightCardTemplate
      title="Error Profile"
      subtitle="Where your points are lost (and gained)"
      icon={<AlertTriangle className="h-5 w-5" />}
      primaryMetric={{
        value: uePct,
        label: 'Unforced Error Rate',
        description: 'Unforced Error Rate',
        status,
      }}
      secondaryMetrics={[
        { 
          value: forcedPct, 
          label: 'Forced errors conceded',
          description: 'of points are lost to opponent forcing you into errors'
        },
        { 
          value: serveUEpct, 
          label: 'Serve UEs',
          description: 'of your unforced errors happen on the serve'
        },
        { 
          value: receiveUEpct, 
          label: 'Receive UEs',
          description: 'of your unforced errors happen on the receive'
        },
        { 
          value: rallyUEpct, 
          label: 'Rally UEs',
          description: 'of your unforced errors happen in rallies (4+ shots)'
        },
        { 
          value: oppUEpct, 
          label: 'Opponent UEs',
          description: 'of points are won from opponent unforced errors'
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
