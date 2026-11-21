import type { WfRowProps } from './types'

/** Stub list row. */
export function WfRow({ title, meta, trailing }: WfRowProps) {
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