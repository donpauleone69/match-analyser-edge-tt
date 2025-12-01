/**
 * Icon — Centralized icon component
 * 
 * All icon usage in features MUST go through this component.
 * Features NEVER import lucide-react directly.
 * 
 * This allows:
 * - Consistent sizing and styling
 * - Easy icon library migration
 * - Centralized icon inventory
 */

import { forwardRef, type SVGProps } from 'react'
import {
  // Navigation
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Home,
  
  // Actions
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Plus,
  Minus,
  X,
  Check,
  Trash2,
  Edit2,
  Save,
  Upload,
  Download,
  
  // Media
  Video,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  
  // Table Tennis specific
  Target,
  Crosshair,
  Circle,
  CircleDot,
  Star,
  
  // UI
  Settings,
  Info,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Menu,
  MoreHorizontal,
  MoreVertical,
  
  // Data
  BarChart2,
  TrendingUp,
  Clock,
  Calendar,
  User,
  Users,
  
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Icon name registry
const icons = {
  // Navigation
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  home: Home,
  
  // Actions
  play: Play,
  pause: Pause,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  'rotate-ccw': RotateCcw,
  plus: Plus,
  minus: Minus,
  x: X,
  check: Check,
  trash: Trash2,
  edit: Edit2,
  save: Save,
  upload: Upload,
  download: Download,
  
  // Media
  video: Video,
  'volume-on': Volume2,
  'volume-off': VolumeX,
  maximize: Maximize2,
  minimize: Minimize2,
  
  // Table Tennis
  target: Target,
  crosshair: Crosshair,
  circle: Circle,
  'circle-dot': CircleDot,
  star: Star,
  
  // UI
  settings: Settings,
  info: Info,
  alert: AlertCircle,
  warning: AlertTriangle,
  help: HelpCircle,
  menu: Menu,
  'more-h': MoreHorizontal,
  'more-v': MoreVertical,
  
  // Data
  chart: BarChart2,
  trending: TrendingUp,
  clock: Clock,
  calendar: Calendar,
  user: User,
  users: Users,
} as const

export type IconName = keyof typeof icons

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Icon name from registry */
  name: IconName
  /** Size preset or custom size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  /** Optional label for accessibility */
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
    
    if (!IconComponent) {
      console.warn(`Icon "${name}" not found in registry`)
      return null
    }
    
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

