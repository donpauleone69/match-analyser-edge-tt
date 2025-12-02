/**
 * MatchSetupPanelBlock — Inline pre-tagging setup panel (CRITICAL FIRST STEP)
 * 
 * Replaces modal with inline panel below video during setup phase.
 * Allows user to navigate video while filling in match details.
 * 
 * Captures the Match Framework that enables ALL server derivation:
 * - Player names
 * - Match date
 * - First server (enables server calculation for all rallies)
 * - First serve timestamp (user locates in video)
 * - Starting scores (for partial videos)
 * - Tagging mode (Essential vs Full)
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'
import { formatTime } from '@/lib/utils'
import type { PlayerId, TaggingMode } from '@/rules/types'

export type TournamentType = 'friendly' | 'club' | 'regional' | 'national'
export type MatchFormat = 'bestOf1' | 'bestOf3' | 'bestOf5' | 'bestOf7'

export interface MatchSetupFormData {
  player1Name: string
  player2Name: string
  matchDate: string
  firstServerId: PlayerId
  taggingMode: TaggingMode
  matchFormat: MatchFormat
  tournament: TournamentType
  // Video start scores - separate fields
  player1StartSets: number
  player2StartSets: number
  player1StartPoints: number
  player2StartPoints: number
  firstServeTimestamp: number | null
}

export interface MatchSetupPanelBlockProps {
  initialData?: Partial<MatchSetupFormData>
  currentVideoTime: number
  onSubmit: (data: MatchSetupFormData) => void
  className?: string
}

export function MatchSetupPanelBlock({
  initialData,
  currentVideoTime,
  onSubmit,
  className,
}: MatchSetupPanelBlockProps) {
  const [formData, setFormData] = useState<MatchSetupFormData>({
    player1Name: initialData?.player1Name || 'Player 1',
    player2Name: initialData?.player2Name || 'Player 2',
    matchDate: initialData?.matchDate || new Date().toISOString().split('T')[0],
    firstServerId: initialData?.firstServerId || 'player1',
    taggingMode: initialData?.taggingMode || 'essential',
    matchFormat: initialData?.matchFormat || 'bestOf5',
    tournament: initialData?.tournament || 'friendly',
    player1StartSets: initialData?.player1StartSets ?? 0,
    player2StartSets: initialData?.player2StartSets ?? 0,
    player1StartPoints: initialData?.player1StartPoints ?? 0,
    player2StartPoints: initialData?.player2StartPoints ?? 0,
    firstServeTimestamp: initialData?.firstServeTimestamp ?? null,
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }
  
  const updateField = <K extends keyof MatchSetupFormData>(
    field: K,
    value: MatchSetupFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const canSubmit = formData.firstServeTimestamp !== null
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon name="settings" size="md" />
          Match Setup
        </CardTitle>
        <p className="text-xs text-neutral-400 mt-1">
          Navigate to the first serve in the video, then complete the setup
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Player Names */}
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
          
          {/* Row 2: Date, First Server, Tagging Mode */}
          <div className="grid grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                First Server
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateField('firstServerId', 'player1')}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors truncate',
                    formData.firstServerId === 'player1'
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {formData.player1Name || 'P1'}
                </button>
                <button
                  type="button"
                  onClick={() => updateField('firstServerId', 'player2')}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors truncate',
                    formData.firstServerId === 'player2'
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {formData.player2Name || 'P2'}
                </button>
              </div>
            </div>
            
            {/* Tagging Mode */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Tagging Mode
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateField('taggingMode', 'essential')}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors',
                    formData.taggingMode === 'essential'
                      ? 'bg-info text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  Essential
                </button>
                <button
                  type="button"
                  onClick={() => updateField('taggingMode', 'full')}
                  disabled
                  className={cn(
                    'flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors',
                    formData.taggingMode === 'full'
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  )}
                  title="Full mode coming soon"
                >
                  Full
                </button>
              </div>
            </div>
          </div>
          
          {/* Row 2b: Match Format + Tournament */}
          <div className="grid grid-cols-2 gap-4">
            {/* Match Format */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Match Format
              </label>
              <select
                value={formData.matchFormat}
                onChange={(e) => updateField('matchFormat', e.target.value as MatchFormat)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="bestOf1">Best of 1</option>
                <option value="bestOf3">Best of 3</option>
                <option value="bestOf5">Best of 5</option>
                <option value="bestOf7">Best of 7</option>
              </select>
            </div>
            
            {/* Tournament Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Tournament
              </label>
              <select
                value={formData.tournament}
                onChange={(e) => updateField('tournament', e.target.value as TournamentType)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="friendly">Friendly</option>
                <option value="club">Club</option>
                <option value="regional">Regional</option>
                <option value="national">National</option>
              </select>
            </div>
          </div>
          
          {/* Row 3: Video Start Score (optional - for partial videos) */}
          <div className="pt-2 border-t border-neutral-700">
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              Video Start Score (if video doesn't start at 0-0)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  {formData.player1Name} Sets
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={formData.player1StartSets}
                  onChange={(e) => updateField('player1StartSets', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  {formData.player2Name} Sets
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={formData.player2StartSets}
                  onChange={(e) => updateField('player2StartSets', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  {formData.player1Name} Pts
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.player1StartPoints}
                  onChange={(e) => updateField('player1StartPoints', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  {formData.player2Name} Pts
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.player2StartPoints}
                  onChange={(e) => updateField('player2StartPoints', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>
          
          {/* Row 4: First Serve Timestamp (CRITICAL) */}
          <div className="pt-2 border-t border-neutral-700">
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              First Serve Timestamp
              <span className="text-danger ml-1">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => updateField('firstServeTimestamp', currentVideoTime)}
                className="shrink-0"
              >
                <Icon name="target" size="sm" />
                Mark First Serve
              </Button>
              {formData.firstServeTimestamp !== null ? (
                <span className="text-sm font-mono text-success">
                  {formatTime(formData.firstServeTimestamp)}
                </span>
              ) : (
                <span className="text-sm text-neutral-500">Navigate to first serve in video</span>
              )}
            </div>
          </div>
          
          {/* Submit */}
          <div className="flex items-center gap-4 pt-4">
            <Button 
              type="submit" 
              variant="primary" 
              size="lg"
              disabled={!canSubmit}
              className="flex-1"
            >
              <Icon name="play" size="sm" />
              Start Tagging
            </Button>
            {!canSubmit && (
              <p className="text-xs text-warning">
                Please mark the first serve timestamp
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


