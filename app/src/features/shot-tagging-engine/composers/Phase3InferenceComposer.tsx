/**
 * Phase3InferenceComposer — Optional inference engine execution
 * 
 * Runs probabilistic shot analysis after Phase 2 tagging is complete.
 * User can skip this step and run it later from the data viewer.
 */

import { useState } from 'react'
import { cn } from '@/helpers/utils'
import { Button, Card } from '@/ui-mine'
import { rallyDb, shotDb, setDb } from '@/data'
import { runInferenceForSet } from './runInference'

export interface Phase3InferenceComposerProps {
  setId: string
  matchId: string
  player1Name: string
  player2Name: string
  onComplete?: () => void
  onSkip?: () => void
  className?: string
}

type Status = 'ready' | 'running' | 'complete' | 'error'

export function Phase3InferenceComposer({ 
  setId, 
  matchId: _matchId,
  player1Name: _player1Name,
  player2Name: _player2Name,
  onComplete, 
  onSkip,
  className 
}: Phase3InferenceComposerProps) {
  const [status, setStatus] = useState<Status>('ready')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  
  const handleRunInference = async () => {
    setStatus('running')
    setError(null)
    
    try {
      console.log('[Phase3] Starting inference...')
      setProgress('Loading rallies and shots...')
      
      const rallies = await rallyDb.getBySetId(setId)
      const shots = await shotDb.getBySetId(setId)
      
      console.log(`[Phase3] Found ${rallies.length} rallies, ${shots.length} shots`)
      setProgress(`Running inference on ${shots.length} shots...`)
      
      await runInferenceForSet(rallies, shots)
      
      console.log('[Phase3] Inference complete, updating set status...')
      setProgress('Finalizing...')
      
      await setDb.update(setId, {
        inference_complete: true,
        inference_completed_at: new Date().toISOString(),
      })
      
      console.log('[Phase3] ✓ Inference complete')
      setStatus('complete')
      
      // Auto-advance after 1 second
      setTimeout(() => {
        onComplete?.()
      }, 1000)
      
    } catch (err) {
      console.error('[Phase3] ✗ Inference failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }
  
  const handleSkip = () => {
    console.log('[Phase3] User skipped inference')
    onSkip?.()
  }
  
  return (
    <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
      <Card className="p-8 max-w-lg text-center">
        {status === 'ready' && (
          <>
            <div className="text-5xl mb-4">🧠</div>
            <h2 className="text-3xl font-bold text-neutral-50 mb-2">Run Shot Analysis?</h2>
            <p className="text-neutral-400 mb-6">
              The inference engine will analyze your tagged shots to predict:<br />
              <span className="text-sm text-neutral-500 mt-2 block">
                Shot types • Spin • Player position • Pressure levels • Special patterns
              </span>
            </p>
            <p className="text-sm text-neutral-500 mb-6">
              You can skip this step and run it later from the data viewer.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleSkip}>
                Skip for Now
              </Button>
              <Button variant="primary" onClick={handleRunInference}>
                Run Analysis
              </Button>
            </div>
          </>
        )}
        
        {status === 'running' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
            <h2 className="text-2xl font-bold text-neutral-50 mb-2">Analyzing Shots...</h2>
            <p className="text-neutral-400">{progress}</p>
          </>
        )}
        
        {status === 'complete' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-neutral-50 mb-2">Analysis Complete!</h2>
            <p className="text-neutral-400 mb-6">
              Shot predictions and insights are now available.
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-3xl font-bold text-neutral-50 mb-2">Analysis Failed</h2>
            <p className="text-danger mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleSkip}>
                Skip
              </Button>
              <Button variant="primary" onClick={handleRunInference}>
                Retry
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

