/**
 * TaggingUIPrototypeComposer — Two-phase tagging UI prototype
 * 
 * Phase 1: Timestamp capture (serve/shot buttons + rally end conditions)
 * Phase 2: Detailed shot tagging (auto-advancing through all shots)
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Phase1TimestampComposer, type Phase1Rally } from './Phase1TimestampComposer'
import { Phase2DetailComposer } from './Phase2DetailComposer'
import { Button } from '@/ui-mine'

export interface TaggingUIPrototypeComposerProps {
  className?: string
}

type Phase = 'phase1' | 'phase2' | 'complete'

export function TaggingUIPrototypeComposer({ className }: TaggingUIPrototypeComposerProps) {
  const [phase, setPhase] = useState<Phase>('phase1')
  const [phase1Rallies, setPhase1Rallies] = useState<Phase1Rally[]>([])
  
  const handleCompletePhase1 = (rallies: Phase1Rally[]) => {
    setPhase1Rallies(rallies)
    setPhase('phase2')
  }
  
  const handleCompletePhase2 = () => {
    setPhase('complete')
  }
  
  const handleRestart = () => {
    setPhase('phase1')
    setPhase1Rallies([])
  }
  
  if (phase === 'complete') {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-neutral-50">Tagging Complete!</h2>
          <p className="text-neutral-400">
            All shots have been timestamped and tagged.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="secondary" onClick={handleRestart}>
              Start New Match
            </Button>
            <Button variant="primary" onClick={() => console.log('Export data:', phase1Rallies)}>
              Export Data
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  if (phase === 'phase2') {
    return (
      <Phase2DetailComposer
        phase1Rallies={phase1Rallies}
        onComplete={handleCompletePhase2}
        className={className}
      />
    )
  }
  
  return (
    <Phase1TimestampComposer
      onCompletePhase1={handleCompletePhase1}
      className={className}
    />
  )
}
