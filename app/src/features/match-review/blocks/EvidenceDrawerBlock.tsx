/**
 * EvidenceDrawerBlock — the rallies behind a number.
 *
 * Right-hand sheet on desktop, bottom sheet on mobile. Clicking another
 * number while it is open swaps the list (pivot the audit, not a new modal).
 */

import type { ReactNode } from 'react'
import { Button, Icon } from '@/ui-mine'

export interface EvidenceDrawerBlockProps {
  title: string
  subtitle?: string
  count: number
  canPlayAll: boolean
  onPlayAll: () => void
  onClose: () => void
  children: ReactNode
}

export function EvidenceDrawerBlock({
  title,
  subtitle,
  count,
  canPlayAll,
  onPlayAll,
  onClose,
  children,
}: EvidenceDrawerBlockProps) {
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="fixed z-40 bg-bg-card border-neutral-700 shadow-2xl flex flex-col
        inset-x-0 bottom-0 max-h-[70dvh] border-t rounded-t-xl
        md:inset-y-0 md:right-0 md:left-auto md:top-14 md:bottom-0 md:w-[420px] md:max-h-none md:border-t-0 md:border-l md:rounded-none"
    >
      <div className="shrink-0 flex items-start gap-3 px-4 py-3 border-b border-neutral-700">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Evidence · {count} rall{count === 1 ? 'y' : 'ies'}</p>
          <h2 className="text-base font-semibold text-neutral-50 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence"
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-50 hover:bg-neutral-700"
        >
          <Icon name="x" size="md" />
        </button>
      </div>
      {canPlayAll && (
        <div className="shrink-0 px-4 py-2 border-b border-neutral-800">
          <Button size="sm" variant="secondary" onClick={onPlayAll}>
            <Icon name="play" size="sm" /> Play all as a playlist
          </Button>
        </div>
      )}
      <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-800">{children}</ul>
    </aside>
  )
}
