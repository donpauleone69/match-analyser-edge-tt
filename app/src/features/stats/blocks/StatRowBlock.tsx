/**
 * StatRowBlock - Display a statistic as a table row
 */

interface StatRowBlockProps {
  label: string
  value: string | number
  subValue?: string | number
  confidence?: 'high' | 'medium' | 'low'
}

export function StatRowBlock({ label, value, subValue, confidence }: StatRowBlockProps) {
  const confidenceIcons = {
    high: '✓',
    medium: '⚠',
    low: '❌',
  }
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        {subValue !== undefined && (
          <span className="text-sm text-gray-500">
            ({typeof subValue === 'number' ? subValue.toFixed(1) : subValue})
          </span>
        )}
        <span className="text-sm font-medium text-gray-900">
          {typeof value === 'number' ? value.toFixed(1) : value}
          {typeof value === 'number' && '%'}
        </span>
        {confidence && (
          <span className="text-xs">{confidenceIcons[confidence]}</span>
        )}
      </div>
    </div>
  )
}

