/**
 * Phase1TimestampComposer — V2 timestamp capture with 1x3 button layout
 * 
 * Layout: Fault | Win | Serve/Shot
 * 
 * Error detection:
 * - Fault triggers In-Net or Long placement choice
 * - In-Net and Long mark rally as error
 * - Win does NOT mark as error
 */

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Phase1ControlsBlock, type RallyState, type EndCondition } from '../blocks'
import { useTaggingStore } from '@/stores/taggingStore'
import { VideoPlayer } from '@/components/tagging/VideoPlayer'
import type { VideoPlayerHandle } from '@/components/tagging/VideoPlayer'

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
  isError: boolean  // true if ended with 'innet' or 'long'
  errorPlacement?: 'innet' | 'long'  // stores which type of fault
}

export function Phase1TimestampComposer({ onCompletePhase1, className }: Phase1TimestampComposerProps) {
  const currentTime = useTaggingStore(state => state.currentTime)
  const videoUrl = useTaggingStore(state => state.videoUrl)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  
  // Rally state
  const [rallyState, setRallyState] = useState<RallyState>('before-serve')
  const [currentShots, setCurrentShots] = useState<Phase1Shot[]>([])
  const [completedRallies, setCompletedRallies] = useState<Phase1Rally[]>([])
  
  // Handle serve/shot button press
  const handleServeShot = () => {
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
  
  // Handle shot missed (long/missed)
  const handleShotMissed = () => {
    const rally: Phase1Rally = {
      id: `rally-${Date.now()}-${Math.random()}`,
      shots: [...currentShots],
      endCondition: 'long',
      endTimestamp: currentTime,
      isError: true,
      errorPlacement: 'long',
    }
    
    setCompletedRallies(prev => [...prev, rally])
    
    // Reset for next rally
    setCurrentShots([])
    setRallyState('before-serve')
  }
  
  // Handle in net
  const handleInNet = () => {
    const rally: Phase1Rally = {
      id: `rally-${Date.now()}-${Math.random()}`,
      shots: [...currentShots],
      endCondition: 'innet',
      endTimestamp: currentTime,
      isError: true,
      errorPlacement: 'innet',
    }
    
    setCompletedRallies(prev => [...prev, rally])
    
    // Reset for next rally
    setCurrentShots([])
    setRallyState('before-serve')
  }
  
  // Handle winning shot
  const handleWin = () => {
    const rally: Phase1Rally = {
      id: `rally-${Date.now()}-${Math.random()}`,
      shots: [...currentShots],
      endCondition: 'winner',
      endTimestamp: currentTime,
      isError: false,
    }
    
    setCompletedRallies(prev => [...prev, rally])
    
    // Reset for next rally
    setCurrentShots([])
    setRallyState('before-serve')
  }
  
  return (
    <div className={cn('fixed inset-0 flex flex-col bg-bg-surface overflow-hidden', className)}>
      {/* Shot Log - Top (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-bg-surface">
        <div className="text-sm text-neutral-500 mb-3">Shot Log</div>
        {completedRallies.length === 0 && currentShots.length === 0 && (
          <div className="text-center text-neutral-600 py-8">
            No shots recorded yet. Press Serve/Shot to begin.
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
          const endConditionLabel = 
            rally.endCondition === 'winner' ? 'Winner' :
            rally.endCondition === 'innet' ? 'In-Net' : 'Long'
          const endConditionColor = 
            rally.endCondition === 'winner' ? 'text-success' : 'text-danger'
          
          return (
            <div key={rally.id} className="p-3 rounded-lg bg-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-400">
                  Rally {rallyNumber}
                </span>
                <span className={cn('text-xs font-medium', endConditionColor)}>
                  {endConditionLabel}
                  {rally.isError && ' (Fault)'}
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
                        {isLastShot && rally.endCondition === 'innet' && ' (In-Net)'}
                        {isLastShot && rally.endCondition === 'long' && ' (Long)'}
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
      
      {/* Video Player - Fixed height, full width */}
      <div className="shrink-0 w-full aspect-video bg-black">
        <VideoPlayer
          ref={videoPlayerRef}
          videoSrc={videoUrl}
          compact={true}
          showTimeOverlay={true}
        />
      </div>
      
      {/* Status Strip - Below Video */}
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
      
      {/* Controls - Bottom - 1x4 button layout */}
      <div className="shrink-0 bg-bg-card border-t border-neutral-700">
        <Phase1ControlsBlock
          rallyState={rallyState}
          onServeShot={handleServeShot}
          onShotMissed={handleShotMissed}
          onInNet={handleInNet}
          onWin={handleWin}
        />
      </div>
    </div>
  )
}
