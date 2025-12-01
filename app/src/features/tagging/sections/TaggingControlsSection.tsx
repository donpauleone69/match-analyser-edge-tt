/**
 * TaggingControlsSection — Main tagging controls for Part 1
 * 
 * Contains CONTACT button, rally end buttons, and undo.
 */

import { cn } from '@/lib/utils'
import { Button, Icon, SpeedControls } from '@/ui-mine'
import { ContactButtonBlock } from '../blocks/ContactButtonBlock'
import type { TaggingControlsVM, VideoControlsVM } from '../models'

export interface TaggingControlsSectionProps {
  controls: TaggingControlsVM
  videoControls: VideoControlsVM
  onContact: () => void
  onEndRallyScore: () => void
  onEndRallyNoScore: () => void
  onUndo: () => void
  onEndOfSet: () => void
  onSpeedChange: (speed: number) => void
  className?: string
}

export function TaggingControlsSection({
  controls,
  videoControls,
  onContact,
  onEndRallyScore,
  onEndRallyNoScore,
  onUndo,
  onEndOfSet,
  onSpeedChange,
  className,
}: TaggingControlsSectionProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Speed Controls */}
      <div className="flex items-center justify-center">
        <SpeedControls
          value={videoControls.playbackSpeed}
          onChange={onSpeedChange}
        />
      </div>
      
      {/* Main Contact Button */}
      <div className="flex justify-center">
        <ContactButtonBlock
          onClick={onContact}
          disabled={!controls.canAddContact}
          contactCount={controls.currentRallyContactCount}
        />
      </div>
      
      {/* Rally End Buttons */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="success"
          size="lg"
          onClick={onEndRallyScore}
          disabled={!controls.canEndRally}
          shortcut="Enter"
        >
          <Icon name="check" size="md" />
          End Rally (Score)
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          onClick={onEndRallyNoScore}
          disabled={!controls.canEndRally}
          shortcut="L"
        >
          Let / No Score
        </Button>
      </div>
      
      {/* Secondary Actions */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!controls.canUndo}
          shortcut="⌫"
        >
          <Icon name="rotate-ccw" size="sm" />
          Undo
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onEndOfSet}
          shortcut="S"
        >
          <Icon name="circle-dot" size="sm" />
          End of Set
        </Button>
      </div>
    </div>
  )
}

