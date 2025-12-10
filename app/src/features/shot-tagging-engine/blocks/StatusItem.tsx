/**
 * StatusItem - 2-line status display item for StatusGrid
 * 
 * Displays top and bottom text stacked vertically:
 * - Rally (top)
 * - 6 (bottom)
 * 
 * Used for counters, player info, labels, etc.
 * Can show label+value OR custom top+bottom content.
 */

import { cn } from '@/helpers/utils'

export interface StatusItemProps {
  top: string | number
  bottom: string | number
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  topVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  bottomVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

export function StatusItem({ 
  top, 
  bottom, 
  variant = 'default',
  topVariant,
  bottomVariant,
  className 
}: StatusItemProps) {
  const variantStyles = {
    default: 'text-neutral-400',
    primary: 'text-brand-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }
  
  const topColor = topVariant || variant
  const bottomColor = bottomVariant || variant
  
  return (
    <div className={cn('flex flex-col items-center justify-center text-center leading-tight', className)}>
      <div className={cn('text-[11px] font-medium', variantStyles[topColor])}>
        {top}
      </div>
      <div className={cn('text-sm font-semibold', variantStyles[bottomColor])}>
        {bottom}
      </div>
    </div>
  )
}

