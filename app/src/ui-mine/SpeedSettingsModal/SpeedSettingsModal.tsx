/**
 * SpeedSettingsModal - Configure playback speed presets
 * 
 * Allows users to customize Tag, FF, and Normal speed modes.
 * Changes persist to localStorage via videoPlaybackStore.
 */

import { useState, useEffect } from 'react'
import { Dialog } from '@/ui-mine'
import { Icon } from '@/ui-mine/Icon'
import { Button } from '@/ui-mine/Button'
import { cn } from '@/helpers/utils'
import { useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'

export interface SpeedSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

// Available speed options
const SPEED_OPTIONS = {
  tag: [0.25, 0.5, 0.75, 1.0],
  ff: [1.0, 1.5, 2.0, 3.0],
  normal: [0.5, 0.75, 1.0, 1.5],
}

// Quick presets for common configurations
const QUICK_PRESETS = [
  { name: 'Slow Motion', tag: 0.25, ff: 1.5, normal: 0.75 },
  { name: 'Standard', tag: 0.5, ff: 2.0, normal: 1.0 },
  { name: 'Fast Review', tag: 0.75, ff: 3.0, normal: 1.0 },
]

export function SpeedSettingsModal({ isOpen, onClose }: SpeedSettingsModalProps) {
  const speedPresets = useVideoPlaybackStore(state => state.speedPresets)
  const setSpeedPresets = useVideoPlaybackStore(state => state.setSpeedPresets)
  
  // Local state for editing (apply on save)
  const [localPresets, setLocalPresets] = useState(speedPresets)
  
  // Update local state when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }
  
  // Sync local state when speedPresets change (on mount or when modal opens)
  useEffect(() => {
    if (isOpen) {
      setLocalPresets(speedPresets)
    }
  }, [isOpen, speedPresets])
  
  const handleApply = () => {
    setSpeedPresets(localPresets)
    onClose()
  }
  
  const handleCancel = () => {
    setLocalPresets(speedPresets) // Reset to current
    onClose()
  }
  
  const handlePresetClick = (preset: typeof QUICK_PRESETS[0]) => {
    setLocalPresets({
      tag: preset.tag,
      ff: preset.ff,
      normal: preset.normal,
    })
  }
  
  const isPresetActive = (preset: typeof QUICK_PRESETS[0]) => {
    return (
      localPresets.tag === preset.tag &&
      localPresets.ff === preset.ff &&
      localPresets.normal === preset.normal
    )
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleCancel} />
        
      {/* Modal */}
      <div className="relative bg-neutral-800 rounded-xl p-6 w-full max-w-md shadow-lg border border-neutral-700" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-50">Playback Speed Settings</h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg hover:bg-neutral-700 transition-colors"
            aria-label="Close"
          >
            <Icon name="x" className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
          
          {/* Speed Controls */}
          <div className="space-y-5 mb-6">
            {/* Tag Speed */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Tag Speed (Slow Motion)
              </label>
              <div className="flex gap-2">
                {SPEED_OPTIONS.tag.map(speed => (
                  <button
                    key={speed}
                    onClick={() => setLocalPresets(prev => ({ ...prev, tag: speed }))}
                    className={cn(
                      'flex-1 px-3 py-2.5 rounded-lg font-mono text-sm font-medium transition-all',
                      localPresets.tag === speed
                        ? 'bg-brand-primary text-white ring-2 ring-brand-primary ring-offset-2 ring-offset-neutral-800'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    )}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
            
            {/* FF Speed */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Fast-Forward Speed
              </label>
              <div className="flex gap-2">
                {SPEED_OPTIONS.ff.map(speed => (
                  <button
                    key={speed}
                    onClick={() => setLocalPresets(prev => ({ ...prev, ff: speed }))}
                    className={cn(
                      'flex-1 px-3 py-2.5 rounded-lg font-mono text-sm font-medium transition-all',
                      localPresets.ff === speed
                        ? 'bg-brand-primary text-white ring-2 ring-brand-primary ring-offset-2 ring-offset-neutral-800'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    )}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
            
            {/* Normal Speed */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Normal Speed
              </label>
              <div className="flex gap-2">
                {SPEED_OPTIONS.normal.map(speed => (
                  <button
                    key={speed}
                    onClick={() => setLocalPresets(prev => ({ ...prev, normal: speed }))}
                    className={cn(
                      'flex-1 px-3 py-2.5 rounded-lg font-mono text-sm font-medium transition-all',
                      localPresets.normal === speed
                        ? 'bg-brand-primary text-white ring-2 ring-brand-primary ring-offset-2 ring-offset-neutral-800'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    )}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Quick Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Quick Presets
            </label>
            <div className="space-y-2">
              {QUICK_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg text-left transition-all flex items-center justify-between',
                    isPresetActive(preset)
                      ? 'bg-brand-primary/20 border-2 border-brand-primary text-neutral-50'
                      : 'bg-neutral-700 border-2 border-transparent text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs font-mono text-neutral-400">
                    {preset.tag}× / {preset.ff}× / {preset.normal}×
                  </span>
                </button>
              ))}
            </div>
          </div>
          
        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            className="px-6 py-2"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}


