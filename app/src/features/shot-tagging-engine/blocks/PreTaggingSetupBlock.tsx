/**
 * PreTaggingSetupBlock - Ask setup questions before tagging begins
 * Updated to match DataViewer/Settings template
 * 
 * Questions:
 * 1. Who is about to serve?
 * 2. What is the current score?
 */

import { useState } from 'react'
import { Button } from '@/ui-mine/Button'
import { Settings } from 'lucide-react'

interface PreTaggingSetupBlockProps {
  player1Name: string
  player2Name: string
  setNumber: number
  onComplete: (data: {
    firstServerId: 'player1' | 'player2'
    startingScore: {
      player1: number
      player2: number
    }
  }) => void
  onCancel: () => void
}

export function PreTaggingSetupBlock({
  player1Name,
  player2Name,
  setNumber,
  onComplete,
  onCancel,
}: PreTaggingSetupBlockProps) {
  const [firstServerId, setFirstServerId] = useState<'player1' | 'player2' | null>(null)
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)

  const handleComplete = () => {
    if (!firstServerId) {
      alert('Please select who is serving first')
      return
    }

    onComplete({
      firstServerId,
      startingScore: {
        player1: player1Score,
        player2: player2Score,
      },
    })
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-bg-surface p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-bg-card border border-neutral-700 rounded-lg p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
              <Settings className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
              Set {setNumber} Setup
            </h1>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Answer these questions before starting to tag
            </p>
          </div>

          <div className="space-y-6">
            {/* Question 1: Who is serving? */}
            <div>
              <label className="block text-base md:text-lg font-medium text-neutral-200 mb-3">
                1. Who is about to serve the first point?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setFirstServerId('player1')}
                  className={`p-4 md:p-6 rounded-lg border-2 transition-all text-left ${
                    firstServerId === 'player1'
                      ? 'border-blue-500 bg-blue-900/30 text-neutral-50'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-lg md:text-xl font-semibold">{player1Name}</div>
                  {firstServerId === 'player1' && (
                    <div className="text-xs md:text-sm text-blue-400 mt-2">✓ Selected</div>
                  )}
                </button>
                <button
                  onClick={() => setFirstServerId('player2')}
                  className={`p-4 md:p-6 rounded-lg border-2 transition-all text-left ${
                    firstServerId === 'player2'
                      ? 'border-blue-500 bg-blue-900/30 text-neutral-50'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-lg md:text-xl font-semibold">{player2Name}</div>
                  {firstServerId === 'player2' && (
                    <div className="text-xs md:text-sm text-blue-400 mt-2">✓ Selected</div>
                  )}
                </button>
              </div>
            </div>

            {/* Question 2: What is the current score? */}
            <div>
              <label className="block text-base md:text-lg font-medium text-neutral-200 mb-3">
                2. What is the current score?
              </label>
              <p className="text-xs md:text-sm text-neutral-500 mb-3">
                Leave as 0-0 if starting from the beginning. If partial recording, enter score when video starts.
              </p>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-xs md:text-sm text-neutral-400 mb-2">{player1Name}</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={player1Score}
                    onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 md:py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 text-xl md:text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-center text-2xl md:text-3xl text-neutral-600">-</div>
                <div>
                  <label className="block text-xs md:text-sm text-neutral-400 mb-2">{player2Name}</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={player2Score}
                    onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 md:py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-50 text-xl md:text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-700">
            <Button
              onClick={handleComplete}
              disabled={!firstServerId}
              className="flex-1"
            >
              Start Tagging
            </Button>
            <Button
              onClick={onCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
