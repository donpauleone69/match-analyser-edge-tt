/**
 * Pass1ContactCaptureBlock — refined contact tap pad for Pass 1 / Simple.
 *
 * Sits flush under the shot rail (not a mid-screen void) so contacts → End/FA
 * reads as one continuous tagging surface with shared chrome language.
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
      : `${contactCount} contact${contactCount === 1 ? '' : 's'} · keep tapping · idle 2s → End / FA`

  return (
    <div
      className={cn(
        'flex flex-1 min-h-0 flex-col justify-start gap-1.5 border-t border-pill-idle-border bg-bg-card px-2 pt-2 pb-2',
        className
      )}
    >
      <div className="flex items-stretch gap-1.5">
        <Button
          variant="primary"
          onClick={onTap}
          disabled={disabled || previewingPast}
          className={cn(
            'relative flex-1 min-h-14 h-[min(11dvh,5.25rem)] max-h-[5.5rem]',
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
