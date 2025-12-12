/**
 * ui-mine — Shared UI Kit
 * 
 * Features import from here, NEVER from @/components/ui directly.
 * This layer wraps shadcn primitives with project theming.
 */

// Base components
export { Button, type ButtonProps } from './Button'
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  type CardProps,
} from './Card'
export { Badge, type BadgeProps, badgeVariants } from './Badge'
export { BasicInsightCardTemplate, type BasicInsightCardProps } from './BasicInsightCardTemplate'

// Icon system
export { Icon, icons, type IconName, type IconProps } from './Icon'

// Grid components
export { SpinGrid, SPIN_LABELS, SPIN_SHORT_LABELS, type SpinGridProps } from './SpinGrid'
export { LandingZoneGrid, ZONE_LABELS, ZONE_SHORT_LABELS, type LandingZoneGridProps } from './LandingZoneGrid'
export { PositionGrid, POSITION_LABELS, POSITION_SHORT_LABELS, type PositionGridProps } from './PositionGrid'

// Video components
export { SpeedControls, TAGGING_SPEEDS, FF_SPEEDS, formatSpeed, type SpeedControlsProps } from './SpeedControls'
export { VideoPlayer } from './VideoPlayer'
export type { VideoPlayerHandle, ConstrainedPlayback } from './VideoPlayer'
export { SpeedSettingsModal, type SpeedSettingsModalProps } from './SpeedSettingsModal'
export { SpeedSettingsButton, type SpeedSettingsButtonProps } from './SpeedSettingsButton'

// Table Tennis Buttons (for shot-tagging-engine)
export * from './TableTennisButtons'

// Form components
export * from './Dialog'
export * from './FilterBar'
export * from './Input'
export * from './Label'
export * from './Table'

