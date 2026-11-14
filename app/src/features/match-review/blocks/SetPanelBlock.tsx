/**
 * SetPanelBlock — one set: scoreline, tagging status and the next action.
 */

import { useState } from 'react'
import { Button, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { SetPanelModel } from '../models'

export interface SetPanelBlockProps {
  set: SetPanelModel
  onTag: (set: SetPanelModel) => void
  onBrowse: (set: SetPanelModel) => void
  onStartOver: (set: SetPanelModel) => void
}

const STATUS_STYLE: Record<SetPanelModel['status'], string> = {
  not_started: 'text-muted bg-bg-elevated',
  in_progress: 'text-callout-warning bg-callout-warning-bg',
  tagged: 'text-result-winner bg-result-winner-bg',
}

export function SetPanelBlock({ set, onTag, onBrowse, onStartOver }: SetPanelBlockProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="rounded-md border border-danger/60 bg-danger-muted p-2.5 space-y-1.5">
        <p className="text-xs text-primary">
          Delete {set.rallyCount} rallies in Set {set.setNumber} and start again?
        </p>
        <p className="text-[11px] text-muted">
          Fix a few via <span className="text-primary">Rallies → Edit</span> instead.
        </p>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setConfirming(false)
              onStartOver(set)
            }}
          >
            Delete and start over
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const tagLabel =
    set.status === 'not_started' ? 'Start tagging' : set.status === 'in_progress' ? 'Continue tagging' : 'Add rallies'

  return (
    <div className="rounded-md bg-bg-card px-2.5 py-2 flex flex-wrap items-center gap-2">
      <div className="flex items-baseline gap-2 min-w-[6.5rem]">
        <span className="text-sm font-semibold text-primary">Set {set.setNumber}</span>
        {set.scoreLabel && (
          <span
            className={cn(
              'font-mono text-base font-bold',
              set.heroWon === true && 'text-result-winner',
              set.heroWon === false && 'text-result-error',
              set.heroWon === null && 'text-primary'
            )}
          >
            {set.scoreLabel}
          </span>
        )}
      </div>
      <span className={cn('text-[11px] font-semibold rounded-md px-1.5 py-0.5', STATUS_STYLE[set.status])}>
        {set.statusLabel}
        {set.rallyCount > 0 && ` · ${set.rallyCount}`}
      </span>
      <div className="flex-1" />
      <div className="flex flex-wrap gap-1.5">
        {set.rallyCount > 0 && (
          <Button size="sm" variant="secondary" onClick={() => onBrowse(set)}>
            <Icon name="edit" size="sm" /> Rallies
          </Button>
        )}
        <Button size="sm" variant={set.status === 'tagged' ? 'secondary' : 'primary'} onClick={() => onTag(set)}>
          <Icon name={set.status === 'tagged' ? 'plus' : 'play'} size="sm" /> {tagLabel}
        </Button>
        {set.rallyCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title="Delete this set's tags and start again"
            aria-label={`Start Set ${set.setNumber} over`}
            className="h-8 w-8 rounded-md text-muted hover:bg-bg-elevated hover:text-danger flex items-center justify-center"
          >
            <Icon name="trash" size="sm" />
          </button>
        )}
      </div>
    </div>
  )
}
