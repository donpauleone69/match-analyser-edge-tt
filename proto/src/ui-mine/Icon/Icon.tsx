/**
 * Icon — thin registry. Features NEVER import lucide-react directly.
 */

import { forwardRef } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/helpers/utils'
import { icons } from './icons'
import type { IconProps } from './types'

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 'md', label, className, ...props }, ref) => {
    const IconComponent = icons[name] as LucideIcon
    if (!IconComponent) return null
    const pixelSize = typeof size === 'number' ? size : sizeMap[size]
    return (
      <IconComponent
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        aria-label={label}
        aria-hidden={!label}
        className={cn('shrink-0', className)}
        {...props}
      />
    )
  }
)

Icon.displayName = 'Icon'

export { Icon }
