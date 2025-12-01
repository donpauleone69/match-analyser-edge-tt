/**
 * MatchDetailsModalBlock — Pre-tagging setup modal
 * 
 * Captures: player names, match date, first server, tagging mode
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'
import type { PlayerId, TaggingMode } from '@/rules/types'

export interface MatchDetailsFormData {
  player1Name: string
  player2Name: string
  matchDate: string
  firstServerId: PlayerId
  taggingMode: TaggingMode
  videoStartSetScore: string
  videoStartPointsScore: string
}

export interface MatchDetailsModalBlockProps {
  isOpen: boolean
  initialData?: Partial<MatchDetailsFormData>
  onSubmit: (data: MatchDetailsFormData) => void
  onCancel?: () => void
  className?: string
}

export function MatchDetailsModalBlock({
  isOpen,
  initialData,
  onSubmit,
  onCancel,
  className,
}: MatchDetailsModalBlockProps) {
  const [formData, setFormData] = useState<MatchDetailsFormData>({
    player1Name: initialData?.player1Name || 'Player 1',
    player2Name: initialData?.player2Name || 'Player 2',
    matchDate: initialData?.matchDate || new Date().toISOString().split('T')[0],
    firstServerId: initialData?.firstServerId || 'player1',
    taggingMode: initialData?.taggingMode || 'essential',
    videoStartSetScore: initialData?.videoStartSetScore || '0-0',
    videoStartPointsScore: initialData?.videoStartPointsScore || '0-0',
  })
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }
  
  const updateField = <K extends keyof MatchDetailsFormData>(
    field: K,
    value: MatchDetailsFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className={cn('w-full max-w-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="settings" size="md" />
            Match Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Player 1
                </label>
                <input
                  type="text"
                  value={formData.player1Name}
                  onChange={(e) => updateField('player1Name', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Player 1 name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Player 2
                </label>
                <input
                  type="text"
                  value={formData.player2Name}
                  onChange={(e) => updateField('player2Name', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Player 2 name"
                />
              </div>
            </div>
            
            {/* Match Date */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Match Date
              </label>
              <input
                type="date"
                value={formData.matchDate}
                onChange={(e) => updateField('matchDate', e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            
            {/* First Server */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                First Server
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField('firstServerId', 'player1')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors',
                    formData.firstServerId === 'player1'
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {formData.player1Name || 'Player 1'}
                </button>
                <button
                  type="button"
                  onClick={() => updateField('firstServerId', 'player2')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors',
                    formData.firstServerId === 'player2'
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {formData.player2Name || 'Player 2'}
                </button>
              </div>
            </div>
            
            {/* Tagging Mode */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Tagging Mode
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField('taggingMode', 'essential')}
                  className={cn(
                    'flex-1 py-3 px-3 rounded-md text-sm font-medium transition-colors flex flex-col items-center',
                    formData.taggingMode === 'essential'
                      ? 'bg-info/20 border-2 border-info text-info'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border-2 border-transparent'
                  )}
                >
                  <span className="font-semibold">Essential</span>
                  <span className="text-xs opacity-70 mt-1">Quick tagging</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('taggingMode', 'full')}
                  className={cn(
                    'flex-1 py-3 px-3 rounded-md text-sm font-medium transition-colors flex flex-col items-center',
                    formData.taggingMode === 'full'
                      ? 'bg-brand-primary/20 border-2 border-brand-primary text-brand-primary'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border-2 border-transparent'
                  )}
                >
                  <span className="font-semibold">Full</span>
                  <span className="text-xs opacity-70 mt-1">Detailed analysis</span>
                </button>
              </div>
            </div>
            
            {/* Video Start Score (optional) */}
            <div className="pt-2 border-t border-neutral-700">
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Video Start Score (if not from beginning)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Sets</label>
                  <input
                    type="text"
                    value={formData.videoStartSetScore}
                    onChange={(e) => updateField('videoStartSetScore', e.target.value)}
                    placeholder="0-0"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Points</label>
                  <input
                    type="text"
                    value={formData.videoStartPointsScore}
                    onChange={(e) => updateField('videoStartPointsScore', e.target.value)}
                    placeholder="0-0"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} fullWidth>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="primary" fullWidth>
                <Icon name="check" size="sm" />
                Start Tagging
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

