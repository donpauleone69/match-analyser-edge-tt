/**
 * MatchCompletionModalBlock — Post-tagging completion modal
 * 
 * Captures: match result, final scores, video coverage
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent, Badge } from '@/ui-mine'
import type { MatchResult, VideoCoverage } from '@/rules/types'

export interface MatchCompletionFormData {
  matchResult: MatchResult
  finalSetScore: string
  finalPointsScore: string
  videoCoverage: VideoCoverage
}

export interface MatchCompletionModalBlockProps {
  isOpen: boolean
  player1Name: string
  player2Name: string
  currentSetScore: string
  currentPointsScore: string
  onSubmit: (data: MatchCompletionFormData) => void
  onCancel?: () => void
  className?: string
}

export function MatchCompletionModalBlock({
  isOpen,
  player1Name,
  player2Name,
  currentSetScore,
  currentPointsScore,
  onSubmit,
  onCancel,
  className,
}: MatchCompletionModalBlockProps) {
  const [formData, setFormData] = useState<MatchCompletionFormData>({
    matchResult: 'incomplete',
    finalSetScore: currentSetScore,
    finalPointsScore: currentPointsScore,
    videoCoverage: 'full',
  })
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }
  
  const updateField = <K extends keyof MatchCompletionFormData>(
    field: K,
    value: MatchCompletionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className={cn('w-full max-w-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="check" size="md" className="text-success" />
            Complete Match
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Match Result */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Match Winner
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('matchResult', 'player1')}
                  className={cn(
                    'py-3 px-2 rounded-md text-sm font-medium transition-colors flex flex-col items-center',
                    formData.matchResult === 'player1'
                      ? 'bg-success/20 border-2 border-success text-success'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border-2 border-transparent'
                  )}
                >
                  <Icon name="user" size="md" className="mb-1" />
                  <span className="truncate max-w-full">{player1Name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('matchResult', 'player2')}
                  className={cn(
                    'py-3 px-2 rounded-md text-sm font-medium transition-colors flex flex-col items-center',
                    formData.matchResult === 'player2'
                      ? 'bg-success/20 border-2 border-success text-success'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border-2 border-transparent'
                  )}
                >
                  <Icon name="user" size="md" className="mb-1" />
                  <span className="truncate max-w-full">{player2Name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('matchResult', 'incomplete')}
                  className={cn(
                    'py-3 px-2 rounded-md text-sm font-medium transition-colors flex flex-col items-center',
                    formData.matchResult === 'incomplete'
                      ? 'bg-warning/20 border-2 border-warning text-warning'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border-2 border-transparent'
                  )}
                >
                  <Icon name="circle" size="md" className="mb-1" />
                  <span>Incomplete</span>
                </button>
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
                  onChange={(e) => updateField('finalSetScore', e.target.value)}
                  placeholder="e.g. 3-2"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Final Game Score
                </label>
                <input
                  type="text"
                  value={formData.finalPointsScore}
                  onChange={(e) => updateField('finalPointsScore', e.target.value)}
                  placeholder="e.g. 11-8"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                  { value: 'full', label: 'Full Match', desc: 'Complete video' },
                  { value: 'truncatedStart', label: 'Missing Start', desc: 'Video starts mid-match' },
                  { value: 'truncatedEnd', label: 'Missing End', desc: 'Video ends early' },
                  { value: 'truncatedBoth', label: 'Partial', desc: 'Missing start and end' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('videoCoverage', value as VideoCoverage)}
                    className={cn(
                      'py-2 px-3 rounded-md text-left transition-colors',
                      formData.videoCoverage === value
                        ? 'bg-brand-primary/20 border-2 border-brand-primary'
                        : 'bg-neutral-700 border-2 border-transparent hover:bg-neutral-600'
                    )}
                  >
                    <div className="text-sm font-medium text-neutral-100">{label}</div>
                    <div className="text-xs text-neutral-400">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Summary */}
            <div className="p-3 rounded-lg bg-neutral-800 border border-neutral-700">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={formData.matchResult === 'incomplete' ? 'warning' : 'success'}>
                  {formData.matchResult === 'incomplete' ? 'Incomplete' : 'Complete'}
                </Badge>
                <span className="text-neutral-400">
                  {formData.finalSetScore} ({formData.finalPointsScore})
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} fullWidth>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="success" fullWidth>
                <Icon name="check" size="sm" />
                Save & Finish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

