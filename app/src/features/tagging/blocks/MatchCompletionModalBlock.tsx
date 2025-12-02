/**
 * MatchCompletionModalBlock — Modal for completing Part 1
 * 
 * Captures:
 * - Match result (Player 1 / Player 2 / Incomplete)
 * - Final set score
 * - Final points score
 * - Video coverage type
 * 
 * Shown when user clicks "Complete Part 1" in the tagging screen.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'
import type { MatchResult, VideoCoverage } from '@/rules/types'

export interface MatchCompletionData {
  matchResult: MatchResult
  finalSetScore: string
  finalPointsScore: string
  videoCoverage: VideoCoverage
}

export interface MatchCompletionModalBlockProps {
  player1Name: string
  player2Name: string
  currentSetScore: string
  currentPointsScore: string
  onSubmit: (data: MatchCompletionData) => void
  onCancel: () => void
  className?: string
}

export function MatchCompletionModalBlock({
  player1Name,
  player2Name,
  currentSetScore,
  currentPointsScore,
  onSubmit,
  onCancel,
  className,
}: MatchCompletionModalBlockProps) {
  const [formData, setFormData] = useState<MatchCompletionData>({
    matchResult: 'incomplete',
    finalSetScore: currentSetScore,
    finalPointsScore: currentPointsScore,
    videoCoverage: 'full',
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }
  
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="flag" size="md" className="text-success" />
          Complete Part 1 — Match Framework
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Match Result */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Match Result
            </label>
            <div className="flex gap-2">
              {[
                { value: 'player1', label: player1Name },
                { value: 'player2', label: player2Name },
                { value: 'incomplete', label: 'Incomplete' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, matchResult: opt.value as MatchResult }))}
                  className={cn(
                    'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                    formData.matchResult === opt.value
                      ? opt.value === 'incomplete' 
                        ? 'bg-warning text-black'
                        : 'bg-success text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Final Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Final Set Score
              </label>
              <input
                type="text"
                value={formData.finalSetScore}
                onChange={(e) => setFormData(d => ({ ...d, finalSetScore: e.target.value }))}
                placeholder="e.g. 3-2"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Final Points (Last Set)
              </label>
              <input
                type="text"
                value={formData.finalPointsScore}
                onChange={(e) => setFormData(d => ({ ...d, finalPointsScore: e.target.value }))}
                placeholder="e.g. 11-9"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
              />
            </div>
          </div>
          
          {/* Video Coverage */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Video Coverage
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'full', label: 'Full Match' },
                { value: 'truncatedStart', label: 'Truncated Start' },
                { value: 'truncatedEnd', label: 'Truncated End' },
                { value: 'truncatedBoth', label: 'Truncated Both' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, videoCoverage: opt.value as VideoCoverage }))}
                  className={cn(
                    'py-2 px-3 rounded text-xs font-medium transition-colors',
                    formData.videoCoverage === opt.value
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              <Icon name="check" size="sm" />
              Start Shot Tagging
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
