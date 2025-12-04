/**
 * Phase2DetailComposer — V2 sequential question flow for shot tagging
 * 
 * One question at a time with auto-advance.
 * 
 * Serve sequence: Contact → Direction → Length → Spin
 * Shot sequence: Stroke → Direction → Intent
 * Error sequence: Stroke → Intent → Error Type
 */

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Phase1Shot, Phase1Rally } from './Phase1TimestampComposer'
import { ButtonGrid } from '../blocks'
import {
  Button,
  // Serve direction buttons
  LeftLeftButton,
  LeftMidButton,
  LeftRightButton,
  RightLeftButton,
  RightMidButton,
  RightRightButton,
  // Middle direction buttons (for regular shots)
  MidLeftButton,
  MidMidButton,
  MidRightButton,
  // Serve depth buttons
  ShortButton,
  HalfLongButton,
  DeepButton,
  // Spin buttons
  UnderspinButton,
  NoSpinButton,
  TopspinButton,
  // Stroke buttons
  BackhandButton,
  ForehandButton,
  // Intent buttons
  DefensiveButton,
  NeutralButton,
  AggressiveButton,
} from '@/ui-mine'
import { VideoPlayer } from '@/components/tagging/VideoPlayer'
import type { VideoPlayerHandle } from '@/components/tagging/VideoPlayer'
import { useTaggingStore } from '@/stores/taggingStore'

// Question step types
type ServeStep = 'direction' | 'length' | 'spin'
type ShotStep = 'stroke' | 'direction' | 'intent'
type ErrorStep = 'stroke' | 'intent' | 'errorType'

type QuestionStep = ServeStep | ShotStep | ErrorStep | 'complete'

export interface Phase2DetailComposerProps {
  phase1Rallies: Phase1Rally[]
  onComplete?: () => void
  className?: string
}

type Direction = 
  | 'left_left' | 'left_mid' | 'left_right' 
  | 'mid_left' | 'mid_mid' | 'mid_right'
  | 'right_left' | 'right_mid' | 'right_right'

interface DetailedShot extends Phase1Shot {
  rallyId: string
  rallyEndCondition: string
  isLastShot: boolean
  isError: boolean
  // Detailed data
  direction?: Direction
  length?: 'short' | 'halflong' | 'deep'
  spin?: 'underspin' | 'nospin' | 'topspin'
  stroke?: 'backhand' | 'forehand'
  intent?: 'defensive' | 'neutral' | 'aggressive'
  errorType?: 'forced' | 'unforced'
}

