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
  not_started: 'text-neutral-400 bg-neutral-800 border-neutral-700',
  in_progress: 'text-amber-300 bg-amber-950/40 border-amber-800/60',
  tagged: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/60',
}

export function SetPanelBlock({ set, onTag, onBrowse, onStartOver }: SetPanelBlockProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="rounded-lg border border-rose-800/60 bg-rose-950/20 p-3 space-y-2">
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
    <div className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-baseline gap-2 min-w-[7rem]">
        <span className="text-sm font-semibold text-neutral-200">Set {set.setNumber}</span>
        {set.scoreLabel && (
          <span
            className={cn(
              'font-mono text-lg font-bold',
              set.heroWon === true && 'text-emerald-400',
              set.heroWon === false && 'text-rose-400',
              set.heroWon === null && 'text-neutral-100'
            )}
          >
            {set.scoreLabel}
          </span>
        )}
      </div>
      <span className={cn('text-[11px] font-semibold rounded-full border px-2 py-0.5', STATUS_STYLE[set.status])}>
        {set.statusLabel}
        {set.rallyCount > 0 && ` · ${set.rallyCount} rallies`}
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
            className="h-9 w-9 rounded-md border border-neutral-700 text-neutral-500 hover:text-rose-300 hover:border-rose-800 flex items-center justify-center"
          >
            <Icon name="trash" size="sm" />
          </button>
        )}
      </div>
    </div>
  )
}
