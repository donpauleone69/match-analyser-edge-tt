/**
 * EvidenceDrawerBlock — the rallies behind a number.
 *
 * Right-hand sheet on desktop, bottom sheet on mobile. Clicking another
 * number while it is open swaps the list (pivot the audit, not a new modal).
 * MA-122: optional playlist sync hint under the header.
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
  /** Quiet line under the header (e.g. Serve/Receive playlist sync) */
  playlistHint?: string | null
}

export function EvidenceDrawerBlock({
  title,
  subtitle,
  count,
  canPlayAll,
  onPlayAll,
  onClose,
  children,
  playlistHint = null,
}: EvidenceDrawerBlockProps) {
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="fixed z-40 bg-bg-card border-border shadow-xl flex flex-col
        inset-x-0 bottom-0 max-h-[70dvh] border-t rounded-t-xl
        md:inset-y-0 md:right-0 md:left-auto md:top-14 md:bottom-0 md:w-[420px] md:max-h-none md:border-t-0 md:border-l md:rounded-none"
    >
      <div className="shrink-0 space-y-1 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-primary truncate">
              {title}
              <span className="ml-1.5 font-normal text-muted tabular-nums">· {count}</span>
            </h2>
            {subtitle ? <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p> : null}
          </div>
          {canPlayAll && (
            <Button size="sm" variant="secondary" onClick={onPlayAll}>
              <Icon name="film" size="sm" /> Clips
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence"
            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-bg-elevated"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
        {playlistHint ? (
          <p className="text-[10px] leading-tight text-muted truncate" title={playlistHint}>
            {playlistHint}
          </p>
        ) : null}
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">{children}</ul>
    </aside>
  )
}
