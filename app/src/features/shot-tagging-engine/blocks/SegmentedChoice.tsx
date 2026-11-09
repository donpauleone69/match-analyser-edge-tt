import type { ChoiceOption } from './ChoicePillRow'
import { ChoicePillRow } from './ChoicePillRow'

/**
 * Short option sets — same text-sized pills as ChoicePillRow (no stretch).
 */
export interface SegmentedChoiceProps<T extends string> {
  options: ChoiceOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
}

export function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedChoiceProps<T>) {
  return (
    <ChoicePillRow
      options={options}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}
