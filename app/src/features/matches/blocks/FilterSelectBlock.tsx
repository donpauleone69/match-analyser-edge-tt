import { buttonKindField } from '@/ui-mine'

const fieldClass = `${buttonKindField} w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary`

type FilterOption = { value: string; label: string }

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function textOptions(values: readonly string[]): FilterOption[] {
  return values.map((value) => ({ value, label: value }))
}

export { fieldClass as filterFieldClass }
