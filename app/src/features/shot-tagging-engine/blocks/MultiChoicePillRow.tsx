import { cn } from '@/helpers/utils'
import type { ChoiceOption } from './ChoicePillRow'
import { choicePillBase, choicePillIdle, choicePillSelected } from './choiceStyles'

export interface MultiChoicePillRowProps<T extends string> {
  options: ChoiceOption<T>[]
  values: T[]
  onToggle: (value: T) => void
  className?: string
}

/** Toggle pills — same sizing as ChoicePillRow; multiple can be selected. */
export function MultiChoicePillRow<T extends string>({
  options,
  values,
  onToggle,
  className,
}: MultiChoicePillRowProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((opt) => {
        const selected = values.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              choicePillBase,
              selected ? choicePillSelected : choicePillIdle
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
