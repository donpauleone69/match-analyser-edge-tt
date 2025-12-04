/**
 * Phase2DetailComposer — Detailed shot tagging interface for Phase 2
 * 
 * Auto-advances through all shots from Phase 1, showing appropriate input screen
 * based on shot type and rally end condition.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ProgressIndicatorBlock,
  ServeDetailBlock,
  type ServeDetailData,
  type ServeContact,
  type ServeDirection,
  type Direction,
  type Intent,
  type Wing,
} from '../blocks'
import type { Phase1Shot, Phase1Rally } from './Phase1TimestampComposer'
import { Button, Icon } from '@/ui-mine'

// Types for detailed shot data
type ErrorType = 'forced' | 'unforced'
type ShotQuality = 'average' | 'good'

interface StandardShotData {
  intent: Intent | null
  wing: Wing // Always has a value (defaults to backhand)
  quality: ShotQuality // Always has a value (defaults to average)
  direction: Direction // Always has a value (defaults to diagonal)
}

interface ErrorShotData {
  intent: Intent | null
  wing: Wing // Always has a value (defaults to backhand)
  errorType: ErrorType // Always has a value (defaults to unforced)
}

export interface Phase2DetailComposerProps {
  phase1Rallies: Phase1Rally[]
  onComplete?: () => void
  className?: string
}

interface DetailedShot extends Phase1Shot {
  rallyId: string
  rallyEndCondition: string
  isLastShot: boolean
  // Detailed data
  serveDetail?: ServeDetailData
  standardDetail?: StandardShotData
  errorDetail?: ErrorShotData
}

export function Phase2DetailComposer({ phase1Rallies, onComplete, className }: Phase2DetailComposerProps) {
  // Build flat list of all shots from all rallies
  const [allShots, setAllShots] = useState<DetailedShot[]>(() => {
    const shots: DetailedShot[] = []
    phase1Rallies.forEach((rally) => {
      // Skip serve errors (they have no shots to tag)
      if (rally.isServeError) return
      
      rally.shots.forEach((shot, index) => {
        const isLastShot = index === rally.shots.length - 1
        shots.push({
          ...shot,
          rallyId: rally.id,
          rallyEndCondition: rally.endCondition,
          isLastShot,
        })
      })
    })
    return shots
  })
  
  const [currentShotIndex, setCurrentShotIndex] = useState(0)
  const currentShot = allShots[currentShotIndex]
  
  // Determine which screen to show
  const screenType: 'serve' | 'standard' | 'error' | 'complete' = 
    !currentShot ? 'complete' :
    // Serve (not a serve error)
    currentShot.isServe && !currentShot.isLastShot ? 'serve' :
    // Last shot that's an error
    currentShot.isLastShot && (currentShot.rallyEndCondition === 'innet' || currentShot.rallyEndCondition === 'long' || currentShot.rallyEndCondition === 'let') ? 'error' :
    // Everything else: mid-rally shots, winners, returns
    'standard'
  
  // Initialize form data based on screen type
  const [serveData, setServeData] = useState<ServeDetailData>({
    contact: 'left', // Default to left
    direction: 'diagonal', // Default to diagonal
    length: null,
    spin: null,
  })
  
  const [standardData, setStandardData] = useState<StandardShotData>({
    intent: null,
    wing: 'backhand', // Default to backhand
    quality: 'average', // Default to average
    direction: 'diagonal', // Default to diagonal
  })
  
  const [errorData, setErrorData] = useState<ErrorShotData>({
    intent: null,
    wing: 'backhand', // Default to backhand
    errorType: 'unforced', // Default to unforced
  })
  
  // Set defaults based on previous shot
  useEffect(() => {
    if (currentShotIndex === 0 || !currentShot) return
    
    const previousShot = allShots[currentShotIndex - 1]
    
    // For shot 2 (receive): determine wing based on serve contact + direction
    if (currentShotIndex === 1 && previousShot.serveDetail) {
      const { contact, direction } = previousShot.serveDetail
      // Ball lands on right side (receiver's backhand) if:
      // - Contact Left + Direction Diagonal, OR
      // - Contact Right + Direction Line
      const landsOnRightSide = 
        (contact === 'left' && direction === 'diagonal') ||
        (contact === 'right' && direction === 'line')
      
      const receiveWing = landsOnRightSide ? 'backhand' : 'forehand'
      setStandardData(prev => ({ ...prev, wing: receiveWing }))
      setErrorData(prev => ({ ...prev, wing: receiveWing }))
      return
    }
    
    // For all subsequent shots: look at previous shot's direction
    const prevStandard = previousShot.standardDetail
    const prevError = previousShot.errorDetail
    const prevDirection = prevStandard?.direction || prevError?.direction
    const prevWing = prevStandard?.wing || prevError?.wing || 'backhand'
    
    if (!prevDirection) return
    
    // If previous direction was diagonal, keep same wing
    // If previous direction was line, switch wing
    const newWing = prevDirection === 'diagonal' ? prevWing : 
      (prevWing === 'backhand' ? 'forehand' : 'backhand')
    
    setStandardData(prev => ({ ...prev, wing: newWing }))
    setErrorData(prev => ({ ...prev, wing: newWing }))
  }, [currentShotIndex, currentShot, allShots])
  
  // Check if current form is complete
  const isFormComplete = 
    screenType === 'serve' 
      ? serveData.length !== null && serveData.spin !== null // Contact and direction have defaults
      : screenType === 'standard'
      ? standardData.intent !== null // Wing, quality, direction have defaults
      : screenType === 'error'
      ? errorData.intent !== null // Wing, errorType have defaults
      : true
  
  // Auto-advance when form is complete
  useEffect(() => {
    if (isFormComplete && screenType !== 'serve') {
      const timer = setTimeout(() => handleNext(), 300)
      return () => clearTimeout(timer)
    }
  }, [isFormComplete, screenType])
  
  const handleNext = () => {
    if (!currentShot) return
    
    // Save current shot's detailed data
    const updatedShots = [...allShots]
    if (screenType === 'serve') {
      updatedShots[currentShotIndex].serveDetail = { ...serveData }
    } else if (screenType === 'standard') {
      updatedShots[currentShotIndex].standardDetail = { ...standardData }
    } else if (screenType === 'error') {
      updatedShots[currentShotIndex].errorDetail = { ...errorData }
    }
    setAllShots(updatedShots)
    
    // Advance to next shot or complete
    if (currentShotIndex < allShots.length - 1) {
      setCurrentShotIndex(prev => prev + 1)
      
      // Reset form data for next shot
      setServeData({ contact: 'left', direction: 'diagonal', length: null, spin: null })
      setStandardData({ intent: null, wing: 'backhand', quality: 'average', direction: 'diagonal' })
      setErrorData({ intent: null, wing: 'backhand', errorType: 'unforced' })
    } else {
      onComplete?.()
    }
  }
  
  const handleSkip = () => {
    // Skip current shot (mark as uncertain/not visible)
    handleNext()
  }
  
  if (screenType === 'complete') {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-50 mb-2">Phase 2 Complete!</h2>
          <p className="text-neutral-400 mb-4">All shots have been tagged.</p>
          {onComplete && (
            <Button variant="primary" onClick={onComplete}>
              View Results
            </Button>
          )}
        </div>
      </div>
    )
  }
  
  // Auto-advance serve when complete
  useEffect(() => {
    if (screenType === 'serve' && isFormComplete) {
      const timer = setTimeout(() => handleNext(), 300)
      return () => clearTimeout(timer)
    }
  }, [screenType, isFormComplete])
  
  // Helper to format shot detail shorthand
  const formatShotShorthand = (shot: DetailedShot): string => {
    if (shot.serveDetail) {
      const { contact, direction, length, spin } = shot.serveDetail
      return `${contact[0].toUpperCase()}/${direction[0].toUpperCase()}/${length?.[0]?.toUpperCase() || '?'}/${spin?.[0]?.toUpperCase() || '?'}`
    }
    if (shot.standardDetail) {
      const { intent, wing, quality, direction } = shot.standardDetail
      return `${intent?.[0]?.toUpperCase() || '?'} ${wing[0].toUpperCase()} ${quality[0].toUpperCase()} ${direction[0].toUpperCase()}`
    }
    if (shot.errorDetail) {
      const { intent, wing, errorType } = shot.errorDetail
      return `${intent?.[0]?.toUpperCase() || '?'} ${wing[0].toUpperCase()} ${errorType[0].toUpperCase()}`
    }
    return ''
  }
  
  // Organize shots by rally for display
  const ralliesByPhase2 = phase1Rallies.map((rally, rallyIdx) => {
    const rallyShots = allShots.filter(shot => shot.rallyId === rally.id)
    return { rally, shots: rallyShots, rallyNumber: rallyIdx + 1 }
  })
  
  return (
    <div className={cn('h-dvh overflow-hidden flex flex-col bg-bg-surface', className)}>
      {/* Shot Log - Top */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        <div className="text-sm text-neutral-500 mb-3">Shot Log</div>
        
        {ralliesByPhase2.map(({ rally, shots, rallyNumber }) => {
          const hasCurrentShot = shots.some((_, idx) => allShots.indexOf(shots[idx]) === currentShotIndex)
          const endConditionLabel = rally.endCondition === 'let' ? 'Let' : 
            rally.endCondition === 'winner' ? 'Winner' :
            rally.endCondition === 'innet' ? 'In Net' : 'Long'
          const endConditionColor = rally.endCondition === 'winner' ? 'text-success' :
            rally.endCondition === 'let' ? 'text-warning' : 'text-danger'
          
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
                  Rally {rallyNumber} {hasCurrentShot && '(Tagging)'}
                </span>
                <span className={cn('text-xs font-medium', endConditionColor)}>
                  {endConditionLabel}
                  {rally.isServeError && ' (Serve Error)'}
                </span>
              </div>
              <div className="space-y-1">
                {shots.map((shot, idx) => {
                  const globalIdx = allShots.indexOf(shot)
                  const isCurrent = globalIdx === currentShotIndex
                  const isCompleted = globalIdx < currentShotIndex
                  const isLastShot = idx === shots.length - 1
                  const shotColor = isLastShot ? endConditionColor : (isCompleted ? 'text-neutral-400' : 'text-neutral-600')
                  const shorthand = formatShotShorthand(shot)
                  
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
                      {shorthand && <span className="text-xs text-neutral-500 ml-2">{shorthand}</span>}
                      {isCurrent && <span className="text-xs text-brand-primary font-medium ml-2">←</span>}
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
      
      {/* Progress Strip - Middle */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-4 py-2">
        <ProgressIndicatorBlock currentIndex={currentShotIndex} total={allShots.length} />
      </div>
      
      {/* Input Controls - Bottom */}
      <div className="shrink-0 px-3 py-2 bg-bg-card border-t border-neutral-700">
        <div className="w-full max-w-md mx-auto space-y-2">
          {/* Render appropriate input screen */}
          {screenType === 'serve' && (
            <ServeDetailBlock value={serveData} onChange={setServeData} />
          )}
          
          {screenType === 'standard' && (
            <div className="space-y-1.5">
              {/* Column headers */}
              <div className="flex items-center gap-2">
                <div className="w-20 shrink-0"></div>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <div className="text-xs text-neutral-500 text-center">Stroke</div>
                  <div className="text-xs text-neutral-500 text-center">Direction</div>
                  <div className="text-xs text-neutral-500 text-center">Quality</div>
                </div>
              </div>
              
              {/* Toggles row */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Toggles:</label>
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStandardData(prev => ({ ...prev, wing: prev.wing === 'backhand' ? 'forehand' : 'backhand' }))}
                    className={cn(
                      'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                      'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                      'bg-brand-primary text-white shadow-md'
                    )}
                  >
                    {standardData.wing}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStandardData(prev => ({ ...prev, direction: prev.direction === 'line' ? 'diagonal' : 'line' }))}
                    className={cn(
                      'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                      'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                      'bg-brand-primary text-white shadow-md'
                    )}
                  >
                    {standardData.direction}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStandardData(prev => ({ ...prev, quality: prev.quality === 'average' ? 'good' : 'average' }))}
                    className={cn(
                      'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                      'focus:outline-none focus:ring-2 focus:ring-success',
                      standardData.quality === 'good'
                        ? 'bg-success text-white shadow-md'
                        : 'bg-neutral-600 text-neutral-200 shadow-sm'
                    )}
                  >
                    {standardData.quality}
                  </button>
                </div>
              </div>
              
              {/* Intent row */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Intent:</label>
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {(['defensive', 'neutral', 'aggressive'] as Intent[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStandardData(prev => ({ ...prev, intent: opt }))}
                      className={cn(
                        'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                        'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                        standardData.intent === opt
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {screenType === 'error' && (
            <div className="space-y-1.5">
              {/* Column headers */}
              <div className="flex items-center gap-2">
                <div className="w-20 shrink-0"></div>
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <div className="text-xs text-neutral-500 text-center">Stroke</div>
                  <div className="text-xs text-neutral-500 text-center">Type</div>
                </div>
              </div>
              
              {/* Toggles row */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Toggles:</label>
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  {/* Wing toggle */}
                  <button
                    type="button"
                    onClick={() => setErrorData(prev => ({ ...prev, wing: prev.wing === 'backhand' ? 'forehand' : 'backhand' }))}
                    className={cn(
                      'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                      'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                      'bg-brand-primary text-white shadow-md'
                    )}
                  >
                    {errorData.wing}
                  </button>
                  {/* Error type toggle */}
                  <button
                    type="button"
                    onClick={() => setErrorData(prev => ({ ...prev, errorType: prev.errorType === 'forced' ? 'unforced' : 'forced' }))}
                    className={cn(
                      'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                      'focus:outline-none focus:ring-2 focus:ring-danger',
                      errorData.errorType === 'forced'
                        ? 'bg-danger text-white shadow-md'
                        : 'bg-danger/60 text-white shadow-sm'
                    )}
                  >
                    {errorData.errorType}
                  </button>
                </div>
              </div>
              
              {/* Intent row */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Intent:</label>
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {(['defensive', 'neutral', 'aggressive'] as Intent[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setErrorData(prev => ({ ...prev, intent: opt }))}
                      className={cn(
                        'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
                        'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                        errorData.intent === opt
                          ? 'bg-brand-primary text-white shadow-md'
                          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

