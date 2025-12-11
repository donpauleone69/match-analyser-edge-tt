/**
 * BasicInsightCardTemplate — Reusable Analytics Card
 * 
 * Expandable/collapsible card template for analytics insights.
 * Click to toggle between compact (primary + insight) and expanded (all details) view.
 */

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/ui-mine/Card'
import { Badge } from '@/ui-mine/Badge'
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/helpers/utils'

export interface BasicInsightCardProps {
  // Header
  title: string
  subtitle?: string
  icon?: React.ReactNode
  tag?: {
    label: string
    color: 'green' | 'yellow' | 'red' | 'blue'
  }
  
  // Primary metric (large, prominent with description)
  primaryMetric: {
    value: string | number
    label: string
    description?: string // Short definition (1-2 lines)
    status?: 'good' | 'average' | 'poor'
  }
  
  // Secondary metrics (2-4 with descriptions, displayed 2 per row)
  secondaryMetrics?: Array<{
    value: string | number
    label: string
    description?: string // Short definition (1-2 lines)
  }>
  
  // Chart area (slot for Recharts component)
  chart?: React.ReactNode
  
  // Text sections
  insight?: string // 1-2 lines, neutral tone
  coaching?: string // 1 line, action verb
  
  // Footer
  footer?: string // Optional scope label
  
  // States
  loading?: boolean
  error?: string
}

const statusColors = {
  good: 'text-green-400',
  average: 'text-yellow-400',
  poor: 'text-red-400',
}

const tagColors = {
  green: 'bg-green-900/50 text-green-400 border-green-700',
  yellow: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  red: 'bg-red-900/50 text-red-400 border-red-700',
  blue: 'bg-blue-900/50 text-blue-400 border-blue-700',
}

export function BasicInsightCardTemplate({
  title,
  subtitle,
  icon,
  tag,
  primaryMetric,
  secondaryMetrics,
  chart,
  insight,
  coaching,
  footer,
  loading,
  error,
}: BasicInsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-neutral-700 rounded w-2/3" />
          <div className="h-12 bg-neutral-700 rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-8 bg-neutral-700 rounded w-20" />
            <div className="h-8 bg-neutral-700 rounded w-20" />
          </div>
          <div className="h-32 bg-neutral-700 rounded" />
          <div className="h-4 bg-neutral-700 rounded w-full" />
        </div>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-red-400">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    )
  }
  
  return (
    <Card 
      className={cn(
        "flex flex-col cursor-pointer transition-all hover:border-neutral-600",
        isExpanded && "border-brand-primary/30"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader className="space-y-2">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon && (
              <div className="flex-shrink-0 text-brand-primary">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-50 truncate">{title}</h3>
              {subtitle && (
                <p className="text-sm text-neutral-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tag && (
              <Badge
                variant="outline"
                className={cn(tagColors[tag.color])}
              >
                {tag.label}
              </Badge>
            )}
            {/* Expand/Collapse Indicator */}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-neutral-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-neutral-400" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4">
        {/* Primary Metric - Description on Left, Percentage on Right */}
        <div className="p-4 rounded-lg border border-neutral-700 bg-neutral-900/50">
          <div className="flex items-center justify-between gap-4">
            {primaryMetric.description && (
              <p className="text-lg text-neutral-300 leading-relaxed flex-1">
                {primaryMetric.description}
              </p>
            )}
            <div
              className={cn(
                'text-5xl font-bold flex-shrink-0',
                primaryMetric.status ? statusColors[primaryMetric.status] : 'text-neutral-50'
              )}
            >
              {primaryMetric.value}
            </div>
          </div>
        </div>
        
        {/* Insight Text - Always Visible in Collapsed State */}
        {insight && (
          <p className="text-sm text-neutral-300 leading-relaxed px-1">
            {insight}
          </p>
        )}
        
        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-3">
            {/* Secondary Metrics - Single column, percentage left / description right */}
            {secondaryMetrics && secondaryMetrics.length > 0 && (
              <div className="space-y-3">
                {secondaryMetrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-neutral-700 bg-neutral-800/50 min-h-[60px]"
                  >
                    <div className="flex items-center gap-4 h-full">
                      <div className="text-2xl font-semibold text-neutral-50 flex-shrink-0 w-16 text-center">
                        {metric.value}
                      </div>
                      {metric.description && (
                        <p className="text-sm text-neutral-300 leading-relaxed flex-1 flex items-center">
                          {metric.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Chart Area */}
            {chart && (
              <div className="min-h-[120px] rounded-lg border border-neutral-700 bg-neutral-900/50 p-3">
                {chart}
              </div>
            )}
            
            {/* Coaching Text */}
            {coaching && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
                <Lightbulb className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-primary leading-relaxed">{coaching}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Footer */}
      {footer && (
        <CardFooter className="pt-4 px-6 pb-6">
          <p className="text-xs text-neutral-500 text-center w-full">{footer}</p>
        </CardFooter>
      )}
    </Card>
  )
}

