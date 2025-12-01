/**
 * ShotQuestionSection — Inline shot tagging questions
 * 
 * Multi-step question flow based on tagging mode:
 * 
 * Essential Mode - Serve:
 * 1. Serve Type (7 options, keys 1-7)
 * 2. Spin Grid (3x3, numpad 1-9)
 * 3. Landing Zone (3x3, numpad 1-9) - SKIP if error quality
 * 4. Quality (6 options, G/A/W/N/L/D)
 * 
 * Essential Mode - Rally Shot:
 * 1. Wing (F/B)
 * 2. Shot Type (9 options, keys 1-9)
 * 3. Landing Zone (3x3) - SKIP if error quality
 * 4. Quality (6 options)
 * 
 * On Quality selection:
 * - If error (N/L/D) → trigger derivation + auto-prune check
 * - If last shot → derive end-of-point
 * - Auto-advance to next shot
 */

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Icon } from '@/ui-mine'
import { SpinGrid, LandingZoneGrid } from '@/ui-mine'
import type { 
  ServeType, 
  ServeSpin, 
  ShotQuality,
  EssentialShotType,
} from '@/rules/types'

// Question step types
type ServeQuestionStep = 'type' | 'spin' | 'landing' | 'quality'
type RallyShotQuestionStep = 'wing' | 'type' | 'landing' | 'quality'

export interface ShotQuestionSectionProps {
  isServe: boolean
  isReturn: boolean
  shotIndex: number
  currentStep: number
  onServeTypeSelect: (type: ServeType) => void
  onSpinSelect: (spin: ServeSpin) => void
  onLandingZoneSelect: (zone: number) => void
  onQualitySelect: (quality: ShotQuality) => void
  onWingSelect: (wing: 'forehand' | 'backhand') => void
  onShotTypeSelect: (type: EssentialShotType) => void
  className?: string
}

// Serve types for Essential mode
const SERVE_TYPES: { value: ServeType; label: string; key: string }[] = [
  { value: 'pendulum', label: 'Pendulum', key: '1' },
  { value: 'reversePendulum', label: 'Reverse Pendulum', key: '2' },
  { value: 'tomahawk', label: 'Tomahawk', key: '3' },
  { value: 'backhand', label: 'Backhand', key: '4' },
  { value: 'hook', label: 'Hook', key: '5' },
  { value: 'lollipop', label: 'Lollipop', key: '6' },
  { value: 'other', label: 'Other', key: '7' },
]

// Shot types for Essential mode (9 types)
const ESSENTIAL_SHOT_TYPES: { value: EssentialShotType; label: string; key: string }[] = [
  { value: 'push', label: 'Push', key: '1' },
  { value: 'chop', label: 'Chop', key: '2' },
  { value: 'block', label: 'Block', key: '3' },
  { value: 'lob', label: 'Lob', key: '4' },
  { value: 'drive', label: 'Drive', key: '5' },
  { value: 'flick', label: 'Flick', key: '6' },
  { value: 'loop', label: 'Loop', key: '7' },
  { value: 'smash', label: 'Smash', key: '8' },
  { value: 'other', label: 'Other', key: '9' },
]

// Quality options
const QUALITY_OPTIONS: { value: ShotQuality; label: string; key: string; color: string }[] = [
  { value: 'good', label: 'Good', key: 'G', color: 'bg-success/20 text-success border-success' },
  { value: 'average', label: 'Average', key: 'A', color: 'bg-neutral-600 text-neutral-200 border-neutral-500' },
  { value: 'weak', label: 'Weak', key: 'W', color: 'bg-warning/20 text-warning border-warning' },
  { value: 'inNet', label: 'In Net', key: 'N', color: 'bg-danger/20 text-danger border-danger' },
  { value: 'missedLong', label: 'Long', key: 'L', color: 'bg-danger/20 text-danger border-danger' },
  { value: 'missedWide', label: 'Wide', key: 'D', color: 'bg-danger/20 text-danger border-danger' },
]

