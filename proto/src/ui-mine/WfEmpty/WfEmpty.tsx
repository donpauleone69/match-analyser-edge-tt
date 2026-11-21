import type { WfEmptyProps } from './types'

/** Empty / placeholder callout. */
export function WfEmpty({ title, body }: WfEmptyProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-6 text-center space-y-1">
      <p className="text-sm font-semibold text-primary">{title}</p>
      {body ? <p className="text-sm text-muted max-w-prose mx-auto">{body}</p> : null}
    </div>
  )
}