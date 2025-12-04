/**
 * EndOfRallySection — Final step after tagging all shots in a rally
 * 
 * This step allows the user to:
 * 1. Review/edit the end-of-point timestamp (← / → keys)
 * 2. Confirm or select the rally winner
 * 3. Answer forced/unforced if applicable
 * 
 * Winner derivation logic:
 * - If last shot was an error → winner is automatically the other player
 * - If last shot was a "winnerShot" quality → winner is the shot's player
 * - Otherwise → need to ask user who won (opponent error)
 */

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, Badge, Icon } from '@/ui-mine'
import { formatTime } from '@/lib/utils'
import type { PlayerId, ShotQuality, PointEndType } from '@/rules/types'

export interface EndOfRallySectionProps {
  // Rally info
  rallyIndex: number
  totalRallies: number
  
  // Players
  player1Name: string
  player2Name: string
  lastShotPlayerId: PlayerId
  lastShotQuality?: ShotQuality
  
  // End of point
  endOfPointTime: number
  
  // Derived winner (if automatically determined)
  derivedWinnerId?: PlayerId
  derivedPointEndType?: PointEndType
  
  // Whether we need to ask for winner/forced-unforced
  needsWinnerSelection: boolean
  needsForcedUnforced: boolean
  
  // Callbacks
  onEndOfPointTimeChange: (time: number) => void
  onWinnerSelect: (winnerId: PlayerId) => void
  onForcedUnforcedSelect: (type: 'forcedError' | 'unforcedError') => void
  onConfirm: () => void
  onStepFrame: (direction: 'forward' | 'backward') => void
  
  className?: string
}

