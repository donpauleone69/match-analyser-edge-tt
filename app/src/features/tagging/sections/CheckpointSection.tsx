/**
 * CheckpointSection — Rally Checkpoint UI
 * 
 * Displayed after ending a rally in the new checkpoint flow.
 * Shows rally summary and allows confirm or redo.
 */

import { cn } from '@/lib/utils'
import { Button, Card, Icon } from '@/ui-mine'
import type { PlayerId } from '@/rules/types'

export interface CheckpointSectionProps {
  rallyNumber: number
  contactCount: number
  serverName: string
  serverId: PlayerId
  receiverName: string
  duration: number // in seconds
  shots: { time: number; shotIndex: number }[]
  onConfirm: () => void
  onRedo: () => void
  className?: string
}

export function CheckpointSection({
  rallyNumber,
  contactCount,
  serverName,
  serverId,
  duration,
  shots,
  onConfirm,
  onRedo,
  className,
}: CheckpointSectionProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins}:${secs.padStart(4, '0')}`
  }
  
  const formatDuration = (d: number) => `${d.toFixed(1)}s`
  
  // Calculate start and end times from shots
  const startTime = shots.length > 0 ? shots[0].time : 0
  const endTime = shots.length > 0 ? shots[shots.length - 1].time : 0
  
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Rally {rallyNumber} Checkpoint
          </h2>
          <span className="text-sm text-neutral-400">
            Video paused
          </span>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-brand-primary">
              {contactCount}
            </div>
            <div className="text-xs text-neutral-400">Contacts</div>
          </div>
          
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className={cn(
              'text-lg font-semibold',
              serverId === 'player1' ? 'text-blue-400' : 'text-orange-400'
            )}>
              {serverName}
            </div>
            <div className="text-xs text-neutral-400">Server</div>
          </div>
          
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="text-lg font-mono text-neutral-200">
              {formatDuration(duration)}
            </div>
            <div className="text-xs text-neutral-400">Duration</div>
          </div>
        </div>
        
        {/* Timeline Preview */}
        <div className="bg-neutral-900 rounded-lg p-4">
          <div className="text-xs text-neutral-400 mb-2">Timeline Preview</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-500">
              {formatTime(startTime)}
            </span>
            <div className="flex-1 h-8 bg-neutral-800 rounded relative flex items-center px-2">
              {shots.map((shot, idx) => (
                <div
                  key={shot.shotIndex}
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                    idx === 0 
                      ? 'bg-brand-primary text-white' // Serve
                      : 'bg-neutral-600 text-neutral-200'
                  )}
                  style={{
                    marginLeft: idx === 0 ? 0 : '12px'
                  }}
                >
                  {idx === 0 ? 'S' : idx + 1}
                </div>
              ))}
              <div className="ml-3 w-3 h-3 border-2 border-neutral-500 rounded-full" title="End of point" />
            </div>
            <span className="text-xs font-mono text-neutral-500">
              {formatTime(endTime)}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="lg"
            onClick={onRedo}
            className="gap-2"
          >
            <Icon name="rotate-ccw" size="sm" />
            Redo
            <span className="text-neutral-500 text-xs ml-1">(Backspace)</span>
          </Button>
          
          <Button
            variant="success"
            size="lg"
            onClick={onConfirm}
            className="gap-2 px-8"
          >
            <Icon name="check" size="sm" />
            Confirm
            <span className="text-green-200 text-xs ml-1">(Enter)</span>
          </Button>
        </div>
        
        {/* Help text */}
        <div className="text-center text-xs text-neutral-500">
          Press Enter to save rally and find next serve • Backspace to redo
        </div>
      </div>
    </Card>
  )
}







