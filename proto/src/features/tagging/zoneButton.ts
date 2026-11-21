import type { CSSProperties } from 'react'

/** The star's box. Set Zone and Rally Zone share it. */
export const zoneButton =
  'h-8 shrink-0 whitespace-nowrap rounded-md border px-2 text-xs font-semibold inline-flex items-center justify-center'

/** Amber, so a pressed zone button is not the same fill as a shot. */
export function zonePressed(): CSSProperties {
  return { backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)', color: '#0b1220' }
}

export function zoneRest(): CSSProperties {
  return {
    backgroundColor: 'var(--tag-cell-rest)',
    borderColor: 'var(--tag-cell-rest-line)',
    color: 'var(--color-text)',
  }
}
