/**
 * StatusBarSection - 5-column template for consistent status bar layout
 * 
 * STANDARD TEMPLATE (5 columns, 1 row):
 * ┌─────────────┬──────────────┬─────────┬─────────┬──────────┐
 * │  Column 1   │  Column 2    │ Column 3│ Column 4│ Column 5 │
 * │ Label   Val │ Label    Val │ Centered│ Centered│  Button  │
 * │ Label   Val │ Label    Val │  Value  │  Badge  │          │
 * └─────────────┴──────────────┴─────────┴─────────┴──────────┘
 * 
 * Column Guidelines:
 * - Column 1 & 2: Two lines with left/right justified text (justify-between)
 * - Column 3: Centered value with optional label
 * - Column 4: Centered badge/indicator (full height, colored background)
 * - Column 5: Action button (full height, always present but can be disabled)
 * 
 * Phase 1: Rally/Shots | Players/Scores | Saved | Speed | Save Set
 * Phase 2: Rally/Shot | Question | Progress | Player | [Future]
 * 
 * Uses StatusGrid with fixed height (h-12) to prevent layout shifts.
 * Optional warning banner can appear above the status bar.
 */

import { type ReactNode } from 'react'
import { StatusGrid } from '../blocks/StatusGrid'

export interface StatusBarSectionProps {
  items: ReactNode[]  // Array of status items to display in grid
  warningBanner?: ReactNode  // Optional banner above status bar
  className?: string
}

export function StatusBarSection({ 
  items, 
  warningBanner, 
  className 
}: StatusBarSectionProps) {
  return (
    <>
      {/* Optional warning banner (appears above status bar) */}
      {warningBanner}
      
      {/* Main status bar - FIXED HEIGHT with 2-row grid */}
      <div className="px-4 py-1.5 h-12">
        <StatusGrid items={items} className={className} />
      </div>
    </>
  )
}

