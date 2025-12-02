/**
 * Part2SpeedControlsSection — Loop speed and preview buffer controls for Part 2
 * 
 * Provides controls for:
 * - Loop playback speed (0.25x, 0.5x, 0.75x, 1x)
 * - Preview buffer time (how much time after contact to include in loop)
 */

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'

const LOOP_SPEEDS = [0.25, 0.5, 0.75, 1]
const BUFFER_OPTIONS = [0.1, 0.2, 0.3, 0.4, 0.5]

export interface Part2SpeedControlsSectionProps {
  loopSpeed: number
  previewBuffer: number
  onLoopSpeedChange: (speed: number) => void
  onPreviewBufferChange: (buffer: number) => void
  className?: string
}

export function Part2SpeedControlsSection({
  loopSpeed,
  previewBuffer,
  onLoopSpeedChange,
  onPreviewBufferChange,
  className,
}: Part2SpeedControlsSectionProps) {
  return (
    <Card className={cn('p-3', className)}>
      <CardHeader className="pb-2 px-0 pt-0">
        <CardTitle className="text-sm">Preview Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {/* Loop Speed */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Loop Speed
          </label>
          <div className="flex gap-1">
            {LOOP_SPEEDS.map(speed => (
              <button
                key={speed}
                onClick={() => onLoopSpeedChange(speed)}
                className={cn(
                  'flex-1 py-1.5 rounded text-xs font-mono transition-colors',
                  loopSpeed === speed
                    ? 'bg-brand-primary text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
        
        {/* Preview Buffer */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Preview Buffer: +{previewBuffer.toFixed(1)}s
          </label>
          <div className="flex gap-1">
            {BUFFER_OPTIONS.map(buffer => (
              <button
                key={buffer}
                onClick={() => onPreviewBufferChange(buffer)}
                className={cn(
                  'flex-1 py-1.5 rounded text-xs font-mono transition-colors',
                  previewBuffer === buffer
                    ? 'bg-brand-primary text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                )}
              >
                {buffer.toFixed(1)}s
              </button>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Time after contact to include in preview loop
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

