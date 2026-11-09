import { cn } from '@/helpers/utils'
import type { ChoiceOption } from './ChoicePillRow'
import { choicePillBase, choicePillIdle, choicePillSelected } from './choiceStyles'

export interface TwoColChoiceGridProps<T extends string> {
  left: ChoiceOption<T>[]
  right: ChoiceOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
}

export function TwoColChoiceGrid<T extends string>({
  left,
  right,
  value,
  onChange,
  className,
}: TwoColChoiceGridProps<T>) {
  const renderCol = (opts: ChoiceOption<T>[]) =>
    opts.map((opt) => {
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
    })

  return (
    <div className={cn('grid grid-cols-2 gap-1.5', className)}>
      <div className="flex flex-col gap-1.5">{renderCol(left)}</div>
      <div className="flex flex-col gap-1.5">{renderCol(right)}</div>
    </div>
  )
}
