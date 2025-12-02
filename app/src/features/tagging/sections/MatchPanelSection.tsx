/**
 * MatchPanelSection — Left panel showing match details and point tree
 * 
 * Section component — receives view models via props, renders blocks.
 * 
 * Part 1: Shows rallies as they're created
 * Part 2: Shows rallies with expandable shot list, sequential navigation
 */

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, Badge, Icon } from '@/ui-mine'
import { ScoreDisplayBlock } from '../blocks/ScoreDisplayBlock'
import { RallyPodBlock } from '../blocks/RallyPodBlock'
import { ShotRowBlock } from '../blocks/ShotRowBlock'
import { formatTime } from '@/lib/utils'
import type { MatchPanelVM, PointDetailsTreeVM } from '../models'
import type { TaggingPhase } from '@/stores/taggingStore'

export interface MatchPanelSectionProps {
  matchPanel: MatchPanelVM
  pointTree: PointDetailsTreeVM
  taggingPhase?: TaggingPhase
  activeRallyIndex?: number
  activeShotIndex?: number
  onRallyClick: (rallyId: string) => void
  onShotClick?: (rallyId: string, shotIndex: number) => void
  onDeleteContact?: (rallyId: string, shotId: string) => void
  onDeleteRally?: (rallyId: string) => void
  className?: string
}

export function MatchPanelSection({
  matchPanel,
  pointTree,
  taggingPhase = 'part1',
  activeRallyIndex = 0,
  activeShotIndex = 1,
  onRallyClick,
  onShotClick,
  onDeleteContact,
  onDeleteRally,
  className,
}: MatchPanelSectionProps) {
  const isPart2 = taggingPhase === 'part2'
  return (
    <div className={cn('flex flex-col gap-4 h-full', className)}>
      {/* Match Info Card */}
      <Card className="shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Match</CardTitle>
            <Badge variant={matchPanel.taggingMode === 'essential' ? 'info' : 'brand'}>
              {matchPanel.taggingMode === 'essential' ? 'Essential' : 'Full'}
            </Badge>
          </div>
          {matchPanel.matchDate && (
            <span className="text-xs text-neutral-400">
              {new Date(matchPanel.matchDate).toLocaleDateString()}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <ScoreDisplayBlock
            player1Name={matchPanel.player1Name}
            player2Name={matchPanel.player2Name}
            setScore={matchPanel.currentSetScore}
            pointsScore={matchPanel.currentPointsScore}
            currentServerId={matchPanel.currentServerId}
          />
        </CardContent>
      </Card>
      
      {/* Point Details Tree */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Points</CardTitle>
            <span className="text-xs text-neutral-400">
              {pointTree.totalRallies} rallies
              {pointTree.ralliesWithErrors > 0 && (
                <span className="text-danger ml-2">
                  ({pointTree.ralliesWithErrors} errors)
                </span>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {pointTree.sets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <Icon name="circle" size="lg" className="mb-2 opacity-50" />
              <span className="text-sm">No rallies yet</span>
              <span className="text-xs">Start tagging to see points</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pointTree.sets.map(game => (
                <div key={game.setNumber} className="flex flex-col gap-1">
                  {/* Set header */}
                  <div className="flex items-center gap-2 px-2 py-1 bg-neutral-800 rounded">
                    <span className="text-xs font-medium text-neutral-300">
                      Set {game.setNumber}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      {game.player1Score}-{game.player2Score}
                    </span>
                    {game.winnerId && (
                      <Badge variant="success" className="text-[10px] px-1">
                        P{game.winnerId === 'player1' ? '1' : '2'} wins
                      </Badge>
                    )}
                  </div>
                  
                  {/* Rallies */}
                  <div className="flex flex-col gap-0.5 pl-2">
                    {game.rallies.map((rally, rallyIdx) => {
                      // In Part 2, determine rally status
                      const globalRallyIndex = pointTree.sets
                        .slice(0, pointTree.sets.indexOf(game))
                        .reduce((acc, g) => acc + g.rallies.length, 0) + rallyIdx
                      
                      const isActiveRally = isPart2 && globalRallyIndex === activeRallyIndex
                      const isCompletedRally = isPart2 && globalRallyIndex < activeRallyIndex
                      const isLockedRally = isPart2 && globalRallyIndex > activeRallyIndex
                      
                      return (
                        <div key={rally.id}>
                          {/* Rally header */}
                          <RallyPodBlock
                            {...rally}
                            onClick={() => !isLockedRally && onRallyClick(rally.id)}
                            onDelete={onDeleteRally ? () => onDeleteRally(rally.id) : undefined}
                            className={cn(
                              isLockedRally && 'opacity-50 cursor-not-allowed',
                              isCompletedRally && 'border-l-2 border-success',
                              isActiveRally && 'border-l-2 border-brand-primary bg-brand-primary/10'
                            )}
                          />
                          
                          {/* Expanded shot list for active rally in Part 2 */}
                          {isActiveRally && rally.shots && rally.shots.length > 0 && (
                            <div className="ml-4 mt-1 mb-2 space-y-0.5">
                              {rally.shots.map((shot, shotIdx) => {
                                const shotNumber = shotIdx + 1
                                const isServe = shotNumber === 1
                                const isReturn = shotNumber === 2
                                const isCurrentShot = shotNumber === activeShotIndex
                                const isCompletedShot = shotNumber < activeShotIndex
                                
                                return (
                                  <ShotRowBlock
                                    key={shot.id}
                                    shotIndex={shotNumber}
                                    time={shot.time}
                                    formattedTime={formatTime(shot.time)}
                                    isServe={isServe}
                                    isReturn={isReturn}
                                    playerId={rally.serverId === 'player1' 
                                      ? (shotNumber % 2 === 1 ? 'player1' : 'player2')
                                      : (shotNumber % 2 === 1 ? 'player2' : 'player1')
                                    }
                                    playerName={rally.serverId === 'player1'
                                      ? (shotNumber % 2 === 1 ? matchPanel.player1Name : matchPanel.player2Name)
                                      : (shotNumber % 2 === 1 ? matchPanel.player2Name : matchPanel.player1Name)
                                    }
                                    isTagged={isCompletedShot}
                                    isSelected={isCurrentShot}
                                    onClick={() => onShotClick?.(rally.id, shotNumber)}
                                    onPlayClick={() => {}}
                                    onDelete={onDeleteContact ? () => onDeleteContact(rally.id, shot.id) : undefined}
                                  />
                                )
                              })}
                              
                              {/* End of Point row */}
                              <div className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded text-xs',
                                activeShotIndex > rally.shots.length
                                  ? 'bg-brand-primary/20 border border-brand-primary'
                                  : 'bg-neutral-800 opacity-60'
                              )}>
                                <Icon name="flag" size="sm" className="text-neutral-400" />
                                <span className="text-neutral-300">End of Point</span>
                                {rally.endOfPointTime && (
                                  <span className="ml-auto font-mono text-neutral-500">
                                    {formatTime(rally.endOfPointTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


