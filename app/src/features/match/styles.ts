import { buttonKindField } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted'
export const inputClass = cn(
  buttonKindField,
  'w-full rounded-md border border-border bg-bg-card px-3 text-sm text-primary'
)
export const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary'
export const flagRowClass = cn(flagClass, 'flex flex-wrap items-center justify-between gap-2')
export const noteRowClass =
  'rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'