export function EndOfRallySection({
  rallyIndex,
  totalRallies,
  player1Name,
  player2Name,
  lastShotPlayerId,
  lastShotQuality,
  endOfPointTime,
  derivedWinnerId,
  derivedPointEndType,
  needsWinnerSelection,
  needsForcedUnforced,
  // onEndOfPointTimeChange,  // Unused
  onWinnerSelect,
  onForcedUnforcedSelect,
  onConfirm,
  onStepFrame,
  className,
}: EndOfRallySectionProps) {
  // Local state for tracking selection phase
  const [selectedWinner, setSelectedWinner] = useState<PlayerId | null>(derivedWinnerId || null)
  const [selectedEndType, setSelectedEndType] = useState<PointEndType | null>(derivedPointEndType || null)
  
  // Update local state when props change (e.g., when derived winner is set)
  useEffect(() => {
    if (derivedWinnerId) setSelectedWinner(derivedWinnerId)
    if (derivedPointEndType) setSelectedEndType(derivedPointEndType)
  }, [derivedWinnerId, derivedPointEndType])
  
  // Define callback handlers first (so they can be used in useEffect dependencies)
  const handleWinnerSelect = useCallback((winnerId: PlayerId) => {
    setSelectedWinner(winnerId)
    onWinnerSelect(winnerId)
  }, [onWinnerSelect])
  
  const handleForcedUnforcedSelect = useCallback((type: 'forcedError' | 'unforcedError') => {
    setSelectedEndType(type)
    onForcedUnforcedSelect(type)
  }, [onForcedUnforcedSelect])
  
  // Determine if we can proceed
  const canConfirm = selectedWinner !== null && 
    (!needsForcedUnforced || selectedEndType !== null)
  
  // Keyboard shortcuts (moved after handler definitions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault()
          onStepFrame('backward')
          break
          
        case 'ArrowRight':
          e.preventDefault()
          onStepFrame('forward')
          break
          
        case 'Digit1':
        case 'Numpad1':
          e.preventDefault()
          if (needsWinnerSelection && !selectedWinner) {
            handleWinnerSelect('player1')
          }
          break
          
        case 'Digit2':
        case 'Numpad2':
          e.preventDefault()
          if (needsWinnerSelection && !selectedWinner) {
            handleWinnerSelect('player2')
          }
          break
          
        case 'KeyF':
          e.preventDefault()
          if (needsForcedUnforced && selectedWinner) {
            handleForcedUnforcedSelect('forcedError')
          }
          break
          
        case 'KeyU':
          e.preventDefault()
          if (needsForcedUnforced && selectedWinner) {
            handleForcedUnforcedSelect('unforcedError')
          }
          break
          
        case 'Enter':
        case 'Space':
          e.preventDefault()
          if (canConfirm) {
            onConfirm()
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    needsWinnerSelection,
    needsForcedUnforced,
    selectedWinner,
    canConfirm,  // Used in Enter/Space handler
    onStepFrame,
    handleWinnerSelect,  // Used in Digit1/2 handlers
    handleForcedUnforcedSelect,  // Used in KeyF/U handlers
    onConfirm,  // Used in Enter/Space handler
  ])
  
  // Get last shot outcome description
  const getLastShotDescription = () => {
    if (!lastShotQuality) return 'Unknown'
    const errorQualities = ['inNet', 'missedLong', 'missedWide']
    if (errorQualities.includes(lastShotQuality)) {
      const errorNames: Record<string, string> = {
        inNet: 'In Net',
        missedLong: 'Missed Long',
        missedWide: 'Missed Wide',
      }
      return `Error: ${errorNames[lastShotQuality]}`
    }
    const qualityNames: Record<string, string> = {
      good: 'Good',
      average: 'Average',
      weak: 'Weak',
      winnerShot: 'Winner',
    }
    return qualityNames[lastShotQuality] || lastShotQuality
  }
  
  const otherPlayerId: PlayerId = lastShotPlayerId === 'player1' ? 'player2' : 'player1'
  const otherPlayerName = otherPlayerId === 'player1' ? player1Name : player2Name
  const lastShotPlayerName = lastShotPlayerId === 'player1' ? player1Name : player2Name
  
  return (
    <div className={cn('p-4 bg-neutral-800 rounded-lg', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="warning">End of Rally</Badge>
        <span className="text-sm text-neutral-400">
          Rally {rallyIndex + 1} of {totalRallies}
        </span>
      </div>
      
      {/* End of Point Timestamp */}
      <div className="mb-4 p-3 bg-neutral-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-400">End of Point Time</span>
          <span className="font-mono text-lg text-neutral-100">
            {formatTime(endOfPointTime)}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStepFrame('backward')}
            className="text-xs"
          >
            <Icon name="chevron-left" size="sm" />
            -1 frame
          </Button>
          <span className="text-xs text-neutral-500">Use ← → to adjust</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStepFrame('forward')}
            className="text-xs"
          >
            +1 frame
            <Icon name="chevron-right" size="sm" />
          </Button>
        </div>
      </div>
      
      {/* Last Shot Summary */}
      <div className="mb-4 p-3 bg-neutral-900/50 rounded-lg">
        <p className="text-xs text-neutral-500 mb-1">Last Tagged Shot</p>
        <p className="text-sm">
          <span className="text-neutral-300">{lastShotPlayerName}</span>
          <span className="text-neutral-500"> • </span>
          <span className="text-neutral-300">{getLastShotDescription()}</span>
        </p>
      </div>
      
      {/* Winner Selection (if needed) */}
      {needsWinnerSelection && !derivedWinnerId && (
        <div className="mb-4">
          <p className="text-sm text-neutral-300 mb-3">
            Who won this rally?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={selectedWinner === 'player1' ? 'primary' : 'secondary'}
              onClick={() => handleWinnerSelect('player1')}
              className="flex-col h-auto py-3"
            >
              <span className="font-medium">{player1Name}</span>
              <kbd className="text-xs opacity-50 mt-1">1</kbd>
            </Button>
            <Button
              variant={selectedWinner === 'player2' ? 'primary' : 'secondary'}
              onClick={() => handleWinnerSelect('player2')}
              className="flex-col h-auto py-3"
            >
              <span className="font-medium">{player2Name}</span>
              <kbd className="text-xs opacity-50 mt-1">2</kbd>
            </Button>
          </div>
        </div>
      )}
      
      {/* Derived Winner Display (when auto-derived) */}
      {derivedWinnerId && !needsForcedUnforced && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="circle" size="sm" className="text-success" />
            <span className="text-sm text-success">
              Winner: {derivedWinnerId === 'player1' ? player1Name : player2Name}
            </span>
            {derivedPointEndType && (
              <Badge variant="info" className="ml-auto">
                {derivedPointEndType === 'serviceFault' && 'Service Fault'}
                {derivedPointEndType === 'receiveError' && 'Receive Error'}
                {derivedPointEndType === 'winnerShot' && 'Winner Shot'}
                {derivedPointEndType === 'forcedError' && 'Forced Error'}
                {derivedPointEndType === 'unforcedError' && 'Unforced Error'}
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {/* Forced/Unforced Selection (if needed) */}
      {needsForcedUnforced && selectedWinner && (
        <div className="mb-4">
          <p className="text-sm text-neutral-300 mb-3">
            Was {otherPlayerName}'s error forced or unforced?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={selectedEndType === 'forcedError' ? 'primary' : 'secondary'}
              onClick={() => handleForcedUnforcedSelect('forcedError')}
              className="flex-col h-auto py-3"
            >
              <span className="font-medium">Forced</span>
              <span className="text-xs text-neutral-400 mt-1">Pressure from opponent</span>
              <kbd className="text-xs opacity-50 mt-1">F</kbd>
            </Button>
            <Button
              variant={selectedEndType === 'unforcedError' ? 'primary' : 'secondary'}
              onClick={() => handleForcedUnforcedSelect('unforcedError')}
              className="flex-col h-auto py-3"
            >
              <span className="font-medium">Unforced</span>
              <span className="text-xs text-neutral-400 mt-1">Self-inflicted mistake</span>
              <kbd className="text-xs opacity-50 mt-1">U</kbd>
            </Button>
          </div>
        </div>
      )}
      
      {/* Confirm Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={onConfirm}
        disabled={!canConfirm}
        className="w-full mt-2"
      >
        {rallyIndex < totalRallies - 1 ? 'Next Rally →' : 'Complete Tagging'}
        <kbd className="text-xs opacity-50 ml-2">Enter</kbd>
      </Button>
    </div>
  )
}


