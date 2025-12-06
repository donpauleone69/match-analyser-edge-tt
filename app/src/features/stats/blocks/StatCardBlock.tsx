/**
 * StatCardBlock - Display a single statistic with optional confidence badge
 */

import { Card } from '@/ui-mine'
import type { ConfidenceBadge } from '../models'

interface StatCardBlockProps {
  label: string
  value: string | number
  confidence?: ConfidenceBadge
  tooltip?: string
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'highlight' | 'warning'
}

export function StatCardBlock({
  label,
  value,
  confidence,
  tooltip,
  trend,
  variant = 'default',
}: StatCardBlockProps) {
  const confidenceColors: Record<ConfidenceBadge, string> = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  }
  
  const confidenceLabels: Record<ConfidenceBadge, string> = {
    high: '✓ High',
    medium: '⚠ Est.',
    low: '❌ Low',
  }
  
  const variantStyles: Record<string, string> = {
    default: 'bg-white border-gray-200',
    highlight: 'bg-blue-50 border-blue-300',
    warning: 'bg-red-50 border-red-300',
  }
  
  return (
    <Card className={`p-4 ${variantStyles[variant]}`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{label}</span>
          {confidence && (
            <span className={`text-xs px-2 py-1 rounded ${confidenceColors[confidence]}`}>
              {confidenceLabels[confidence]}
            </span>
          )}
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : value}
            {typeof value === 'number' && '%'}
          </span>
          
          {trend && trend !== 'neutral' && (
            <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </div>
        
        {tooltip && (
          <p className="text-xs text-gray-500 mt-1">{tooltip}</p>
        )}
      </div>
    </Card>
  )
}

