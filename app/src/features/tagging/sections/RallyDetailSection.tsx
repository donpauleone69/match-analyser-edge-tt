/**
 * RallyDetailSection — Rally review panel for Part 2
 * 
 * Shows rally info, shot list, and navigation controls.
 */

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, Button, Icon, Badge } from '@/ui-mine'
import { ShotRowBlock } from '../blocks/ShotRowBlock'
import type { RallyDetailVM } from '../models'

export interface RallyDetailSectionProps {
  rally: RallyDetailVM | null
  selectedShotIndex: number | null
  onShotSelect: (shotIndex: number) => void
  onShotPlay: (time: number) => void
  onPrevRally: () => void
  onNextRally: () => void
  onCompleteRally: () => void
  className?: string
}

export function RallyDetailSection({
  rally,
  selectedShotIndex,
  onShotSelect,
  onShotPlay,
  onPrevRally,
  onNextRally,
  onCompleteRally,
  className,
}: RallyDetailSectionProps) {
  if (!rally) {
    return (
      <Card className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-neutral-400">
          <Icon name="circle" size="lg" className="mx-auto mb-2 opacity-50" />
          <p>No rally selected</p>
          <p className="text-sm">Complete Part 1 tagging first</p>
        </div>
      </Card>
    )
  }
  
  const progressPercent = rally.totalShots > 0 
    ? Math.round((rally.shotsTagged / rally.totalShots) * 100)
    : 0
  
  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="shrink-0 pb-2">
        {/* Rally header */}
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Rally {rally.rallyIndex}
            {rally.isScoring ? (
              <Badge variant="success" className="text-xs">Scoring</Badge>
            ) : (
              <Badge variant="default" className="text-xs">Let</Badge>
            )}
          </CardTitle>
          
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevRally}
              disabled={!rally.canGoPrev}
            >
              <Icon name="chevron-left" size="sm" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextRally}
              disabled={!rally.canGoNext}
            >
              <Icon name="chevron-right" size="sm" />
            </Button>
          </div>
        </div>
        
        {/* Rally info */}
        <div className="flex items-center gap-4 text-sm text-neutral-400 mt-2">
          <span>
            Server: <span className={rally.serverId === 'player1' ? 'text-info' : 'text-warning'}>
              {rally.serverName}
            </span>
          </span>
          {rally.winnerId && (
            <span>
              Winner: <span className={rally.winnerId === 'player1' ? 'text-info' : 'text-warning'}>
                {rally.winnerName}
              </span>
            </span>
          )}
          <span>{rally.totalShots} shots</span>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>Tagging progress</span>
            <span>{rally.shotsTagged}/{rally.totalShots} ({progressPercent}%)</span>
          </div>
          <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        {/* Shot list */}
        <div className="space-y-1">
          {rally.shots.map((shot) => (
            <ShotRowBlock
              key={shot.id}
              {...shot}
              isSelected={selectedShotIndex === shot.shotIndex}
              onClick={() => onShotSelect(shot.shotIndex)}
              onPlayClick={() => onShotPlay(shot.time)}
            />
          ))}
        </div>
      </CardContent>
      
      {/* Actions */}
      <div className="shrink-0 p-4 border-t border-neutral-700">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onPrevRally}
            disabled={!rally.canGoPrev}
          >
            <Icon name="chevron-left" size="sm" />
            Previous
          </Button>
          
          {rally.isComplete ? (
            <Button
              variant="success"
              size="sm"
              className="flex-1"
              onClick={onNextRally}
              disabled={!rally.canGoNext}
            >
              Next
              <Icon name="chevron-right" size="sm" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={onCompleteRally}
            >
              <Icon name="check" size="sm" />
              Complete Rally
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

