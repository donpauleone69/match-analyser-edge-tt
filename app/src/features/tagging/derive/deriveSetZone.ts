import { serveBands } from '@/rules/continuity'
import type { TagSetFlow } from '../hooks/useTagSetFlow'
import type { SetZoneView } from '../models'
import { useDeriveTagScreen } from './deriveTagScreen'

type TagScreen = ReturnType<typeof useDeriveTagScreen>

export function useDeriveSetZone({ flow, screen }: { flow: TagSetFlow; screen: TagScreen }): SetZoneView {
  const { set, pickedId, stops, editPick, mode, nextServer, gap, reviewPill, pickable, onGapSlot, onEditSet } = flow
  const { serverKnown, reviewDraftNow } = screen
  return {
    rallies: set.rallies,
    picked: pickedId,
    gaps: editPick?.kind === 'gap' ? stops.gaps : null,
    pickedGap: editPick?.kind === 'gap' ? editPick.index : null,
    open:
      editPick !== null || set.finished || mode === 'setPoint'
        ? null
        : { n: set.rallies.length + 1, server: serverKnown ? nextServer : null },
    insert:
      gap && editPick?.kind === 'gap'
        ? { index: gap.index, n: gap.index + 1, server: nextServer }
        : null,
    serveBreaks: serveBands(set.rallies, set.firstServer).map((b) => b.breaks[0]),
    onGap: onGapSlot,
    onRally: reviewDraftNow ? reviewPill : undefined,
    editing: editPick !== null,
    dim: pickable.length === 0,
    onEdit: onEditSet,
  }
}
