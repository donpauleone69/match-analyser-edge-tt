import { Pressable, Icon, buttonKindControlSquare } from '@/ui-mine'

export function FilterButtonBlock({
  n,
  open,
  onClick,
}: {
  n: number
  open: boolean
  onClick: () => void
}) {
  return (
    <Pressable
      type="button"
      data-filter-surface
      data-filter-count={n}
      aria-label="Filter"
      aria-expanded={open}
      onClick={onClick}
      className={`${buttonKindControlSquare} relative inline-flex shrink-0 items-center justify-center text-primary hover:bg-pill-idle`}
    >
      <Icon name="filter" size="sm" />
      {n > 0 ? (
        <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-0.5 text-[9px] font-bold leading-none text-[#0b1220]">
          {n}
        </span>
      ) : null}
    </Pressable>
  )
}
