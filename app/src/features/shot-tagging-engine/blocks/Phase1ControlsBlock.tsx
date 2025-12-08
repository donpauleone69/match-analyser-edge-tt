/**
 * Phase1ControlsBlock — 1x4 button layout for rally control
 * 
 * Layout: ShotMissed | InNet | WinningShot | Serve/Shot
 * 
 * Button behavior:
 * - All 4 buttons active after first serve
 * - Serve/Shot button changes label dynamically
 * - ShotMissed = Long/Missed
 * - InNet = In Net
 * - WinningShot = Winner
 */

// import { cn } from '@/helpers/utils'
import {
  ShotMissedButton,
  InNetButton,
  WinningShotButton,
  ServeButton,
  ShotButton,
} from '@/ui-mine'
import { ButtonGrid } from './ButtonGrid'

export type RallyState = 'before-serve' | 'after-serve'
export type EndCondition = 'innet' | 'long' | 'winner'

export interface Phase1ControlsBlockProps {
  rallyState: RallyState
  onServeShot: () => void
  onShotMissed: () => void
  onInNet: () => void
  onWin: () => void
  className?: string
}

export function Phase1ControlsBlock({
  rallyState,
  onServeShot,
  onShotMissed,
  onInNet,
  onWin,
  className,
}: Phase1ControlsBlockProps) {
  const canEndRally = rallyState === 'after-serve'
  const isBeforeServe = rallyState === 'before-serve'
  
  return (
    <ButtonGrid columns={4} className={className}>
      {/* Shot Missed Button */}
      <ShotMissedButton
        onClick={onShotMissed}
        disabled={!canEndRally}
      />
      
      {/* In Net Button */}
      <InNetButton
        onClick={onInNet}
        disabled={!canEndRally}
      />
      
      {/* Winning Shot Button */}
      <WinningShotButton
        onClick={onWin}
        disabled={!canEndRally}
      />
      
      {/* Serve/Shot Button - changes dynamically */}
      {isBeforeServe ? (
        <ServeButton onClick={onServeShot} />
      ) : (
        <ShotButton onClick={onServeShot} />
      )}
    </ButtonGrid>
  )
}

