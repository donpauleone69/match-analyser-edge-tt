import type { CSSProperties } from 'react'
import type { Side } from '@/types/rally'

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

export function restStyle(): CSSProperties {
  return { backgroundColor: 'var(--tag-cell-rest)', borderColor: 'var(--tag-cell-rest-line)' }
}

export const railCell =
  'btn-kind-control relative w-full px-1 rounded-md border text-sm font-bold tabular-nums inline-flex items-center justify-center'

/** Player token, or that token at 15%. Open is the solid token. */
export function shotPaint(side: Side, open: boolean, fa: boolean, dim: boolean): CSSProperties {
  const token = side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'
  const fill = open ? token : `color-mix(in srgb, ${token} 15%, transparent)`
  const line = open
    ? token
    : fa
      ? 'var(--color-tag-first-attack)'
      : side === 'me'
        ? 'var(--tag-shot-line-a)'
        : 'var(--tag-shot-line-b)'
  const ink = open ? 'var(--color-tag-on-solid)' : 'var(--color-text)'
  return {
    backgroundColor: fill,
    borderColor: line,
    color: ink,
    ['--shot-fill' as string]: fill,
    ['--shot-line' as string]: line,
    ['--shot-ink' as string]: ink,
    ['--shot-fade' as string]: dim ? '0.6' : '1',
  }
}
