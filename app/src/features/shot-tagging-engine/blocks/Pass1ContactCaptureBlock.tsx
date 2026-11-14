/**
 * Pass1ContactCaptureBlock — refined contact tap pad for Pass 1 / Simple.
 *
 * Large enough for thumb capture, but no longer a full-viewport void.
 * Speaks the same tag-control language as the set bar and form chrome so
 * contacts → End/FA feels continuous with the rest of tagging.
 */

import { cn } from '@/helpers/utils'
import { Button } from '@/ui-mine'

export interface Pass1ContactCaptureBlockProps {
  contactCount: number
  disabled?: boolean
  previewingPast?: boolean
  onTap: () => void
  onUndo?: () => void
  className?: string
}

export function Pass1ContactCaptureBlock({
  contactCount,
  disabled = false,
  previewingPast = false,
  onTap,
  onUndo,
  className,
}: Pass1ContactCaptureBlockProps) {
  const label = previewingPast
    ? 'Live → to capture'
    : contactCount === 0
      ? 'Tap serve'
      : 'Tap contact'

  const hint = previewingPast
    ? 'Viewing a past point · Live → in the set bar to capture'
    : contactCount === 0
      ? 'First tap = serve · then each bat contact · idle 2s → End / FA'
      : `${contactCount} contact${contactCount === 1 ? '' : 's'} · idle 2s → End / FA tags`

  return (
    <div
      className={cn(
        'flex flex-1 min-h-0 flex-col justify-center gap-2 px-2 pb-2 pt-1',
        className
      )}
    >
      <div className="flex items-stretch gap-1.5">
        <Button
          variant="primary"
          onClick={onTap}
          disabled={disabled || previewingPast}
          className={cn(
            'relative flex-1 min-h-14 h-[min(12dvh,5.75rem)] max-h-24',
            'text-lg font-bold rounded-[var(--control-radius)]',
            'active:scale-[0.99] touch-manipulation shadow-sm'
          )}
          aria-label={
            previewingPast
              ? 'Return to live to capture contacts'
              : contactCount === 0
                ? 'Tap serve contact'
                : `Tap contact ${contactCount + 1}`
          }
        >
          <span className="inline-flex items-center gap-2">
            <span>{label}</span>
            {contactCount > 0 && !previewingPast && (
              <span
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-black/20 px-1.5 text-sm font-bold tabular-nums"
                aria-hidden
              >
                {contactCount}
              </span>
            )}
          </span>
        </Button>
        {contactCount > 0 && !previewingPast && onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="tag-control shrink-0 self-stretch min-w-[4.5rem] px-3 touch-manipulation"
            title="Drop the last contact tap"
            aria-label="Undo last contact tap"
          >
            Undo
          </button>
        )}
      </div>
      <p className="shrink-0 text-center text-[11px] text-muted leading-snug px-1">
        {hint}
      </p>
    </div>
  )
}
