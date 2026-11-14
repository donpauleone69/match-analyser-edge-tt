/**
 * Icon — thin registry. Features NEVER import lucide-react directly.
 */

import { forwardRef, type SVGProps } from 'react'
import {
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Film,
  HardDrive,
  Home,
  LogIn,
  Plus,
  Search,
  Settings,
  Target,
  Upload,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/helpers/utils'

const icons = {
  home: Home,
  chart: BarChart2,
  user: User,
  users: Users,
  settings: Settings,
  search: Search,
  plus: Plus,
  film: Film,
  target: Target,
  calendar: Calendar,
  cloud: Cloud,
  upload: Upload,
  download: Download,
  'hard-drive': HardDrive,
  'log-in': LogIn,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
} as const

export type IconName = keyof typeof icons

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  label?: string
}

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

export { Icon, icons }
