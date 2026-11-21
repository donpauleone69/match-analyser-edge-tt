import { Pressable, Icon, buttonKindControlSquare } from '@/ui-mine'

/** Move a video up or down. Split out so the video title can keep CardTitle. */
export function VideoMoveBlock({
  index,
  count,
  locked,
  onMove,
}: {
  index: number
  count: number
  locked: boolean
  onMove: (by: -1 | 1) => void
}) {
  return (
    <>
      {index > 0 ? (
        <Pressable
          type="button"
          className={`${buttonKindControlSquare} shrink-0 rounded-md text-primary`}
          aria-label={`Move video ${index + 1} up`}
          disabled={locked}
          onClick={() => onMove(-1)}
        >
          <Icon name="chevron-up" size="sm" />
        </Pressable>
      ) : null}
      {index < count - 1 ? (
        <Pressable
          type="button"
          className={`${buttonKindControlSquare} shrink-0 rounded-md text-primary`}
          aria-label={`Move video ${index + 1} down`}
          disabled={locked}
          onClick={() => onMove(1)}
        >
          <Icon name="chevron-down" size="sm" />
        </Pressable>
      ) : null}
    </>
  )
}
