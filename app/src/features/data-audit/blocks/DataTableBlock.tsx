/**
 * DataTableBlock - Generic table renderer for audit data
 */

import { cn } from '@/helpers/utils'
import type { FieldConfig } from '../models'
import { formatValue } from '../fieldConfig'

interface DataTableBlockProps {
  data: any[]
  fields: FieldConfig[]
  categoryColor?: 'green' | 'blue' | 'neutral'
  highlightLastRow?: boolean
  className?: string
}

export function DataTableBlock({ 
  data, 
  fields,
  categoryColor = 'neutral',
  highlightLastRow = false,
  className
}: DataTableBlockProps) {
  const colorClasses = {
    green: 'bg-result-winner-bg',
    blue: 'bg-callout-info-bg',
    neutral: 'bg-bg-elevated'
  }
  
  if (data.length === 0) {
    return (
      <div className="p-3 text-sm text-neutral-500 italic border border-dashed border-border rounded">
        No data
      </div>
    )
  }
  
  return (
    <div className={cn("overflow-x-auto border border-border rounded", className)}>
      <table className="min-w-full text-xs">
        <thead className={cn('border-b border-border', colorClasses[categoryColor])}>
          <tr>
            {fields.map(field => (
              <th 
                key={field.key} 
                className="px-2 py-1.5 text-left font-mono text-[10px] whitespace-nowrap text-neutral-500"
              >
                {field.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr 
              key={idx} 
              className={cn(
                'border-t border-border',
                highlightLastRow && idx === data.length - 1 && 'bg-callout-warning-bg'
              )}
            >
              {fields.map(field => (
                <td key={field.key} className="px-2 py-2 font-mono text-[10px] text-neutral-200">
                  {field.render 
                    ? field.render(row[field.key])
                    : formatValue(row[field.key])
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}




