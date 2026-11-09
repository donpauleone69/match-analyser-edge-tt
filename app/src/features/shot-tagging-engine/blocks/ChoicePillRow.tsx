import { cn } from '@/helpers/utils'
import { choicePillBase, choicePillIdle, choicePillSelected } from './choiceStyles'

export interface ChoiceOption<T extends string> {
  value: T
  label: string
}

export interface ChoicePillRowProps<T extends string> {
  options: ChoiceOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
}

export function ChoicePillRow<T extends string>({
  options,
  value,
  onChange,
  className,
}: ChoicePillRowProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
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
