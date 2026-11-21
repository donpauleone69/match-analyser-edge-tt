import { buttonKindField } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export function ScoreInputBlock({
  value,
  label,
  flagged,
  onChange,
}: {
  value: string
  label: string
  flagged: boolean
  onChange: (next: string) => void
}) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      className={cn(
        buttonKindField,
        'w-11 rounded-md border bg-bg-card px-1 text-center text-sm text-primary',
        flagged ? 'border-warning' : 'border-border'
      )}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
    />
  )
}
