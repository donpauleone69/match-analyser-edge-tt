import { expect, it } from 'vitest'
import { filterMatches, hasTaggedRallies, migrateFilters, SEED, type InsightsFilters } from '../lib/app'
import { TAGGED, TODAY } from '../lib/fixed'

it('old filter reads as Dates and Event', () => {
  const migrated = migrateFilters({ matches: 'Last 3', tournament: 'League', dates: 'This week', opponent: 'All' })
  const expectF: InsightsFilters = { dates: 'Last 5 matches', from: '', to: '', opponent: 'Any', event: 'League' }
  expect(migrated.dates === expectF.dates && migrated.event === expectF.event && migrated.opponent === 'Any', JSON.stringify(migrated)).toBe(true)
})

const tagged = SEED.filter(hasTaggedRallies)

it('Opponent Pat filter', () => {
  const kept = filterMatches(tagged, { dates: 'Any', from: '', to: '', opponent: 'Pat', event: 'Any' }, TODAY)
  expect(kept.map((m) => m.id).sort()).toEqual(['m-complete', 'm-h6'])
})

it('Event League filter', () => {
  const kept = filterMatches(tagged, { dates: 'Any', from: '', to: '', opponent: 'Any', event: 'League' }, TODAY)
  expect(kept.length).toBeGreaterThan(0)
  expect(kept.every((m) => m.event === 'League')).toBe(true)
})

it('Dates Last 30 days', () => {
  const kept = filterMatches(TAGGED, { dates: 'Last 30 days', from: '', to: '', opponent: 'Any', event: 'Any' }, TODAY)
  expect(kept.length).toBeGreaterThan(0)
  for (const m of kept) {
    if (!m.date) continue
    const stamp = Date.UTC(
      Number(m.date.slice(0, 4)),
      Number(m.date.slice(5, 7)) - 1,
      Number(m.date.slice(8, 10)),
    )
    const cutoff = Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 30)
    expect(stamp >= cutoff).toBe(true)
  }
})

it('Dates From and to 2026-09-01..2026-10-31', () => {
  const kept = filterMatches(
    TAGGED,
    { dates: 'From and to', from: '2026-09-01', to: '2026-10-31', opponent: 'Any', event: 'Any' },
    TODAY,
  )
  expect(kept.every((m) => m.date >= '2026-09-01' && m.date <= '2026-10-31')).toBe(true)
})