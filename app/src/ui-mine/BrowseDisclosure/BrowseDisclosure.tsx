/**
 * BrowseDisclosure — History-style picker chrome for playlists / focuses.
 *
 * Closed = active context chip; open = pick another. Shared by Clips,
 * Serve/Receive, and playlist shell adopters.
 *
 * MA-118: mobile polish — pointer/touch outside dismiss, Escape, safer panel
 * height, denser touch targets on options.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from '@/ui-mine/Icon'
import { cn } from '@/helpers/utils'

export interface BrowseDisclosureProps {
  /** Quiet prefix (e.g. "Playlists"). */
  label?: ReactNode
  /** Active selection text. */
  value: ReactNode
  /** Optional count / meta to the right of value. */
  meta?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
  triggerClassName?: string
  panelClassName?: string
  /** Full-width trigger (phone Clips). */
  fullWidth?: boolean
  'aria-label'?: string
}

export function BrowseDisclosure({
  label,
  value,
  meta,
  open,
  onOpenChange,
  children,
  className,
  triggerClassName,
  panelClassName,
  fullWidth = false,
  'aria-label': ariaLabel = 'Browse',
}: BrowseDisclosureProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    // pointerdown covers mouse + touch; capture so sticky parents don't eat it.
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  return (
    <div ref={rootRef} className={cn('relative', fullWidth && 'w-full', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-bg-card px-3 py-2',
          'text-sm text-primary hover:border-border-strong transition-colors touch-manipulation',
          fullWidth && 'w-full justify-between',
          triggerClassName
        )}
      >
        <span className="min-w-0 flex items-center gap-2 truncate">
          {label != null && (
            <span className="shrink-0 text-muted font-medium">{label}</span>
          )}
          <span className="font-semibold truncate">{value}</span>
          {meta != null && (
            <span className="shrink-0 tabular-nums text-muted">{meta}</span>
          )}
        </span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size="sm"
          className="shrink-0 text-muted"
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute z-40 mt-1 min-w-full rounded-md border border-border bg-bg-elevated shadow-xl',
            'max-h-[min(50dvh,22rem)] overflow-y-auto overscroll-contain',
            // Keep the panel on-screen when the sticky shell sits near the bottom.
            'origin-top',
            fullWidth ? 'left-0 right-0' : 'min-w-[14rem]',
            panelClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export interface BrowseDisclosureOptionProps {
  selected?: boolean
  onSelect: () => void
  leading?: ReactNode
  children: ReactNode
  meta?: ReactNode
}

/** One row inside a BrowseDisclosure list panel. */
export function BrowseDisclosureOption({
  selected = false,
  onSelect,
  leading,
  children,
  meta,
}: BrowseDisclosureOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'w-full flex min-h-11 items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors touch-manipulation',
        selected
          ? 'bg-contact-selected-bg text-primary'
          : 'text-primary hover:bg-bg-card active:bg-bg-card'
      )}
    >
      {leading}
      <span className="flex-1 truncate">{children}</span>
      {meta != null && <span className="tabular-nums text-muted">{meta}</span>}
    </button>
  )
}
