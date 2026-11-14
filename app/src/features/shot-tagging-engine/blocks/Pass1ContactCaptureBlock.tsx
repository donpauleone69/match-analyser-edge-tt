/**
 * Pass1ContactCaptureBlock — refined contact tap pad for Pass 1 / Simple.
 *
 * Sits flush under the shot rail so contacts → End/FA reads as one surface.
 * Serve edge colour matches the set-bar Serve · player chip.
 * MA-147: less clunky pad, quieter Undo, clearer viewing-past recovery copy.
 */

import { cn } from '@/helpers/utils'
import { Button } from '@/ui-mine'

export interface Pass1ContactCaptureBlockProps {
  contactCount: number
  disabled?: boolean
  previewingPast?: boolean
  /** Current rally server — left edge on Tap serve matches set-bar Serve chip. */
  serverSide?: 'player1' | 'player2'
  onTap: () => void
  onUndo?: () => void
  className?: string
}

export function Pass1ContactCaptureBlock({
  contactCount,
  disabled = false,
  previewingPast = false,
  serverSide = 'player1',
  onTap,
  onUndo,
  className,
}: Pass1ContactCaptureBlockProps) {
  const label = previewingPast
    ? 'Viewing past'
    : contactCount === 0
      ? 'Tap serve'
      : 'Tap contact'

  const hint = previewingPast
    ? 'Return live — Live → in the set bar'
    : contactCount === 0
      ? 'Tap contacts · next: End / FA'
      : `Idle 2s → End / FA`

  return (
    <div
      className={cn(
        'flex flex-1 min-h-0 flex-col justify-start gap-1 bg-bg-card px-2 pt-1.5 pb-1.5',
        className
      )}
      data-pass1-capture="contacts"
    >
      <div className="flex items-stretch gap-1.5">
        <Button
          variant={previewingPast ? 'secondary' : 'primary'}
          onClick={onTap}
          disabled={disabled || previewingPast}
          className={cn(
            'relative flex-1 min-h-12 h-[min(9.5dvh,4.5rem)] max-h-[4.75rem]',
            'text-base font-bold rounded-[var(--control-radius)]',
            'active:scale-[0.99] touch-manipulation',
            'overflow-hidden',
            previewingPast && 'opacity-90 shadow-none'
          )}
          aria-label={
            previewingPast
              ? 'Viewing a past point — use Live in the set bar to capture'
              : contactCount === 0
                ? 'Tap serve contact'
                : `Tap contact ${contactCount + 1}`
          }
        >
          {!previewingPast && (
            <span
              className={cn(
                'absolute inset-y-0 left-0 w-1.5',
                serverSide === 'player1' ? 'bg-player-1' : 'bg-player-2'
              )}
              aria-hidden
            />
          )}
          <span className="inline-flex items-center gap-2 pl-1">
            <span>{label}</span>
            {contactCount > 0 && !previewingPast && (
              <span
                className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-bg-elevated/90 px-1.5 text-sm font-bold tabular-nums text-primary"
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
            className="tag-control shrink-0 self-stretch min-w-[4.25rem] px-3 touch-manipulation text-muted"
            title="Drop the last contact tap"
            aria-label="Undo last contact tap"
          >
            Undo
          </button>
        )}
      </div>
      <p
        className={cn(
          'shrink-0 text-center text-[10px] leading-snug px-1',
          previewingPast ? 'font-semibold text-brand' : 'text-muted'
        )}
        role="status"
        aria-live="polite"
      >
        {hint}
      </p>
    </div>
  )
}
