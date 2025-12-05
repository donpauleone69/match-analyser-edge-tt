/**
 * SetSelectionModal - Choose which set to tag with status indicators
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBSet } from '@/database/types'
import { Icon } from '@/ui-mine/Icon'
import { updateSet } from '@/database/services/setService'

interface SetSelectionModalProps {
  matchId: string
  sets: DBSet[]
  player1Name: string
  player2Name: string
  player1Id: string
  player2Id: string
  onClose: () => void
}

export function SetSelectionModal({
  matchId,
  sets,
  player1Name,
  player2Name,
  player1Id,
  player2Id,
  onClose,
}: SetSelectionModalProps) {
  const navigate = useNavigate()
  const [showRedoConfirm, setShowRedoConfirm] = useState<number | null>(null)
  const [editingSetScores, setEditingSetScores] = useState<number | null>(null)
  const [setScoreForm, setSetScoreForm] = useState({ player1Score: 0, player2Score: 0 })

  const handleStartTagging = (setNumber: number) => {
    // Navigate to tagging page with set number
    navigate(`/matches/${matchId}/tag?set=${setNumber}`)
  }

  const handleRedoTagging = (setNumber: number) => {
    setShowRedoConfirm(setNumber)
  }

  const confirmRedo = (setNumber: number) => {
    // Navigate with redo flag
    navigate(`/matches/${matchId}/tag?set=${setNumber}&redo=true`)
  }

  const handleEditSetScores = (setNumber: number, currentSet: DBSet) => {
    setEditingSetScores(setNumber)
    setSetScoreForm({
      player1Score: currentSet.player1_final_score,
      player2Score: currentSet.player2_final_score,
    })
  }

  const handleSaveSetScores = async (set: DBSet) => {
    try {
      // Validate scores
      const p1Score = setScoreForm.player1Score
      const p2Score = setScoreForm.player2Score
      
      if (p1Score < 0 || p2Score < 0) {
        alert('Scores cannot be negative')
        return
      }
      
      // Determine winner based on table tennis rules
      let winnerId: string | null = null
      
      // Standard game to 11 (must win by 2) or deuce (both >= 10)
      if ((p1Score >= 11 || p2Score >= 11) && Math.abs(p1Score - p2Score) >= 2) {
        winnerId = p1Score > p2Score ? player1Id : player2Id
      } else if (p1Score > 0 || p2Score > 0) {
        // Scores entered but game not complete - don't set winner yet
        winnerId = null
      }
      
      // Update set with scores and winner
      await updateSet(set.id, {
        player1_final_score: p1Score,
        player2_final_score: p2Score,
        winner_id: winnerId, // Note: This needs player IDs, not match ID
      })
      
      setEditingSetScores(null)
      alert('Set scores updated! Please refresh to see changes.')
    } catch (error) {
      console.error('Failed to update set scores:', error)
      alert('Failed to update set scores')
    }
  }

  const getSetStatus = (set: DBSet): 'not_started' | 'in_progress' | 'complete' => {
    if (!set.tagging_started_at) return 'not_started'
    if (set.is_tagged && set.tagging_completed_at) return 'complete'
    return 'in_progress'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-400 bg-green-900/30'
      case 'in_progress':
        return 'text-yellow-400 bg-yellow-900/30'
      default:
        return 'text-neutral-400 bg-neutral-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return 'check'
      case 'in_progress':
        return 'clock'
      default:
        return 'circle'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Complete'
      case 'in_progress':
        return 'In Progress'
      default:
        return 'Not Started'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-50 mb-2">
                Select Set to Tag
              </h2>
              <p className="text-sm text-neutral-400">
                {player1Name} vs {player2Name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-50 transition-colors"
            >
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          {/* Set List */}
          <div className="space-y-3">
            {sets.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <p>No sets found for this match.</p>
                <p className="text-sm mt-2">Please ensure match has set data configured.</p>
              </div>
            ) : (
              sets.map((set) => {
                const status = getSetStatus(set)
                const statusColor = getStatusColor(status)
                const statusIcon = getStatusIcon(status)
                const statusLabel = getStatusLabel(status)

                return (
                  <div
                    key={set.id}
                    className="border border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition-colors"
                  >
                    {showRedoConfirm === set.set_number ? (
                      // Redo Confirmation
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <Icon name="alert" className="w-5 h-5" />
                          <span className="font-semibold">Confirm Redo</span>
                        </div>
                        <p className="text-sm text-neutral-300">
                          This will delete all existing tagging data for Set {set.set_number}. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => confirmRedo(set.set_number)}
                            variant="primary"
                            size="sm"
                          >
                            Yes, Delete and Redo
                          </Button>
                          <Button
                            onClick={() => setShowRedoConfirm(null)}
                            variant="secondary"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : editingSetScores === set.set_number ? (
                      // Score Entry Form
                      <div className="space-y-4">
                        <h3 className="font-semibold text-neutral-50">Enter Set {set.set_number} Score</h3>
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">{player1Name}</label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={setScoreForm.player1Score}
                              onChange={(e) => setSetScoreForm({ ...setScoreForm, player1Score: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="text-center text-neutral-600 text-2xl">-</div>
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">{player2Name}</label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={setScoreForm.player2Score}
                              onChange={(e) => setSetScoreForm({ ...setScoreForm, player2Score: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-neutral-500">
                          Optional: Enter final set score if known. This will be validated against tagging data.
                        </p>
                        <div className="flex gap-3">
                          <Button onClick={() => handleSaveSetScores(set)} size="sm">
                            Save Score
                          </Button>
                          <Button onClick={() => setEditingSetScores(null)} variant="secondary" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Normal Set Display
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-neutral-50">
                              Set {set.set_number}
                            </h3>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              <Icon name={statusIcon} className="w-3.5 h-3.5" />
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-neutral-400">
                            <span className="font-mono">
                              {set.player1_final_score} - {set.player2_final_score}
                            </span>
                            {set.winner_id && (
                              <span className="text-neutral-500">
                                Winner: {set.winner_id === 'player1' ? player1Name : player2Name}
                              </span>
                            )}
                          </div>
                          {set.tagging_started_at && (
                            <div className="text-xs text-neutral-500 mt-1">
                              Started: {new Date(set.tagging_started_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-4">
                          <div className="flex gap-2">
                            {status === 'not_started' && (
                              <>
                                <Button
                                  onClick={() => handleStartTagging(set.set_number)}
                                  size="sm"
                                >
                                  Start Tagging
                                </Button>
                                <Button
                                  onClick={() => handleEditSetScores(set.set_number, set)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Enter Score
                                </Button>
                              </>
                            )}
                            {status === 'in_progress' && (
                              <>
                                {/* MVP: Resume is complex, only support redo */}
                                <Button
                                  onClick={() => handleRedoTagging(set.set_number)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Redo Tagging
                                </Button>
                                <Button
                                  onClick={() => handleEditSetScores(set.set_number, set)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Edit Score
                                </Button>
                              </>
                            )}
                            {status === 'complete' && (
                              <>
                                <Button
                                  onClick={() => handleRedoTagging(set.set_number)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Redo Tagging
                                </Button>
                                <Button
                                  onClick={() => handleEditSetScores(set.set_number, set)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Edit Score
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-700 pt-4">
            <p className="text-xs text-neutral-500">
              <strong>Note:</strong> Each set must be tagged separately. "Redo Tagging" will delete all existing data for that set.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

