/**
 * Pass1LeaveDraftChoiceBlock — mid-rally Leave: Keep draft vs Discard.
 * Soft-exits either way; Stay / Escape / scrim cancel remain on Pass 1.
 * MA-138: clearer hierarchy, Escape, scrim dismiss, denser copy.
 */

import { useEffect, useRef } from 'react'
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
  const keepRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    keepRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-modal-scrim p-3 sm:items-center sm:p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass1-leave-draft-title"
        aria-describedby="pass1-leave-draft-desc"
        className={cn(
          'w-full max-w-sm rounded-xl border border-border bg-bg-card p-4 shadow-xl sm:rounded-lg',
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="pass1-leave-draft-title"
          className="text-base font-semibold text-primary"
        >
          Leave tagging?
        </h2>
        <p id="pass1-leave-draft-desc" className="mt-1.5 text-sm text-muted">
          Soft exit — does not finish the set. Keep the open point as a draft to
          resume, or discard it.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            ref={keepRef}
            variant="primary"
            onClick={onKeepDraft}
            className="!h-11 !w-full"
            aria-label="Keep draft and leave"
          >
            Keep draft
          </Button>
          <p className="-mt-0.5 px-0.5 text-[11px] leading-snug text-muted">
            Resume this point later with contacts and tags intact.
          </p>
          <Button
            variant="secondary"
            onClick={onDiscard}
            className="!h-11 !w-full text-danger border-danger/40 hover:bg-danger/10"
            aria-label="Discard draft and leave"
          >
            Discard point
          </Button>
          <p className="-mt-0.5 px-0.5 text-[11px] leading-snug text-muted">
            Clear the open rally draft, then leave.
          </p>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="!h-10 !w-full !text-muted"
            aria-label="Stay tagging"
          >
            Stay
          </Button>
        </div>
      </div>
    </div>
  )
}
