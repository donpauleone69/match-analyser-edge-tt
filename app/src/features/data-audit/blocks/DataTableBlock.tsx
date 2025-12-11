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
    green: 'bg-green-900/10',
    blue: 'bg-blue-900/10',
    neutral: 'bg-neutral-800'
  }
  
  if (data.length === 0) {
    return (
      <div className="p-4 text-sm text-neutral-500 italic border border-neutral-700 rounded">
        No data
      </div>
    )
  }
  
  return (
    <div className={cn("overflow-x-auto border border-neutral-700 rounded", className)}>
      <table className="min-w-full text-xs">
        <thead className={cn('border-b border-neutral-700', colorClasses[categoryColor])}>
          <tr>
            {fields.map(field => (
              <th 
                key={field.key} 
                className="px-2 py-2 text-left font-mono text-[10px] whitespace-nowrap text-neutral-300"
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
                'border-t border-neutral-800',
                highlightLastRow && idx === data.length - 1 && 'bg-yellow-900/20'
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

