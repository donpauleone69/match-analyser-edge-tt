/**
 * Phase1ControlsBlock — 1x5 button layout for rally control
 * 
 * Layout: ShotMissed | InNet | ForcedError | WinningShot | Serve/Shot
 * 
 * Button behavior:
 * - Long, Net, Win buttons active after first serve
 * - ForcedError button active after receive (2+ shots)
 * - Serve/Shot button changes label dynamically
 * - ShotMissed = Long/Missed
 * - InNet = In Net
 * - ForcedError = Forced Error (disabled for shot 1)
 * - WinningShot = Winner
 */

// import { cn } from '@/helpers/utils'
import {
  ShotMissedButton,
  InNetButton,
  ForcedErrorButton,
  WinningShotButton,
  ServeButton,
  ShotButton,
} from '@/ui-mine'
import { ButtonGrid } from './ButtonGrid'

export type RallyState = 'before-serve' | 'after-serve'
export type EndCondition = 'innet' | 'long' | 'forcederror' | 'winner' | 'let'

export interface Phase1ControlsBlockProps {
  rallyState: RallyState
  currentShotCount: number
  onServeShot: () => void
  onShotMissed: () => void
  onInNet: () => void
  onForcedError: () => void
  onWin: () => void
  className?: string
}

export function Phase1ControlsBlock({
  rallyState,
  currentShotCount,
  onServeShot,
  onShotMissed,
  onInNet,
  onForcedError,
  onWin,
  className,
}: Phase1ControlsBlockProps) {
  const canEndRally = rallyState === 'after-serve'
  const canUseForcedError = canEndRally && currentShotCount >= 2
  const isBeforeServe = rallyState === 'before-serve'
  
  return (
    <ButtonGrid columns={5} className={className}>
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
      
      {/* Forced Error Button - only enabled for shot 2+ */}
      <ForcedErrorButton
        onClick={onForcedError}
        disabled={!canUseForcedError}
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

