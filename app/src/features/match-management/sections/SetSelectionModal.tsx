/**
 * SetSelectionModal - Choose which set to tag with status indicators
 * Updated to match DataViewer/Settings template
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui-mine/Button'
import type { DBSet } from '@/data'
import { Icon } from '@/ui-mine/Icon'
import { setDb } from '@/data'
import { Play, X } from 'lucide-react'
const { update: updateSet } = setDb

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
    navigate(`/matches/${matchId}/tag?set=${setNumber}`)
  }

  const handleRedoTagging = (setNumber: number) => {
    setShowRedoConfirm(setNumber)
  }

  const confirmRedo = (setNumber: number) => {
    navigate(`/matches/${matchId}/tag?set=${setNumber}&redo=true`)
  }

  const handleEditSetScores = (setNumber: number, currentSet: DBSet) => {
    setEditingSetScores(setNumber)
    setSetScoreForm({
      player1Score: currentSet.player1_score_final,
      player2Score: currentSet.player2_score_final,
    })
  }

  const handleSaveSetScores = async (set: DBSet) => {
    try {
      const p1Score = setScoreForm.player1Score
      const p2Score = setScoreForm.player2Score
      
      if (p1Score < 0 || p2Score < 0) {
        alert('Scores cannot be negative')
        return
      }
      
      let winnerId: string | null = null
      
      if ((p1Score >= 11 || p2Score >= 11) && Math.abs(p1Score - p2Score) >= 2) {
        winnerId = p1Score > p2Score ? player1Id : player2Id
      } else if (p1Score > 0 || p2Score > 0) {
        winnerId = null
      }
      
      await updateSet(set.id, {
        player1_score_final: p1Score,
        player2_score_final: p2Score,
        winner_id: winnerId,
      })
      
      setEditingSetScores(null)
      alert('Set scores updated! Please refresh to see changes.')
    } catch (error) {
      console.error('Failed to update set scores:', error)
      alert('Failed to update set scores')
    }
  }

  const getSetStatus = (set: DBSet): 'not_started' | 'phase1_in_progress' | 'phase1_complete' | 'phase2_in_progress' | 'complete' => {
    // Use tagging_phase if available (new schema), fallback to old logic
    if (set.tagging_phase) {
      if (set.tagging_phase === 'not_started') return 'not_started'
      if (set.tagging_phase === 'phase1_in_progress') return 'phase1_in_progress'
      if (set.tagging_phase === 'phase1_complete') return 'phase1_complete'
      if (set.tagging_phase === 'phase2_in_progress') return 'phase2_in_progress'
      if (set.tagging_phase === 'phase2_complete') return 'complete'
    }
    
    // Fallback for old schema
    if (!set.tagging_started_at) return 'not_started'
    if (set.is_tagged && set.tagging_completed_at) return 'complete'
    return 'phase1_in_progress'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-400 bg-green-900/30 border-green-700'
      case 'phase2_in_progress':
        return 'text-blue-400 bg-blue-900/30 border-blue-700'
      case 'phase1_complete':
        return 'text-cyan-400 bg-cyan-900/30 border-cyan-700'
      case 'phase1_in_progress':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-700'
      default:
        return 'text-neutral-400 bg-neutral-800 border-neutral-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return 'check'
      case 'phase2_in_progress':
      case 'phase1_in_progress':
        return 'clock'
      case 'phase1_complete':
        return 'check'
      default:
        return 'circle'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Phase 2 Complete'
      case 'phase2_in_progress':
        return 'Phase 2 In Progress'
      case 'phase1_complete':
        return 'Phase 1 Complete'
      case 'phase1_in_progress':
        return 'Phase 1 In Progress'
      default:
        return 'Not Started'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-neutral-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
                <Play className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
                Select Set to Tag
              </h1>
              <p className="text-neutral-400 mt-2 text-sm md:text-base">
                {player1Name} vs {player2Name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-50 transition-colors p-2 hover:bg-neutral-700 rounded-lg"
            >
              <X className="w-6 h-6" />
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
                    className="bg-bg-shell border border-neutral-700 rounded-lg p-3 md:p-4 hover:border-neutral-600 transition-colors"
                  >
                    {showRedoConfirm === set.set_number ? (
                      // Redo Confirmation
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <Icon name="alert" className="w-5 h-5" />
                          <span className="font-semibold text-sm md:text-base">Confirm Redo</span>
                        </div>
                        <p className="text-sm text-neutral-300">
                          This will delete all existing tagging data for Set {set.set_number}. This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => confirmRedo(set.set_number)}
                            size="sm"
                          >
                            Yes, Delete
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
                      <div className="space-y-3">
                        <h3 className="font-semibold text-neutral-50 text-sm md:text-base">
                          Enter Set {set.set_number} Score
                        </h3>
                        <div className="grid grid-cols-3 gap-3 items-center">
                          <div>
                            <label className="block text-xs md:text-sm text-neutral-400 mb-1">
                              {player1Name}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={setScoreForm.player1Score}
                              onChange={(e) => setSetScoreForm({ ...setScoreForm, player1Score: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base text-center"
                            />
                          </div>
                          <div className="text-center text-neutral-600 text-xl md:text-2xl">-</div>
                          <div>
                            <label className="block text-xs md:text-sm text-neutral-400 mb-1">
                              {player2Name}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={setScoreForm.player2Score}
                              onChange={(e) => setSetScoreForm({ ...setScoreForm, player2Score: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base text-center"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleSaveSetScores(set)} size="sm">
                            Save
                          </Button>
                          <Button onClick={() => setEditingSetScores(null)} variant="secondary" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Normal Set Display
                      <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base md:text-lg font-semibold text-neutral-50">
                              Set {set.set_number}
                            </h3>
                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                              <Icon name={statusIcon} className="w-3 h-3" />
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs md:text-sm text-neutral-400">
                            <span className="font-mono">
                              {set.player1_score_final} - {set.player2_score_final}
                            </span>
                            {set.winner_id && (
                              <span className="text-neutral-500 truncate">
                                Winner: {set.winner_id === 'player1' ? player1Name : player2Name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 shrink-0 flex-wrap">
                          {status === 'not_started' && (
                            <>
                              <Button
                                onClick={() => handleStartTagging(set.set_number)}
                                size="sm"
                              >
                                Tag Phase 1
                              </Button>
                              <Button
                                onClick={() => handleEditSetScores(set.set_number, set)}
                                variant="secondary"
                                size="sm"
                              >
                                Score
                              </Button>
                            </>
                          )}
                          {status === 'phase1_in_progress' && (
                            <>
                              <Button
                                onClick={() => handleStartTagging(set.set_number)}
                                size="sm"
                                variant="primary"
                              >
                                Continue Phase 1
                              </Button>
                              <Button
                                onClick={() => handleRedoTagging(set.set_number)}
                                variant="secondary"
                                size="sm"
                              >
                                Redo
                              </Button>
                            </>
                          )}
                          {status === 'phase1_complete' && (
                            <>
                              <Button
                                onClick={() => handleStartTagging(set.set_number)}
                                size="sm"
                                variant="primary"
                              >
                                Tag Phase 2
                              </Button>
                              <Button
                                onClick={() => handleRedoTagging(set.set_number)}
                                variant="secondary"
                                size="sm"
                              >
                                Redo Phase 1
                              </Button>
                            </>
                          )}
                          {status === 'phase2_in_progress' && (
                            <>
                              <Button
                                onClick={() => handleStartTagging(set.set_number)}
                                size="sm"
                                variant="primary"
                              >
                                Continue Phase 2
                              </Button>
                              <Button
                                onClick={() => handleRedoTagging(set.set_number)}
                                variant="secondary"
                                size="sm"
                              >
                                Redo
                              </Button>
                            </>
                          )}
                          {status === 'complete' && (
                            <>
                              <Button
                                onClick={() => navigate(`/data-viewer?setId=${set.id}`)}
                                variant="primary"
                                size="sm"
                              >
                                View Data
                              </Button>
                              <Button
                                onClick={() => handleRedoTagging(set.set_number)}
                                variant="secondary"
                                size="sm"
                              >
                                Redo
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-700 pt-4 mt-6">
            <p className="text-xs text-neutral-500">
              <strong>Note:</strong> Each set must be tagged separately. "Redo" will delete all existing data for that set.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
