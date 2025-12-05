/**
 * MatchResultEntryModal - Enter match results (set scores and optional point scores)
 */

import { useState, useEffect } from 'react'
import { Dialog } from '@/ui-mine/Dialog'
import { Button } from '@/ui-mine/Button'
import { Label } from '@/ui-mine/Label'
import type { DBMatch, DBSet } from '@/data'
import { useMatchStore } from '@/data'
import { setDb } from '@/data'
import { validateMatchWinner, validatePointScore } from '@/rules/validateMatchData'
import type { PlayerId } from '@/rules/types'

interface MatchResultEntryModalProps {
  match: DBMatch
  sets: DBSet[]
  player1Name: string
  player2Name: string
  onClose: () => void
  onSave: () => void
}

export function MatchResultEntryModal({
  match,
  sets,
  player1Name,
  player2Name,
  onClose,
  onSave,
}: MatchResultEntryModalProps) {
  const { update: updateMatch } = useMatchStore()
  
  // Set scores
  const [player1Sets, setPlayer1Sets] = useState(0)
  const [player2Sets, setPlayer2Sets] = useState(0)
  
  // Point scores for each set (optional)
  const [pointScores, setPointScores] = useState<string[]>(
    Array(match.best_of).fill('')
  )
  
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  
  // Determine winner based on set scores
  const determinedWinner: PlayerId | null = player1Sets > player2Sets 
    ? ('player1' as PlayerId)
    : player2Sets > player1Sets 
      ? ('player2' as PlayerId)
      : null
  
  const winnerName = determinedWinner === 'player1'
    ? player1Name 
    : determinedWinner === 'player2'
      ? player2Name 
      : 'TBD'
  
  // Validate when set scores change
  useEffect(() => {
    const errors = validateMatchWinner({
      winnerId: determinedWinner,
      bestOf: match.best_of,
      player1SetsWon: player1Sets,
      player2SetsWon: player2Sets,
      setScoreSummary: `${player1Sets}-${player2Sets}`
    })
    
    setValidationErrors(errors.map(e => e.message))
  }, [player1Sets, player2Sets, determinedWinner, match.best_of])
  
  const handlePointScoreChange = (setIndex: number, value: string) => {
    const newScores = [...pointScores]
    newScores[setIndex] = value
    setPointScores(newScores)
  }
  
  const handleSave = async () => {
    // Final validation
    if (validationErrors.length > 0) {
      return
    }
    
    if (!determinedWinner) {
      setValidationErrors(['Cannot save: No winner determined. Set scores must not be equal.'])
      return
    }
    
    setIsSaving(true)
    
    try {
      // 1. Update Match record
      const actualWinnerId = determinedWinner === 'player1' 
        ? match.player1_id 
        : determinedWinner === 'player2' 
          ? match.player2_id 
          : null
      
      await updateMatch(match.id, {
        winner_id: actualWinnerId,
        player1_sets_won: player1Sets,
        player2_sets_won: player2Sets,
        set_score_summary: `${player1Sets}-${player2Sets}`
      })
      
      // 2. Update Set records (if point scores entered)
      const totalSets = player1Sets + player2Sets
      
      for (let i = 0; i < totalSets && i < sets.length; i++) {
        const pointScore = pointScores[i]?.trim()
        
        if (pointScore) {
          const validation = validatePointScore(pointScore)
          
          if (validation.valid) {
            const setWinner = validation.p1 > validation.p2 
              ? match.player1_id 
              : match.player2_id
            
            await setDb.update(sets[i].id, {
              player1_final_score: validation.p1,
              player2_final_score: validation.p2,
              winner_id: setWinner
            })
          }
        }
      }
      
      // 3. Callback to refresh and close
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save match results:', error)
      setValidationErrors(['Failed to save match results. Please try again.'])
    } finally {
      setIsSaving(false)
    }
  }
  
  const totalSets = player1Sets + player2Sets
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-50 mb-2">
                Enter Match Result
              </h2>
              <p className="text-neutral-400">
                {player1Name} vs {player2Name}
              </p>
              <p className="text-sm text-neutral-500">
                Best of {match.best_of}
              </p>
            </div>
            
            {/* Set Scores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-50">
                Set Scores (Required)
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="player1-sets">{player1Name}</Label>
                  <select
                    id="player1-sets"
                    value={player1Sets}
                    onChange={(e) => setPlayer1Sets(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 bg-bg-surface border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {Array.from({ length: match.best_of + 1 }, (_, i) => (
                      <option key={i} value={i}>{i} sets</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="player2-sets">{player2Name}</Label>
                  <select
                    id="player2-sets"
                    value={player2Sets}
                    onChange={(e) => setPlayer2Sets(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 bg-bg-surface border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {Array.from({ length: match.best_of + 1 }, (_, i) => (
                      <option key={i} value={i}>{i} sets</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Winner Display */}
              {determinedWinner && (
                <div className="p-3 bg-green-900/20 border border-green-700 rounded-md">
                  <p className="text-green-400 font-semibold">
                    Winner: {winnerName} ({player1Sets}-{player2Sets})
                  </p>
                </div>
              )}
            </div>
            
            {/* Point Scores (Optional) */}
            {totalSets > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-50">
                    Point Scores (Optional)
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Select the point score for each set
                  </p>
                </div>
                
                <div className="space-y-3">
                  {Array.from({ length: totalSets }, (_, i) => {
                    // Parse existing score or default to 0-0
                    const parts = pointScores[i]?.split('-') || ['0', '0']
                    const p1Score = parseInt(parts[0]) || 0
                    const p2Score = parseInt(parts[1]) || 0
                    
                    return (
                      <div key={i}>
                        <Label>Set {i + 1}</Label>
                        <div className="grid grid-cols-3 gap-3 items-center mt-1">
                          {/* Player 1 Score */}
                          <div>
                            <Label className="text-xs text-neutral-400 mb-1">{player1Name}</Label>
                            <select
                              value={p1Score}
                              onChange={(e) => {
                                const newScore = `${e.target.value}-${p2Score}`
                                handlePointScoreChange(i, newScore)
                              }}
                              className="w-full px-3 py-2 bg-bg-surface border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                              {Array.from({ length: 31 }, (_, j) => (
                                <option key={j} value={j}>{j}</option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Separator */}
                          <div className="text-center text-2xl text-neutral-400 font-bold">-</div>
                          
                          {/* Player 2 Score */}
                          <div>
                            <Label className="text-xs text-neutral-400 mb-1">{player2Name}</Label>
                            <select
                              value={p2Score}
                              onChange={(e) => {
                                const newScore = `${p1Score}-${e.target.value}`
                                handlePointScoreChange(i, newScore)
                              }}
                              className="w-full px-3 py-2 bg-bg-surface border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                              {Array.from({ length: 31 }, (_, j) => (
                                <option key={j} value={j}>{j}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Validation feedback */}
                        {pointScores[i] && pointScores[i] !== '0-0' && (
                          <div className="mt-1 text-xs">
                            {(() => {
                              const validation = validatePointScore(pointScores[i])
                              return validation.valid ? (
                                <span className="text-green-400">✓ Valid score</span>
                              ) : (
                                <span className="text-red-400">
                                  ✗ Invalid (must be 11+ and win by 2)
                                </span>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-md">
                <p className="text-red-400 font-semibold mb-1">Validation Errors:</p>
                <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-700">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={validationErrors.length > 0 || isSaving || !determinedWinner}
              >
                {isSaving ? 'Saving...' : 'Save Result'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

