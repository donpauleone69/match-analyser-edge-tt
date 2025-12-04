/**
 * ForcedUnforcedBlock — End-of-point question for errors on shot 3+
 * 
 * When an error occurs on shot 3 or later, we need to ask whether
 * it was a forced or unforced error to properly categorize the point.
 * 
 * Presentational component — props in, JSX out.
 */

import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'
import type { PlayerId } from '@/rules/types'

export interface ForcedUnforcedBlockProps {
  /** Player who made the error */
  errorPlayerId: PlayerId
  errorPlayerName: string
  /** Player who wins the point */
  winnerId: PlayerId
  winnerName: string
  /** Shot index where error occurred */
  shotIndex: number
  /** Callback when user selects */
  onSelect: (type: 'forcedError' | 'unforcedError') => void
  /** Optional callback to cancel */
  onCancel?: () => void
  className?: string
}

export function ForcedUnforcedBlock({
  errorPlayerName,
  winnerName,
  shotIndex,
  onSelect,
  onCancel,
  className,
}: ForcedUnforcedBlockProps) {
  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="info" size="md" className="text-warning" />
          End of Point — Shot {shotIndex}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context */}
        <p className="text-sm text-neutral-300">
          <span className="font-medium">{errorPlayerName}</span> made an error.
          <br />
          <span className="font-medium text-success">{winnerName}</span> wins the point.
        </p>
        
        {/* Question */}
        <p className="text-sm font-medium text-neutral-100">
          Was this error forced or unforced?
        </p>
        
        {/* Options */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onSelect('forcedError')}
            className="flex-1"
          >
            <Icon name="alert" size="sm" />
            Forced
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onSelect('unforcedError')}
            className="flex-1"
          >
            <Icon name="circle" size="sm" />
            Unforced
          </Button>
        </div>
        
        {/* Help text */}
        <div className="text-xs text-neutral-400 space-y-1">
          <p>
            <strong>Forced:</strong> Opponent's pressure caused the error
          </p>
          <p>
            <strong>Unforced:</strong> Error without significant pressure
          </p>
        </div>
        
        {/* Keyboard hint */}
        <div className="text-xs text-neutral-500 text-center pt-2 border-t border-neutral-700">
          Press <kbd className="px-1 py-0.5 bg-neutral-700 rounded">F</kbd> for Forced, 
          <kbd className="px-1 py-0.5 bg-neutral-700 rounded ml-1">U</kbd> for Unforced
        </div>
        
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="w-full mt-2"
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  )
}






