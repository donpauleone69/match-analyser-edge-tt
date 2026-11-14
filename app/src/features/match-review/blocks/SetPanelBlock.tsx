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
  not_started: 'text-neutral-500 bg-bg-surface border-border',
  in_progress: 'text-callout-warning bg-callout-warning-bg border-callout-warning-border',
  tagged: 'text-result-winner bg-result-winner-bg border-result-winner/40',
}

export function SetPanelBlock({ set, onTag, onBrowse, onStartOver }: SetPanelBlockProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="rounded-lg border border-danger/60 bg-danger-muted p-3 space-y-2">
        <p className="text-sm text-neutral-200">
          Delete all {set.rallyCount} tagged rallies in Set {set.setNumber} and start again?
        </p>
        <p className="text-xs text-neutral-400">
          To fix a few rallies, use <span className="text-neutral-200">Rallies → Edit</span> instead — it keeps everything else.
        </p>
        <div className="flex gap-2">
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
    <div className="rounded-lg border border-border bg-bg-card p-3 flex flex-wrap items-center gap-2.5">
      <div className="flex items-baseline gap-2 min-w-[7rem]">
        <span className="text-sm font-semibold text-neutral-200">Set {set.setNumber}</span>
        {set.scoreLabel && (
          <span
            className={cn(
              'font-mono text-lg font-bold',
              set.heroWon === true && 'text-result-winner',
              set.heroWon === false && 'text-result-error',
              set.heroWon === null && 'text-neutral-100'
            )}
          >
            {set.scoreLabel}
          </span>
        )}
      </div>
      <span className={cn('text-[11px] font-semibold rounded-md border px-1.5 py-0.5', STATUS_STYLE[set.status])}>
        {set.statusLabel}
        {set.rallyCount > 0 && ` · ${set.rallyCount}`}
      </span>
      <div className="flex-1" />
      <div className="flex flex-wrap gap-2">
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
            className="h-9 w-9 rounded-md border border-border text-neutral-500 hover:text-danger hover:border-danger flex items-center justify-center"
          >
            <Icon name="trash" size="sm" />
          </button>
        )}
      </div>
    </div>
  )
}