export function ShotQuestionSection({
  isServe,
  isReturn,
  shotIndex,
  currentStep,
  onServeTypeSelect,
  onSpinSelect,
  onLandingZoneSelect,
  onQualitySelect,
  onWingSelect,
  onShotTypeSelect,
  className,
}: ShotQuestionSectionProps) {
  // Determine current question based on shot type and step
  const getServeStepLabel = (step: number): ServeQuestionStep => {
    const steps: ServeQuestionStep[] = ['type', 'spin', 'landing', 'quality']
    return steps[step - 1] || 'type'
  }
  
  const getRallyShotStepLabel = (step: number): RallyShotQuestionStep => {
    const steps: RallyShotQuestionStep[] = ['wing', 'type', 'landing', 'quality']
    return steps[step - 1] || 'wing'
  }
  
  const currentQuestion = isServe 
    ? getServeStepLabel(currentStep)
    : getRallyShotStepLabel(currentStep)
  
  const totalSteps = 4
  const progressPercent = (currentStep / totalSteps) * 100
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Quality shortcuts (always available)
      const qualityKey = e.key.toUpperCase()
      const qualityOption = QUALITY_OPTIONS.find(q => q.key === qualityKey)
      if (qualityOption && (currentQuestion === 'quality' || (!isServe && currentStep === 4))) {
        e.preventDefault()
        onQualitySelect(qualityOption.value)
        return
      }
      
      // Wing shortcuts (F/B)
      if (!isServe && currentQuestion === 'wing') {
        if (e.key.toUpperCase() === 'F') {
          e.preventDefault()
          onWingSelect('forehand')
        } else if (e.key.toUpperCase() === 'B') {
          e.preventDefault()
          onWingSelect('backhand')
        }
        return
      }
      
      // Number key shortcuts for types
      const numKey = parseInt(e.key)
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        e.preventDefault()
        
        if (isServe && currentQuestion === 'type') {
          const serveType = SERVE_TYPES[numKey - 1]
          if (serveType) onServeTypeSelect(serveType.value)
        } else if (!isServe && currentQuestion === 'type') {
          const shotType = ESSENTIAL_SHOT_TYPES[numKey - 1]
          if (shotType) onShotTypeSelect(shotType.value)
        } else if (currentQuestion === 'spin') {
          // Spin grid uses numpad 1-9
          onSpinSelect(getSpinFromNumpad(numKey))
        } else if (currentQuestion === 'landing') {
          // Landing zone uses numpad 1-9
          onLandingZoneSelect(numKey)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, currentStep, isServe, onServeTypeSelect, onSpinSelect, onLandingZoneSelect, onQualitySelect, onWingSelect, onShotTypeSelect])
  
  // Map numpad to spin values (matches SERVE_SPIN_NUMPAD in rules/types.ts)
  const getSpinFromNumpad = (num: number): ServeSpin => {
    const spinMap: Record<number, ServeSpin> = {
      7: 'topLeft', 8: 'topspin', 9: 'topRight',
      4: 'sideLeft', 5: 'noSpin', 6: 'sideRight',
      1: 'backLeft', 2: 'backspin', 3: 'backRight',
    }
    return spinMap[num] || 'noSpin'
  }
  
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant={isServe ? 'brand' : isReturn ? 'info' : 'default'}>
              {isServe ? 'Serve' : isReturn ? 'Return' : `Shot ${shotIndex}`}
            </Badge>
            <span className="text-sm font-normal text-neutral-400">
              Step {currentStep} of {totalSteps}
            </span>
          </CardTitle>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-neutral-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Serve Type Question */}
        {isServe && currentQuestion === 'type' && (
          <div>
            <p className="text-sm text-neutral-300 mb-3">What type of serve?</p>
            <div className="grid grid-cols-4 gap-2">
              {SERVE_TYPES.map(type => (
                <Button
                  key={type.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => onServeTypeSelect(type.value)}
                  className="flex-col h-auto py-2"
                >
                  <span className="text-xs">{type.label}</span>
                  <kbd className="text-[10px] opacity-50 mt-1">{type.key}</kbd>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Spin Grid Question */}
        {isServe && currentQuestion === 'spin' && (
          <div>
            <p className="text-sm text-neutral-300 mb-3">What spin? (Numpad 1-9)</p>
            <SpinGrid
              value={undefined}
              onChange={(spin) => onSpinSelect(spin)}
            />
          </div>
        )}
        
        {/* Wing Question (Rally shots only) */}
        {!isServe && currentQuestion === 'wing' && (
          <div>
            <p className="text-sm text-neutral-300 mb-3">Forehand or Backhand?</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onWingSelect('forehand')}
                className="flex-1 flex-col h-auto py-4"
              >
                <Icon name="arrow-right" size="lg" className="mb-1" />
                <span>Forehand</span>
                <kbd className="text-xs opacity-50 mt-1">F</kbd>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onWingSelect('backhand')}
                className="flex-1 flex-col h-auto py-4"
              >
                <Icon name="arrow-left" size="lg" className="mb-1" />
                <span>Backhand</span>
                <kbd className="text-xs opacity-50 mt-1">B</kbd>
              </Button>
            </div>
          </div>
        )}
        
        {/* Shot Type Question (Rally shots only) */}
        {!isServe && currentQuestion === 'type' && (
          <div>
            <p className="text-sm text-neutral-300 mb-3">What type of shot?</p>
            <div className="grid grid-cols-3 gap-2">
              {ESSENTIAL_SHOT_TYPES.map(type => (
                <Button
                  key={type.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => onShotTypeSelect(type.value)}
                  className="flex-col h-auto py-2"
                >
                  <span className="text-xs">{type.label}</span>
                  <kbd className="text-[10px] opacity-50 mt-1">{type.key}</kbd>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Landing Zone Question */}
        {currentQuestion === 'landing' && (
          <div>
            <p className="text-sm text-neutral-300 mb-3">Where did it land? (Numpad 1-9)</p>
            <LandingZoneGrid
              value={undefined}
              onChange={(zone) => {
                // Map LandingZone to number for the callback
                const zoneMap: Record<string, number> = {
                  'BHShort': 7, 'MidShort': 8, 'FHShort': 9,
                  'BHMid': 4, 'MidMid': 5, 'FHMid': 6,
                  'BHLong': 1, 'MidLong': 2, 'FHLong': 3,
                }
                onLandingZoneSelect(zoneMap[zone] || 5)
              }}
            />
          </div>
        )}
        
        {/* Quality Question */}
        {currentQuestion === 'quality' && (
          <div>
            <p className="text-sm text-neutral-300 mb-3">Shot quality?</p>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => onQualitySelect(option.value)}
                  className={cn('flex-col h-auto py-3 border', option.color)}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <kbd className="text-xs opacity-70 mt-1">{option.key}</kbd>
                </Button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2 text-center">
              Error types (N/L/D) will end the rally
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

