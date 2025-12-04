/**
 * ShotRowBlock — Individual shot row in rally detail view
 * 
 * Shows shot info and tagging status
 */

import { cn } from '@/lib/utils'
import { Badge, Icon } from '@/ui-mine'
import type { PlayerId, ShotQuality } from '@/rules/types'

export interface ShotRowBlockProps {
  shotIndex: number
  time: number // Used for seeking
  formattedTime: string
  isServe: boolean
  isReturn: boolean
  playerId: PlayerId
  playerName: string
  isTagged: boolean
  quality?: ShotQuality
  isSelected: boolean
  onClick: () => void
  onPlayClick: () => void
  onDelete?: () => void
  className?: string
}

const QUALITY_COLORS: Record<ShotQuality, string> = {
  good: 'bg-success/20 text-success',
  average: 'bg-neutral-600 text-neutral-300',
  weak: 'bg-warning/20 text-warning',
  inNet: 'bg-danger/20 text-danger',
  missedLong: 'bg-danger/20 text-danger',
  missedWide: 'bg-danger/20 text-danger',
}

const QUALITY_LABELS: Record<ShotQuality, string> = {
  good: 'Good',
  average: 'Avg',
  weak: 'Weak',
  inNet: 'Net',
  missedLong: 'Long',
  missedWide: 'Wide',
}

export function ShotRowBlock({
  shotIndex,
  time: _time, // Used by parent for seeking
  formattedTime,
  isServe,
  isReturn,
  playerId,
  playerName,
  isTagged,
  quality,
  isSelected,
  onClick,
  onPlayClick,
  onDelete,
  className,
}: ShotRowBlockProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }
  
  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isSelected 
          ? 'bg-brand-primary/20 border border-brand-primary' 
          : 'bg-neutral-800 hover:bg-neutral-700',
        className
      )}
      onClick={onClick}
    >
      {/* Shot number */}
      <span className="w-6 text-center font-mono text-sm text-neutral-400">
        {shotIndex}
      </span>
      
      {/* Shot type badge */}
      <Badge
        variant={isServe ? 'brand' : isReturn ? 'info' : 'default'}
        className="w-16 justify-center text-xs"
      >
        {isServe ? 'Serve' : isReturn ? 'Return' : 'Shot'}
      </Badge>
      
      {/* Player */}
      <span className={cn(
        'flex-1 text-sm truncate',
        playerId === 'player1' ? 'text-info' : 'text-warning'
      )}>
        {playerName}
      </span>
      
      {/* Time */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onPlayClick()
        }}
        className="font-mono text-xs text-neutral-400 hover:text-brand-primary transition-colors"
        title="Jump to this time"
      >
        {formattedTime}
      </button>
      
      {/* Quality indicator */}
      {isTagged && quality ? (
        <Badge className={cn('w-14 justify-center text-xs', QUALITY_COLORS[quality])}>
          {QUALITY_LABELS[quality]}
        </Badge>
      ) : (
        <Badge variant="default" className="w-14 justify-center text-xs opacity-50">
          —
        </Badge>
      )}
      
      {/* Status icon */}
      {isTagged ? (
        <Icon name="check" size="sm" className="text-success" />
      ) : (
        <Icon name="circle" size="sm" className="text-neutral-500" />
      )}
      
      {/* Delete button (hidden until hover) */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/20 text-neutral-500 hover:text-danger transition-all"
          title="Delete shot (Delete)"
        >
          <Icon name="trash" size="xs" />
        </button>
      )}
    </div>
  )
}


