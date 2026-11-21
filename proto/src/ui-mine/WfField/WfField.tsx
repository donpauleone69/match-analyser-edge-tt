import { cn } from '@/helpers/utils'
import type { WfFieldProps } from './types'

/** Label + fake value row for wireframe forms. */
export function WfField({ label, value, placeholder }: WfFieldProps) {
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