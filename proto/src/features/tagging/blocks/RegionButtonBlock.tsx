import { cn } from '@/helpers/utils'
import type { AreaRegion } from '../models'

export function RegionButtonBlock({ region, short }: { region: AreaRegion; short: boolean }) {
  return (
    <button
      type="button"
      {...region.data}
      data-guard={region.dim ? '' : undefined}
      aria-pressed={region.pressed ? true : undefined}
      aria-label={region.label}
      onClick={() => {
        if (region.dim) return
        region.onClick()
      }}
      className={cn(
        'pad-region flex w-full touch-manipulation select-none items-center justify-center rounded-md px-2 text-center text-[22px] font-bold leading-tight active:brightness-90',
        short ? 'input-short h-full' : 'h-full min-h-0 w-full',
        region.dim && 'opacity-60',
      )}
      style={{
        backgroundColor: region.bg,
        color: region.fg,
        boxShadow: region.pressed
          ? 'inset 0 0 0 4px #fff'
          : region.outline
            ? 'inset 0 0 0 1px var(--color-border)'
            : undefined,
      }}
    >
      {region.label}
    </button>
  )
}
