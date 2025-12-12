/**
 * UserInputSection - Consistent container for all user input controls
 * 
 * Provides standardized styling and layout rules for any control blocks:
 * - SetupControlsBlock (Phase 1 setup)
 * - Phase1ControlsBlock (Phase 1 tagging)
 * - ButtonGrid question flows (Phase 2 detail)
 * - Inference confirmation (Phase 3)
 * - Custom data inputs (future phases)
 * 
 * Features:
 * - Standard background and border styling
 * - Optional player-specific background tinting
 * - Smooth color transitions
 * - Consistent padding and layout rules
 */

import { type ReactNode } from 'react'
import { cn } from '@/helpers/utils'

export interface UserInputSectionProps {
  children: ReactNode
  playerTint?: 'player1' | 'player2' | null  // Optional player-specific background tint
  className?: string
}

export function UserInputSection({ children, playerTint, className }: UserInputSectionProps) {
  return (
    <div className={cn(
      'shrink-0 border-t border-neutral-700 transition-colors duration-300',
      // Base background (no player context)
      !playerTint && 'bg-bg-card',
      // Player-specific tints (Phase 2 uses this for current shot player)
      playerTint === 'player1' && 'bg-[rgb(59_130_246_/_0.30)]',  // Blue tint for player 1 (30% opacity - strong)
      playerTint === 'player2' && 'bg-[rgb(249_115_22_/_0.30)]',  // Orange tint for player 2 (30% opacity - strong)
      className
    )}>
      {children}
    </div>
  )
}

