import { Pressable } from '@/ui-mine'
import { SetPillsBlock } from '../blocks/SetPillsBlock'
import type { SetZoneView } from '../models'
import { zoneButton, zonePressed, zoneRest } from '../styles'

/**
 * The Set Zone. One row: the pills, then Edit Set in the star's box.
 * The set number is not repeated here.
 */
export function SetZoneSection({
  rallies,
  picked,
  gaps,
  pickedGap,
  open,
  insert,
  serveBreaks,
  onGap,
  onRally,
  editing,
  dim,
  onEdit,
}: SetZoneView) {
  return (
    <div className="tag-setzone" data-set-zone>
      <SetPillsBlock
        rallies={rallies}
        picked={picked}
        gaps={gaps}
        pickedGap={pickedGap}
        open={open}
        insert={insert}
        serveBreaks={serveBreaks}
        onGap={onGap}
        onRally={onRally}
      />
      <Pressable
        type="button"
        data-edit-set
        data-edit-dim={dim ? '' : undefined}
        aria-pressed={editing}
        className={zoneButton}
        style={editing ? zonePressed() : { ...zoneRest(), opacity: dim ? 0.45 : 1 }}
        onClick={onEdit}
      >
        Edit Set
      </Pressable>
    </div>
  )
}