export function Phase2DetailComposer({ phase1Rallies, onComplete, className }: Phase2DetailComposerProps) {
  const videoUrl = useTaggingStore(state => state.videoUrl)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  
  // Build flat list of all shots from all rallies
  const [allShots, setAllShots] = useState<DetailedShot[]>(() => {
    const shots: DetailedShot[] = []
    phase1Rallies.forEach((rally) => {
      rally.shots.forEach((shot, index) => {
        const isLastShot = index === rally.shots.length - 1
        const isError = rally.isError && isLastShot  // Only last shot can be error
        shots.push({
          ...shot,
          rallyId: rally.id,
          rallyEndCondition: rally.endCondition,
          isLastShot,
          isError,
        })
      })
    })
    return shots
  })
  
  const [currentShotIndex, setCurrentShotIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<QuestionStep>('direction')  // Start with serve direction
  
  const currentShot = allShots[currentShotIndex]
  
  // Determine question flow based on shot type
  const getNextStep = (current: QuestionStep): QuestionStep => {
    if (!currentShot) return 'complete'
    
    // Serve flow: direction → length → spin → next shot
    if (currentShot.isServe) {
      if (current === 'direction') return 'length'
      if (current === 'length') return 'spin'
      if (current === 'spin') return advanceToNextShot()
    }
    
    // Error shot flow: stroke → intent → errorType → next shot
    if (currentShot.isError) {
      if (current === 'stroke') return 'intent'
      if (current === 'intent') return 'errorType'
      if (current === 'errorType') return advanceToNextShot()
    }
    
    // Regular shot flow: stroke → direction → intent → next shot
    if (current === 'stroke') return 'direction'
    if (current === 'direction') return 'intent'
    if (current === 'intent') return advanceToNextShot()
    
    return 'complete'
  }
  
  const advanceToNextShot = (): QuestionStep => {
    if (currentShotIndex < allShots.length - 1) {
      setCurrentShotIndex(prev => prev + 1)
      // Determine starting question for next shot
      const nextShot = allShots[currentShotIndex + 1]
      return nextShot.isServe ? 'direction' : 'stroke'
    }
    return 'complete'
  }
  
  // Handle answer selection
  const handleAnswer = <T,>(field: keyof DetailedShot, value: T) => {
    // Save answer to current shot
    const updatedShots = [...allShots]
    updatedShots[currentShotIndex] = {
      ...updatedShots[currentShotIndex],
      [field]: value,
    }
    setAllShots(updatedShots)
    
    // Auto-advance to next question
    const nextStep = getNextStep(currentStep)
    setCurrentStep(nextStep)
  }
  
  if (currentStep === 'complete' || !currentShot) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-neutral-50">Tagging Complete!</h2>
          <p className="text-neutral-400">
            All {allShots.length} shots have been tagged.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            {onComplete && (
              <Button variant="primary" onClick={onComplete}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Progress info
  const progress = `${currentShotIndex + 1} of ${allShots.length}`
  const shotLabel = currentShot.isServe ? 'Serve' : `Shot ${currentShot.shotIndex + 1}`
  
  // Build current question label for status bar
  const getCurrentQuestionLabel = (): string => {
    if (currentStep === 'direction') return currentShot?.isServe ? 'Serve Direction' : 'Shot Direction'
    if (currentStep === 'length') return 'Serve Depth'
    if (currentStep === 'spin') return 'Spin Type'
    if (currentStep === 'stroke') return 'Stroke Type'
    if (currentStep === 'intent') return 'Shot Intent'
    if (currentStep === 'errorType') return 'Error Type'
    return ''
  }
  
  const currentQuestionLabel = getCurrentQuestionLabel()
  
  // Helper to get previous shot direction (for dynamic shot direction buttons)
  const getPreviousDirection = (): 'left' | 'mid' | 'right' | null => {
    if (currentShotIndex === 0) return null
    const prevShot = allShots[currentShotIndex - 1]
    if (!prevShot?.direction) return null
    
    // Extract ending position from direction (e.g., 'left_mid' → 'mid')
    const parts = prevShot.direction.split('_')
    return parts[1] as 'left' | 'mid' | 'right'
  }
  
  return (
    <div className={cn('fixed inset-0 flex flex-col bg-bg-surface overflow-hidden', className)}>
      {/* Shot Log - Top (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-bg-surface">
        <div className="text-sm text-neutral-500 mb-3">Shot Log</div>
        
        {phase1Rallies.map((rally, rallyIdx) => {
          const rallyShots = allShots.filter(shot => shot.rallyId === rally.id)
          const hasCurrentShot = rallyShots.some(shot => allShots.indexOf(shot) === currentShotIndex)
          const endConditionLabel = 
            rally.endCondition === 'winner' ? 'Winner' :
            rally.endCondition === 'innet' ? 'In-Net' : 'Long'
          const endConditionColor = 
            rally.endCondition === 'winner' ? 'text-success' : 'text-danger'
          
          return (
            <div 
              key={rally.id} 
              className={cn(
                'p-3 rounded-lg',
                hasCurrentShot ? 'bg-brand-primary/10 border border-brand-primary/30' : 'bg-neutral-800'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-xs font-medium', hasCurrentShot ? 'text-brand-primary' : 'text-neutral-400')}>
                  Rally {rallyIdx + 1} {hasCurrentShot && '(Tagging)'}
                </span>
                <span className={cn('text-xs font-medium', endConditionColor)}>
                  {endConditionLabel}
                  {rally.isError && ' (Error)'}
                </span>
              </div>
              <div className="space-y-1">
                {rallyShots.map((shot, idx) => {
                  const globalIdx = allShots.indexOf(shot)
                  const isCurrent = globalIdx === currentShotIndex
                  const isCompleted = globalIdx < currentShotIndex
                  
                  return (
                    <div key={shot.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-neutral-600">#{idx + 1}</span>
                      <span className={cn('text-xs', isCompleted ? 'text-neutral-400' : 'text-neutral-600')}>
                        {shot.isServe ? 'Serve' : 'Shot'}
                      </span>
                      <span className="ml-auto font-mono text-xs text-neutral-600">{shot.timestamp.toFixed(2)}s</span>
                      {isCurrent && <span className="text-xs text-brand-primary font-medium ml-2">←</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Video Player - Fixed height, full width */}
      <div className="shrink-0 w-full aspect-video bg-black">
        <VideoPlayer
          ref={videoPlayerRef}
          videoSrc={videoUrl || undefined}
          compact={true}
          showTimeOverlay={true}
        />
      </div>
      
      {/* Progress Strip - Below Video */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">{shotLabel}: {currentQuestionLabel}?</span>
          <span className="text-neutral-400">{progress}</span>
        </div>
      </div>
      
      {/* Question Controls - Bottom */}
      <div className="shrink-0 bg-bg-card border-t border-neutral-700">
        {/* Serve questions */}
        {currentShot.isServe && currentStep === 'direction' && (
          <ButtonGrid columns={6}>
            <LeftLeftButton onClick={() => handleAnswer('direction', 'left_left')} className="!w-full !aspect-auto" />
            <LeftMidButton onClick={() => handleAnswer('direction', 'left_mid')} className="!w-full !aspect-auto" />
            <LeftRightButton onClick={() => handleAnswer('direction', 'left_right')} className="!w-full !aspect-auto" />
            <RightLeftButton onClick={() => handleAnswer('direction', 'right_left')} className="!w-full !aspect-auto" />
            <RightMidButton onClick={() => handleAnswer('direction', 'right_mid')} className="!w-full !aspect-auto" />
            <RightRightButton onClick={() => handleAnswer('direction', 'right_right')} className="!w-full !aspect-auto" />
          </ButtonGrid>
        )}
        {currentShot.isServe && currentStep === 'length' && (
          <ButtonGrid columns={3}>
            <ShortButton onClick={() => handleAnswer('length', 'short')} />
            <HalfLongButton onClick={() => handleAnswer('length', 'halflong')} />
            <DeepButton onClick={() => handleAnswer('length', 'deep')} />
          </ButtonGrid>
        )}
        {currentShot.isServe && currentStep === 'spin' && (
          <ButtonGrid columns={3}>
            <UnderspinButton onClick={() => handleAnswer('spin', 'underspin')} />
            <NoSpinButton onClick={() => handleAnswer('spin', 'nospin')} />
            <TopspinButton onClick={() => handleAnswer('spin', 'topspin')} />
          </ButtonGrid>
        )}
        
        {/* Regular shot questions */}
        {!currentShot.isServe && !currentShot.isError && currentStep === 'stroke' && (
          <ButtonGrid columns={2}>
            <BackhandButton onClick={() => handleAnswer('stroke', 'backhand')} />
            <ForehandButton onClick={() => handleAnswer('stroke', 'forehand')} />
          </ButtonGrid>
        )}
        {!currentShot.isServe && !currentShot.isError && currentStep === 'direction' && (
          <ButtonGrid columns={3}>
              {getPreviousDirection() === 'left' && (
                <>
                  <LeftLeftButton onClick={() => handleAnswer('direction', 'left_left')} />
                  <LeftMidButton onClick={() => handleAnswer('direction', 'left_mid')} />
                  <LeftRightButton onClick={() => handleAnswer('direction', 'left_right')} />
                </>
              )}
              {getPreviousDirection() === 'mid' && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
              {getPreviousDirection() === 'right' && (
                <>
                  <RightLeftButton onClick={() => handleAnswer('direction', 'right_left')} />
                  <RightMidButton onClick={() => handleAnswer('direction', 'right_mid')} />
                  <RightRightButton onClick={() => handleAnswer('direction', 'right_right')} />
                </>
              )}
              {/* Fallback if previous direction is null (shouldn't happen but safe) */}
              {!getPreviousDirection() && (
                <>
                  <MidLeftButton onClick={() => handleAnswer('direction', 'mid_left')} />
                  <MidMidButton onClick={() => handleAnswer('direction', 'mid_mid')} />
                  <MidRightButton onClick={() => handleAnswer('direction', 'mid_right')} />
                </>
              )}
          </ButtonGrid>
        )}
        {!currentShot.isServe && !currentShot.isError && currentStep === 'intent' && (
          <ButtonGrid columns={3}>
            <DefensiveButton onClick={() => handleAnswer('intent', 'defensive')} />
            <NeutralButton onClick={() => handleAnswer('intent', 'neutral')} />
            <AggressiveButton onClick={() => handleAnswer('intent', 'aggressive')} />
          </ButtonGrid>
        )}
        
        {/* Error shot questions */}
        {currentShot.isError && currentStep === 'stroke' && (
          <ButtonGrid columns={2}>
            <BackhandButton onClick={() => handleAnswer('stroke', 'backhand')} />
            <ForehandButton onClick={() => handleAnswer('stroke', 'forehand')} />
          </ButtonGrid>
        )}
        {currentShot.isError && currentStep === 'intent' && (
          <ButtonGrid columns={3}>
            <DefensiveButton onClick={() => handleAnswer('intent', 'defensive')} />
            <NeutralButton onClick={() => handleAnswer('intent', 'neutral')} />
            <AggressiveButton onClick={() => handleAnswer('intent', 'aggressive')} />
          </ButtonGrid>
        )}
        {currentShot.isError && currentStep === 'errorType' && (
          <ButtonGrid columns={2}>
            <button
              type="button"
              onClick={() => handleAnswer('errorType', 'forced')}
              className="h-full aspect-square px-4 rounded-lg text-xl font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all duration-150 shadow-md active:scale-95"
              style={{ maxWidth: 'var(--button-grid-height, 100%)' }}
            >
              Forced
            </button>
            <button
              type="button"
              onClick={() => handleAnswer('errorType', 'unforced')}
              className="h-full aspect-square px-4 rounded-lg text-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all duration-150 shadow-md active:scale-95"
              style={{ maxWidth: 'var(--button-grid-height, 100%)' }}
            >
              Unforced
            </button>
          </ButtonGrid>
        )}
      </div>
    </div>
  )
}
