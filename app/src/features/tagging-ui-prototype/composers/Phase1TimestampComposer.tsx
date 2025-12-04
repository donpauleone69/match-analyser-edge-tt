/**
 * Phase1TimestampComposer — Timestamp capture interface for Phase 1
 * 
 * State machine:
 * - Initial: Large SERVE button, inactive Let/InNet/Long buttons
 * - After serve: SHOT button, active Winner/InNet/Long buttons
 * - Each shot press timestamps the shot
 * - Rally end buttons timestamp rally end and reset
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Phase1ServeButtonBlock,
  type RallyState,
  type EndCondition,
} from '../blocks'
import { useTaggingStore } from '@/stores/taggingStore'

export interface Phase1TimestampComposerProps {
  onCompletePhase1?: (rallies: Phase1Rally[]) => void
  className?: string
}

export interface Phase1Shot {
  id: string
  timestamp: number
  shotIndex: number
  isServe: boolean
}

export interface Phase1Rally {
  id: string
  shots: Phase1Shot[]
  endCondition: EndCondition
  endTimestamp: number
  isServeError: boolean
}

export function Phase1TimestampComposer({ onCompletePhase1, className }: Phase1TimestampComposerProps) {
  const currentTime = useTaggingStore(state => state.currentTime)
  
  // Rally state
  const [rallyState, setRallyState] = useState<RallyState>('before-serve')
  const [currentShots, setCurrentShots] = useState<Phase1Shot[]>([])
  const [completedRallies, setCompletedRallies] = useState<Phase1Rally[]>([])
  
  // Button label
  const buttonLabel = rallyState === 'before-serve' ? 'SERVE' : 'SHOT'
  
  // Handle serve/shot button press
  const handleShotPress = () => {
    const shotIndex = currentShots.length
    const isServe = shotIndex === 0
    
    const newShot: Phase1Shot = {
      id: `shot-${Date.now()}-${Math.random()}`,
      timestamp: currentTime,
      shotIndex,
      isServe,
    }
    
    setCurrentShots(prev => [...prev, newShot])
    
    // After first shot (serve), activate end condition buttons
    if (isServe) {
      setRallyState('after-serve')
    }
  }
  
  // Handle rally end condition
  const handleEndCondition = (condition: EndCondition) => {
    // Serve error if:
    // - No shots recorded yet (let on serve)
    // - Only serve recorded and ended with let/innet/long (not winner)
    const isServeError = currentShots.length === 0 || 
      (currentShots.length === 1 && condition !== 'winner')
    
    const rally: Phase1Rally = {
      id: `rally-${Date.now()}-${Math.random()}`,
      shots: [...currentShots],
      endCondition: condition,
      endTimestamp: currentTime,
      isServeError,
    }
    
    setCompletedRallies(prev => [...prev, rally])
    
    // Reset for next rally
    setCurrentShots([])
    setRallyState('before-serve')
  }
  
  return (
    <div className={cn('h-dvh overflow-hidden flex flex-col bg-bg-surface', className)}>
      {/* Shot Log - Top */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        <div className="text-sm text-neutral-500 mb-3">Shot Log</div>
        {completedRallies.length === 0 && currentShots.length === 0 && (
          <div className="text-center text-neutral-600 py-8">
            No shots recorded yet. Press SERVE to begin.
          </div>
        )}
        
        {/* Current rally (in progress) */}
        {currentShots.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/30">
            <div className="text-xs font-medium text-brand-primary mb-2">
              Rally {completedRallies.length + 1} (In Progress)
            </div>
            <div className="space-y-1">
              {currentShots.map((shot, idx) => (
                <div key={shot.id} className="flex items-center gap-2 text-sm text-neutral-300">
                  <span className="font-mono text-xs text-neutral-500">#{idx + 1}</span>
                  <span>{shot.isServe ? 'Serve' : 'Shot'}</span>
                  <span className="ml-auto font-mono text-xs text-neutral-500">{shot.timestamp.toFixed(2)}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Completed rallies */}
        {completedRallies.slice().reverse().map((rally, reverseIdx) => {
          const rallyNumber = completedRallies.length - reverseIdx
          const endConditionLabel = rally.endCondition === 'let' ? 'Let' : 
            rally.endCondition === 'winner' ? 'Winner' :
            rally.endCondition === 'innet' ? 'In Net' : 'Long'
          const endConditionColor = rally.endCondition === 'winner' ? 'text-success' :
            rally.endCondition === 'let' ? 'text-warning' : 'text-danger'
          
          return (
            <div key={rally.id} className="p-3 rounded-lg bg-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-400">
                  Rally {rallyNumber}
                </span>
                <span className={cn('text-xs font-medium', endConditionColor)}>
                  {endConditionLabel}
                  {rally.isServeError && ' (Serve Error)'}
                </span>
              </div>
              <div className="space-y-1">
                {rally.shots.map((shot, idx) => {
                  const isLastShot = idx === rally.shots.length - 1
                  const shotColor = isLastShot ? endConditionColor : 'text-neutral-400'
                  
                  return (
                    <div key={shot.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-neutral-600">#{idx + 1}</span>
                      <span className={cn('text-xs', shotColor)}>
                        {shot.isServe ? 'Serve' : 'Shot'}
                        {isLastShot && rally.endCondition === 'winner' && ' (Winner)'}
                        {isLastShot && rally.endCondition === 'innet' && ' (In Net)'}
                        {isLastShot && rally.endCondition === 'long' && ' (Long)'}
                        {isLastShot && rally.endCondition === 'let' && ' (Let)'}
                      </span>
                      <span className="ml-auto font-mono text-xs text-neutral-600">{shot.timestamp.toFixed(2)}s</span>
                    </div>
                  )
                })}
                {/* Rally End timestamp */}
                <div className="flex items-center gap-2 text-sm pt-1 border-t border-neutral-700/50">
                  <span className="font-mono text-xs text-neutral-600"></span>
                  <span className="text-xs text-neutral-500">Rally End</span>
                  <span className="ml-auto font-mono text-xs text-neutral-600">{rally.endTimestamp.toFixed(2)}s</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Status Strip - Middle */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-neutral-500">Rally {completedRallies.length + 1}</span>
            <span className="text-neutral-400">{currentShots.length} shot{currentShots.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-neutral-500">Total: {completedRallies.length} rallies</span>
            {onCompletePhase1 && completedRallies.length > 0 && (
              <button
                onClick={() => onCompletePhase1(completedRallies)}
                className="px-3 py-1 rounded bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90"
              >
                Complete Phase 1 →
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Controls - Bottom - 3 equal-width columns */}
      <div className="shrink-0 grid grid-cols-3 gap-3 px-4 py-4 bg-bg-card border-t border-neutral-700">
        {/* Column 1: Large SERVE/SHOT button */}
        <Phase1ServeButtonBlock
          label={buttonLabel}
          onClick={handleShotPress}
          shotCount={currentShots.length}
        />
        
        {/* Column 2: Win + In Net (stacked) */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleEndCondition('winner')}
            disabled={rallyState === 'before-serve'}
            className={cn(
              'h-12 px-4 rounded-lg text-base font-semibold text-white',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
              rallyState === 'after-serve'
                ? 'bg-success hover:bg-success/90 shadow-md active:scale-95'
                : 'bg-neutral-800 cursor-not-allowed opacity-50'
            )}
          >
            Win
          </button>
          <button
            type="button"
            onClick={() => handleEndCondition('innet')}
            disabled={rallyState === 'before-serve'}
            className={cn(
              'h-12 px-4 rounded-lg text-base font-semibold text-white',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
              rallyState === 'after-serve'
                ? 'bg-danger hover:bg-danger/90 shadow-md active:scale-95'
                : 'bg-neutral-800 cursor-not-allowed opacity-50'
            )}
          >
            In Net
          </button>
        </div>
        
        {/* Column 3: Let + Long (stacked) */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleEndCondition('let')}
            disabled={rallyState === 'before-serve'}
            className={cn(
              'h-12 px-4 rounded-lg text-base font-semibold text-white',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
              rallyState === 'after-serve'
                ? 'bg-warning hover:bg-warning/90 shadow-md active:scale-95'
                : 'bg-neutral-800 cursor-not-allowed opacity-50'
            )}
          >
            Let
          </button>
          <button
            type="button"
            onClick={() => handleEndCondition('long')}
            disabled={rallyState === 'before-serve'}
            className={cn(
              'h-12 px-4 rounded-lg text-base font-semibold text-white',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
              rallyState === 'after-serve'
                ? 'bg-danger hover:bg-danger/90 shadow-md active:scale-95'
                : 'bg-neutral-800 cursor-not-allowed opacity-50'
            )}
          >
            Long
          </button>
        </div>
      </div>
    </div>
  )
}

