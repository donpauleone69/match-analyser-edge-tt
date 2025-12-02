/**
 * WinnerSelectBlock — Winner selection UI
 * 
 * Presentational component for selecting rally winner.
 * Shows both players with click-to-select.
 */

import { cn } from '@/lib/utils'
import { Button, Icon } from '@/ui-mine'
import type { PlayerId } from '@/rules/types'

export interface WinnerSelectBlockProps {
  player1Name: string
  player2Name: string
  onSelect: (winnerId: PlayerId) => void
  onCancel?: () => void
  className?: string
}

export function WinnerSelectBlock({
  player1Name,
  player2Name,
  onSelect,
  onCancel,
  className,
}: WinnerSelectBlockProps) {
  return (
    <div className={cn('flex flex-col gap-4 p-6 bg-bg-card rounded-lg', className)}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-100">Who won?</h3>
        <p className="text-sm text-neutral-400 mt-1">Select the winner of this rally</p>
      </div>
      
      <div className="flex gap-4 justify-center">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onSelect('player1')}
          className="min-w-[140px] flex-col h-auto py-4"
          shortcut="1"
        >
          <Icon name="user" size="lg" className="mb-2 text-info" />
          <span className="font-semibold">{player1Name}</span>
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onSelect('player2')}
          className="min-w-[140px] flex-col h-auto py-4"
          shortcut="2"
        >
          <Icon name="user" size="lg" className="mb-2 text-warning" />
          <span className="font-semibold">{player2Name}</span>
        </Button>
      </div>
      
      {onCancel && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}


