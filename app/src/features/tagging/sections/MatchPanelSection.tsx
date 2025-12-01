/**
 * MatchPanelSection — Left panel showing match details and point tree
 * 
 * Section component — receives view models via props, renders blocks.
 */

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, Badge, Icon } from '@/ui-mine'
import { ScoreDisplayBlock } from '../blocks/ScoreDisplayBlock'
import { RallyPodBlock } from '../blocks/RallyPodBlock'
import type { MatchPanelVM, PointDetailsTreeVM } from '../models'

export interface MatchPanelSectionProps {
  matchPanel: MatchPanelVM
  pointTree: PointDetailsTreeVM
  onRallyClick: (rallyId: string) => void
  className?: string
}

export function MatchPanelSection({
  matchPanel,
  pointTree,
  onRallyClick,
  className,
}: MatchPanelSectionProps) {
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
          {pointTree.games.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <Icon name="circle" size="lg" className="mb-2 opacity-50" />
              <span className="text-sm">No rallies yet</span>
              <span className="text-xs">Start tagging to see points</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pointTree.games.map(game => (
                <div key={game.gameNumber} className="flex flex-col gap-1">
                  {/* Game header */}
                  <div className="flex items-center gap-2 px-2 py-1 bg-neutral-800 rounded">
                    <span className="text-xs font-medium text-neutral-300">
                      Game {game.gameNumber}
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
                    {game.rallies.map(rally => (
                      <RallyPodBlock
                        key={rally.id}
                        {...rally}
                        onClick={() => onRallyClick(rally.id)}
                      />
                    ))}
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

