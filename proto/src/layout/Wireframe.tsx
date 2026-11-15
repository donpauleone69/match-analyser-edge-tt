import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'

/** Label + fake value row for wireframe forms. */
export function WfField({
  label,
  value,
  placeholder,
}: {
  label: string
  value?: string
  placeholder?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div
        className={cn(
          'rounded-md border border-border bg-bg-card px-3 py-2 text-sm',
          value ? 'text-primary' : 'text-muted'
        )}
        aria-disabled="true"
      >
        {value ?? placeholder ?? '-'}
      </div>
    </label>
  )
}

/** Empty / placeholder callout. */
export function WfEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-6 text-center space-y-1">
      <p className="text-sm font-semibold text-primary">{title}</p>
      <p className="text-sm text-muted max-w-prose mx-auto">{body}</p>
    </div>
  )
}

/** Stub list row. */
export function WfRow({
  title,
  meta,
  trailing,
}: {
  title: string
  meta?: string
  trailing?: ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-card px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary truncate">{title}</p>
        {meta ? <p className="text-xs text-muted mt-0.5">{meta}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </li>
  )
}

/** Tiny “proto only” badge for fake CTAs. */
export function WfBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-pill-idle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </span>
  )
}

/** Amber mark for a mismatch that needs a look (scores or result differ). */
export function WfWarnBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      {children}
    </span>
  )
}
