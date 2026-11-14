/**
 * BrowseDisclosure — History-style picker chrome for playlists / focuses.
 *
 * Closed = active context chip; open = pick another. Shared by Clips,
 * Serve/Receive, and Track C playlist shell adopters.
 */

import { useEffect, useRef, type ReactNode } from 'react'
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

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onOpenChange])

  return (
    <div ref={rootRef} className={cn('relative', fullWidth && 'w-full', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-bg-card px-3 py-1.5',
          'text-sm text-neutral-100 hover:border-neutral-500 transition-colors',
          fullWidth && 'w-full justify-between py-2.5',
          triggerClassName
        )}
      >
        <span className="min-w-0 flex items-center gap-2 truncate">
          {label != null && (
            <span className="shrink-0 text-neutral-500 font-medium">{label}</span>
          )}
          <span className="font-semibold truncate">{value}</span>
          {meta != null && (
            <span className="shrink-0 tabular-nums text-neutral-500">{meta}</span>
          )}
        </span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size="sm"
          className="shrink-0 text-neutral-400"
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-30 mt-1 min-w-full rounded-lg border border-neutral-700 bg-bg-elevated shadow-xl',
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
        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
        selected ? 'bg-neutral-800 text-neutral-50' : 'text-neutral-200 hover:bg-neutral-800/70'
      )}
    >
      {leading}
      <span className="flex-1 truncate">{children}</span>
      {meta != null && <span className="tabular-nums text-neutral-500">{meta}</span>}
    </button>
  )
}
