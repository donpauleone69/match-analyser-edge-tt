/**
 * MatchTimelinePanelSection — Unified linear timeline panel
 * 
 * Persistent panel used across setup, part1, and part2 phases.
 * Shows match structure in a linear timeline format:
 * - Match header (names, date)
 * - Set markers (Set 1, Set 2, etc.)
 * - Rally rows (expandable → shots)
 * - End of Point timestamps
 * - Set summary lines (winner, score)
 * - Match footer (final result)
 * 
 * Rally numbering is per-set (Set 2, Rally 1 not Rally 15)
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/ui-mine'
import { formatTime } from '@/lib/utils'
import type { PlayerId, Rally, Contact, Game } from '@/rules/types'

// =============================================================================
// TYPES
// =============================================================================

export interface MatchTimelinePanelSectionProps {
  // Match info
  player1Name: string
  player2Name: string
  matchDate: string | null
  matchFormat: string
  
  // Data
  games: Game[]
  rallies: Rally[]
  currentRallyContacts?: Contact[] // In-progress rally not yet saved
  currentServerId?: PlayerId // Who's serving the in-progress rally
  
  // Current state
  currentSetIndex: number
  currentRallyIndex?: number // For highlighting active rally
  currentShotIndex?: number // For highlighting active shot
  
  // Match completion
  matchResult?: 'player1' | 'player2' | 'incomplete' | null
  finalSetScore?: string | null
  
  // Phase
  taggingPhase: 'setup' | 'part1' | 'part2'
  
  // Interaction
  onRallyClick?: (rallyId: string) => void
  onShotClick?: (contactId: string) => void
  onDeleteContact?: (contactId: string) => void
  onNudgeContact?: (contactId: string, direction: 'earlier' | 'later') => void
  
  className?: string
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getPlayerName(playerId: PlayerId, p1Name: string, p2Name: string): string {
  return playerId === 'player1' ? p1Name : p2Name
}

function getShotLabel(shotIndex: number): string {
  if (shotIndex === 1) return 'Serve'
  if (shotIndex === 2) return 'Return'
  return `Shot ${shotIndex}`
}

// Group rallies by game/set
function groupRalliesByGame(rallies: Rally[], games: Game[]): Map<string, Rally[]> {
  const grouped = new Map<string, Rally[]>()
  
  for (const game of games) {
    grouped.set(game.id, [])
  }
  
  for (const rally of rallies) {
    const existing = grouped.get(rally.gameId) || []
    existing.push(rally)
    grouped.set(rally.gameId, existing)
  }
  
  return grouped
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MatchTimelinePanelSection({
  player1Name,
  player2Name,
  matchDate,
  matchFormat,
  games,
  rallies,
  currentRallyContacts = [],
  currentServerId,
  currentSetIndex,
  currentRallyIndex,
  currentShotIndex,
  matchResult,
  finalSetScore,
  taggingPhase,
  onRallyClick,
  onShotClick,
  onDeleteContact,
  onNudgeContact,
  className,
}: MatchTimelinePanelSectionProps) {
  const [expandedRallies, setExpandedRallies] = useState<Set<string>>(new Set())
  const [inProgressExpanded, setInProgressExpanded] = useState(true)
  
  // Auto-expand current rally when it changes
  useEffect(() => {
    if (currentRallyIndex !== undefined && rallies[currentRallyIndex]) {
      setExpandedRallies(prev => {
        const next = new Set(prev)
        next.add(rallies[currentRallyIndex].id)
        return next
      })
    }
  }, [currentRallyIndex, rallies])
  
  // Keep in-progress rally expanded
  useEffect(() => {
    if (currentRallyContacts.length > 0) {
      setInProgressExpanded(true)
    }
  }, [currentRallyContacts.length])
  
  const toggleRally = (rallyId: string) => {
    setExpandedRallies(prev => {
      const next = new Set(prev)
      if (next.has(rallyId)) {
        next.delete(rallyId)
      } else {
        next.add(rallyId)
      }
      return next
    })
  }
  
  const ralliesByGame = groupRalliesByGame(rallies, games)
  
  // Player color coding
  const player1Color = 'text-cyan-400'
  const player2Color = 'text-amber-400'
  const getPlayerColor = (playerId: PlayerId) => playerId === 'player1' ? player1Color : player2Color
  
  return (
    <div className={cn('flex flex-col h-full bg-neutral-900 rounded-lg overflow-hidden', className)}>
      {/* Match Header */}
      <div className="px-3 py-2 bg-neutral-800 border-b border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="trophy" size="sm" className="text-brand-primary" />
            <span className="font-medium text-sm text-neutral-100">
              {player1Name} vs {player2Name}
            </span>
          </div>
          {matchDate && (
            <span className="text-xs text-neutral-500">{matchDate}</span>
          )}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">
          {matchFormat === 'bestOf1' && 'Best of 1'}
          {matchFormat === 'bestOf3' && 'Best of 3'}
          {matchFormat === 'bestOf5' && 'Best of 5'}
          {matchFormat === 'bestOf7' && 'Best of 7'}
        </div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto">
        {games.length === 0 && rallies.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            {taggingPhase === 'setup' 
              ? 'Mark first serve to begin' 
              : 'No rallies yet'}
          </div>
        ) : (
          <div className="py-2">
            {games.map((game, gameIndex) => {
              const gameRallies = ralliesByGame.get(game.id) || []
              const isCurrentSet = gameIndex === currentSetIndex
              
              return (
                <div key={game.id}>
                  {/* Set Header */}
                  <div className={cn(
                    'px-3 py-1.5 text-xs font-medium flex items-center gap-2',
                    isCurrentSet ? 'text-brand-primary bg-brand-primary/10' : 'text-neutral-400'
                  )}>
                    <Icon name="flag" size="xs" />
                    Set {game.gameNumber}
                    {isCurrentSet && taggingPhase !== 'part2' && (
                      <span className="text-[10px] bg-brand-primary/20 px-1.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  
                  {/* Rallies in this set */}
                  {gameRallies.map((rally, rallyInSetIndex) => {
                    const isExpanded = expandedRallies.has(rally.id)
                    const isCurrentRally = currentRallyIndex !== undefined && 
                      rallies.indexOf(rally) === currentRallyIndex
                    const winnerName = rally.winnerId 
                      ? getPlayerName(rally.winnerId, player1Name, player2Name)
                      : undefined
                    const serverName = rally.serverId 
                      ? getPlayerName(rally.serverId, player1Name, player2Name)
                      : undefined
                    const isConfirmed = rally.frameworkConfirmed === true
                    
                    return (
                      <div key={rally.id} className={cn(
                        'border-l-2 ml-3',
                        isConfirmed ? 'border-success/50' : 'border-neutral-700'
                      )}>
                        {/* Rally Row */}
                        <button
                          onClick={() => {
                            toggleRally(rally.id)
                            onRallyClick?.(rally.id)
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-neutral-800/50 transition-colors',
                            isCurrentRally && 'bg-brand-primary/10 border-l-2 border-l-brand-primary -ml-0.5',
                            isConfirmed && !isCurrentRally && 'opacity-80'
                          )}
                        >
                          {/* Confirmed indicator */}
                          {isConfirmed ? (
                            <Icon name="check" size="xs" className="text-success" />
                          ) : (
                            <Icon 
                              name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                              size="xs" 
                              className="text-neutral-500"
                            />
                          )}
                          <span className={cn(
                            'text-sm font-medium',
                            isCurrentRally ? 'text-brand-primary' : 
                            isConfirmed ? 'text-success/80' : 'text-neutral-200'
                          )}>
                            Rally {rallyInSetIndex + 1}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {rally.contacts.length} shot{rally.contacts.length !== 1 ? 's' : ''}
                          </span>
                          {/* Server name with color */}
                          {serverName && (
                            <span className={cn('text-xs', rally.serverId && getPlayerColor(rally.serverId))}>
                              {serverName}
                            </span>
                          )}
                          {winnerName && (
                            <span className="text-xs text-success ml-auto">
                              → {winnerName}
                            </span>
                          )}
                          {!rally.isScoring && (
                            <span className="text-xs text-warning">Let</span>
                          )}
                        </button>
                        
                        {/* Expanded: Shot rows */}
                        {isExpanded && (
                          <div className="ml-4 border-l border-neutral-700/50">
                            {rally.contacts.map((contact, contactIndex) => {
                              const isCurrentShot = isCurrentRally && 
                                currentShotIndex !== undefined &&
                                contactIndex + 1 === currentShotIndex
                              
                              return (
                                <div
                                  key={contact.id}
                                  className={cn(
                                    'group px-3 py-1 flex items-center gap-2 text-xs',
                                    isCurrentShot ? 'bg-info/10 text-info' : 'hover:bg-neutral-800/50'
                                  )}
                                >
                                  <button
                                    onClick={() => onShotClick?.(contact.id)}
                                    className="flex items-center gap-2 flex-1 text-left"
                                  >
                                    <span className={cn(
                                      'w-12',
                                      isCurrentShot ? 'text-info' : 'text-neutral-400'
                                    )}>
                                      {getShotLabel(contact.shotIndex)}
                                    </span>
                                    <span className="font-mono text-neutral-500">
                                      {formatTime(contact.time)}
                                    </span>
                                    {contact.isTagged && (
                                      <Icon name="check" size="xs" className="text-success" />
                                    )}
                                  </button>
                                  {/* Nudge/Delete controls (Part 1 only) */}
                                  {taggingPhase === 'part1' && (
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                      <button
                                        onClick={() => onNudgeContact?.(contact.id, 'earlier')}
                                        className="p-0.5 hover:bg-neutral-700 rounded"
                                        title="Nudge earlier"
                                      >
                                        <Icon name="chevron-left" size="xs" className="text-neutral-400" />
                                      </button>
                                      <button
                                        onClick={() => onNudgeContact?.(contact.id, 'later')}
                                        className="p-0.5 hover:bg-neutral-700 rounded"
                                        title="Nudge later"
                                      >
                                        <Icon name="chevron-right" size="xs" className="text-neutral-400" />
                                      </button>
                                      <button
                                        onClick={() => onDeleteContact?.(contact.id)}
                                        className="p-0.5 hover:bg-danger/20 rounded"
                                        title="Delete contact"
                                      >
                                        <Icon name="x" size="xs" className="text-danger/70" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            
                            {/* End of Point timestamp */}
                            {rally.endOfPointTime !== undefined && (
                              <div className="px-3 py-1 flex items-center gap-2 text-xs text-neutral-500 border-t border-neutral-700/30">
                                <span className="w-12">End</span>
                                <span className="font-mono">
                                  {formatTime(rally.endOfPointTime)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* In-Progress Rally (currentRallyContacts - not yet saved) */}
                  {isCurrentSet && currentRallyContacts.length > 0 && (
                    <div className="border-l-2 border-brand-primary/50 ml-3 animate-pulse">
                      <button
                        onClick={() => setInProgressExpanded(!inProgressExpanded)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-left bg-brand-primary/10"
                      >
                        <Icon 
                          name={inProgressExpanded ? 'chevron-down' : 'chevron-right'} 
                          size="xs" 
                          className="text-brand-primary"
                        />
                        <span className="text-sm font-medium text-brand-primary">
                          Rally {(ralliesByGame.get(games[currentSetIndex]?.id)?.length || 0) + 1}
                        </span>
                        <span className="text-xs text-brand-primary/70">
                          {currentRallyContacts.length} shot{currentRallyContacts.length !== 1 ? 's' : ''}
                        </span>
                        {/* Current server */}
                        {currentServerId && (
                          <span className={cn('text-xs', getPlayerColor(currentServerId))}>
                            {getPlayerName(currentServerId, player1Name, player2Name)}
                          </span>
                        )}
                        <span className="text-xs bg-brand-primary/20 px-1.5 py-0.5 rounded ml-auto">
                          In Progress
                        </span>
                      </button>
                      
                      {/* Expanded: In-progress shots */}
                      {inProgressExpanded && (
                        <div className="ml-4 border-l border-brand-primary/30">
                          {currentRallyContacts.map((contact, idx) => (
                            <div
                              key={contact.id}
                              className="group px-3 py-1 flex items-center gap-2 text-xs hover:bg-neutral-800/50"
                            >
                              <span className="w-12 text-neutral-400">
                                {getShotLabel(idx + 1)}
                              </span>
                              <span className="font-mono text-neutral-500">
                                {formatTime(contact.time)}
                              </span>
                              {/* Nudge/Delete controls for in-progress contacts */}
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-auto">
                                <button
                                  onClick={() => onNudgeContact?.(contact.id, 'earlier')}
                                  className="p-0.5 hover:bg-neutral-700 rounded"
                                  title="Nudge earlier"
                                >
                                  <Icon name="chevron-left" size="xs" className="text-neutral-400" />
                                </button>
                                <button
                                  onClick={() => onNudgeContact?.(contact.id, 'later')}
                                  className="p-0.5 hover:bg-neutral-700 rounded"
                                  title="Nudge later"
                                >
                                  <Icon name="chevron-right" size="xs" className="text-neutral-400" />
                                </button>
                                <button
                                  onClick={() => onDeleteContact?.(contact.id)}
                                  className="p-0.5 hover:bg-danger/20 rounded"
                                  title="Delete contact"
                                >
                                  <Icon name="x" size="xs" className="text-danger/70" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Set Summary (if game is complete) */}
                  {game.winnerId && (
                    <div className="px-3 py-1.5 text-xs text-neutral-400 bg-neutral-800/30 flex items-center gap-2">
                      <Icon name="check-circle" size="xs" className="text-success" />
                      Set {game.gameNumber} End — Winner: {
                        game.winnerId === 'player1' ? player1Name : player2Name
                      } ({game.player1FinalScore}-{game.player2FinalScore})
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Match Footer (if complete) */}
      {matchResult && matchResult !== 'incomplete' && (
        <div className="px-3 py-2 bg-success/10 border-t border-success/20">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="trophy" size="sm" className="text-success" />
            <span className="text-success font-medium">
              Match Complete — Winner: {matchResult === 'player1' ? player1Name : player2Name}
            </span>
            {finalSetScore && (
              <span className="text-success/70 ml-auto">{finalSetScore}</span>
            )}
          </div>
        </div>
      )}
      
      {matchResult === 'incomplete' && (
        <div className="px-3 py-2 bg-warning/10 border-t border-warning/20">
          <div className="flex items-center gap-2 text-sm text-warning">
            <Icon name="alert-triangle" size="sm" />
            <span>Match Incomplete</span>
          </div>
        </div>
      )}
    </div>
  )
}

