/**
 * SetsPanelSection — every set in the match with its status and next action.
 * Replaces the old "Select set to tag" modal on Match Review.
 */

import { Icon } from '@/ui-mine'
import { SetPanelBlock } from '../blocks/SetPanelBlock'
import type { SetPanelModel } from '../models'

export interface SetsPanelSectionProps {
  sets: SetPanelModel[]
  onTag: (set: SetPanelModel) => void
  onBrowse: (set: SetPanelModel) => void
  onStartOver: (set: SetPanelModel) => void
  onAddSet: () => void
}

export function SetsPanelSection({ sets, onTag, onBrowse, onStartOver, onAddSet }: SetsPanelSectionProps) {
  return (
    <section className="space-y-2" aria-label="Sets">
      {sets.map((set) => (
        <SetPanelBlock key={set.setId} set={set} onTag={onTag} onBrowse={onBrowse} onStartOver={onStartOver} />
      ))}
      <button
        type="button"
        onClick={onAddSet}
        className="w-full rounded-lg border border-dashed border-neutral-700 py-2 text-sm text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 inline-flex items-center justify-center gap-1.5"
      >
        <Icon name="plus" size="sm" /> Add Set {sets.length + 1}
      </button>
    </section>
  )
}
