/**
 * Pass1LeaveDraftChoiceBlock — mid-rally Leave: Keep draft vs Discard.
 * Soft-exits either way; Cancel stays on Pass 1.
 */

import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export interface Pass1LeaveDraftChoiceBlockProps {
  open: boolean
  onKeepDraft: () => void
  onDiscard: () => void
  onCancel: () => void
  className?: string
}

export function Pass1LeaveDraftChoiceBlock({
  open,
  onKeepDraft,
  onDiscard,
  onCancel,
  className,
}: Pass1LeaveDraftChoiceBlockProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass1-leave-draft-title"
      aria-describedby="pass1-leave-draft-desc"
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-lg border border-border bg-bg-card p-4 shadow-lg',
          className
        )}
      >
        <h2
          id="pass1-leave-draft-title"
          className="text-base font-semibold text-neutral-50"
        >
          Leave tagging?
        </h2>
        <p id="pass1-leave-draft-desc" className="mt-1.5 text-sm text-neutral-500">
          Soft exit — keep the open point as a draft, or discard it.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="primary"
            onClick={onKeepDraft}
            className="!h-11 !w-full"
            aria-label="Keep draft and leave"
          >
            Keep draft
          </Button>
          <Button
            variant="secondary"
            onClick={onDiscard}
            className="!h-11 !w-full"
            aria-label="Discard draft and leave"
          >
            Discard
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="!h-11 !w-full"
            aria-label="Stay tagging"
          >
            Stay
          </Button>
        </div>
      </div>
    </div>
  )
}
