import { buttonKindField } from '@/ui-mine'

const fieldClass = `${buttonKindField} w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary`

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export { fieldClass as filterFieldClass }
