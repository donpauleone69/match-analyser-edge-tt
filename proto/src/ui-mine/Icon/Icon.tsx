/**
 * Icon — thin registry. Features NEVER import lucide-react directly.
 */

import { forwardRef, type SVGProps } from 'react'
import {
  ArrowLeftRight,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  Download,
  Film,
  HardDrive,
  Home,
  Info,
  List,
  LogIn,
  Pause,
  Play,
  Plus,
  Rewind,
  FastForward,
  Filter,
  Star,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  X,
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
  swap: ArrowLeftRight,
  chart: BarChart2,
  user: User,
  users: Users,
  settings: Settings,
  search: Search,
  plus: Plus,
  filter: Filter,
  film: Film,
  info: Info,
  target: Target,
  calendar: Calendar,
  cloud: Cloud,
  upload: Upload,
  download: Download,
  'hard-drive': HardDrive,
  'log-in': LogIn,
  play: Play,
  pause: Pause,
  rewind: Rewind,
  forward: FastForward,
  star: Star,
  trash: Trash2,
  undo: Undo2,
  volume: Volume2,
  'volume-off': VolumeX,
  x: X,
  list: List,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
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
