/**
 * ShotQualityToggleBlock — Toggle button for shot quality
 * 
 * A single button that alternates between two visual states:
 * - Average Quality (default): silver table with meh face
 * - High Quality: gold table with flame icon
 * 
 * Does not auto-advance. User must select stroke type to proceed.
 */

import { AverageQualityButton, HighQualityButton } from '@/ui-mine'

export type ShotQuality = 'average' | 'high'

export interface ShotQualityToggleBlockProps {
  value: ShotQuality
  onChange: (value: ShotQuality) => void
  className?: string
}

export function ShotQualityToggleBlock({ value, onChange, className }: ShotQualityToggleBlockProps) {
  const handleToggle = () => {
    onChange(value === 'average' ? 'high' : 'average')
  }
  
  // Return button directly without wrapper div to align with ButtonGrid
  return value === 'average' ? (
    <AverageQualityButton onClick={handleToggle} className={className} />
  ) : (
    <HighQualityButton onClick={handleToggle} className={className} />
  )
}

