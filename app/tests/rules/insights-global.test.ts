import { expect, it } from 'vitest'
import {
  filterMatches,
  hasTaggedRallies,
  insightRules,
  insightsFor,
  matchInsights,
  SEED,
  type InsightCardModel,
  type MatchRecord,
} from '../lib/app'
import { TAGGED, TODAY } from '../lib/fixed'

const tagged = SEED.filter(hasTaggedRallies)
const byId = (cards: InsightCardModel[], id: string) => cards.find((card) => card.id === id)!

function sumCounts(matches: MatchRecord[], id: string) {
  return matches.reduce(
    (sum, match) => {
      const card = byId(matchInsights(match).cards, id)
      sum.youWon += card.counts.youWon
      sum.youN += card.counts.youN
      sum.themWon += card.counts.themWon
      sum.themN += card.counts.themN
      sum.points += card.counts.points
      return sum
    },
    { youWon: 0, youN: 0, themWon: 0, themN: 0, points: 0 },
  )
}

function rowKey(label: string): string {
  if (label.includes('Ace or fault')) return 'ace'
  if (label.includes('No attack') || label.includes('No reply')) return 'none'
  if (label.includes('3rd')) return 'third'
  if (label.includes('Countered')) return 'counter'
  if (label.includes('Blocked')) return 'block'
  if (label.includes('attacked')) return 'opp'
  return label
}

function sumRows(matches: MatchRecord[], id: string) {
  const rows = new Map<string, { youN: number; themN: number }>()
  for (const match of matches) {
    for (const row of byId(matchInsights(match).cards, id).rows) {
      const key = rowKey(row.label)
      const cur = rows.get(key) ?? { youN: 0, themN: 0 }
      cur.youN += row.youN
      cur.themN += row.themN
      rows.set(key, cur)
    }
  }
  return rows
}

const patKept = filterMatches(tagged, { dates: 'Any', from: '', to: '', opponent: 'Pat', event: 'Any' }, TODAY)
const none = insightsFor(tagged, insightRules('global', '', false), tagged)
const pat = insightsFor(patKept, insightRules('global', 'Pat', true), tagged)
const leagueKept = filterMatches(tagged, { dates: 'Any', from: '', to: '', opponent: 'Any', event: 'League' }, TODAY)
const league = insightsFor(leagueKept, insightRules('global', '', true), tagged)

for (const id of ['phases', 'serve', 'receive', 'attack', 'end']) {
  it(`${id} pooled counts`, () => {
    const pooled = byId(none.cards, id).counts
    const sum = sumCounts(tagged, id)
    expect(pooled.youWon === sum.youWon && pooled.youN === sum.youN && pooled.themWon === sum.themWon && pooled.themN === sum.themN,
      `pool ${pooled.youWon}/${pooled.youN} sum ${sum.youWon}/${sum.youN}`).toBe(true)
  })
  it(`${id} pooled rows`, () => {
    const rows = sumRows(tagged, id)
    const card = byId(none.cards, id)
    const rowOk = card.rows.every((row) => {
      const got = rows.get(rowKey(row.label))
      return got !== undefined && got.youN === row.youN && got.themN === row.themN
    })
    expect(rowOk && card.rows.length === rows.size).toBe(true)
  })
}

const one = SEED.find((match) => match.id === 'm-complete')!
const oneGlobal = insightsFor([one], insightRules('global', one.opponent, true), [])
const oneMatch = matchInsights(one)
for (const id of ['phases', 'serve', 'receive', 'attack', 'end']) {
  it(`${id} one-match counts`, () => {
    const a = byId(oneGlobal.cards, id).counts
    const b = byId(oneMatch.cards, id).counts
    expect(a.youWon === b.youWon && a.youN === b.youN && a.themN === b.themN, `${a.youN} ${b.youN}`).toBe(true)
  })
}

function noPercentUnder(model: ReturnType<typeof insightsFor>, min: number) {
  return model.cards.every((card) => {
    const valueOk = !card.value?.includes('%') || card.counts.youN >= min
    const cellsOk = card.rows.every((row) => {
      const you = !row.you?.text.includes('%') || row.youN >= min
      const them = !row.them?.text.includes('%') || row.themN >= min
      return you && them
    })
    const gradeOk = card.rows.every((row) => !row.grade || row.youN >= 100)
    return valueOk && cellsOk && gradeOk
  })
}

it('no percent under 30', () => {
  expect([none, pat, league].every((model) => noPercentUnder(model, 30))).toBe(true)
})
it('no grade under 100', () => {
  expect([none, pat, league].every((model) => model.cards.every((card) => card.rows.every((row) => !row.grade || row.youN >= 100)))).toBe(true)
})

const hasUsual = (model: ReturnType<typeof insightsFor>) => model.cards.some((card) => card.compare?.includes('Usual'))
it('no Usual without a filter', () => {
  expect(!hasUsual(none)).toBe(true)
})
it('Usual needs rallies behind it', () => {
  expect(!hasUsual(insightsFor(patKept, insightRules('global', 'Pat', true), []))).toBe(true)
})
it('Usual hides when the gap is under 10', () => {
  expect(!hasUsual(insightsFor(patKept, insightRules('global', 'Pat', true), patKept))).toBe(true)
})
it('Pat Serve shows Usual', () => {
  expect((byId(pat.cards, 'serve').compare ?? '').includes('Usual')).toBe(true)
})

const complete = matchInsights(one, tagged.filter((match) => match.id !== one.id))
const alone = matchInsights(one)
const including = matchInsights(one, tagged)
it('match Usual leaves this match out', () => {
  expect((byId(complete.cards, 'receive').compare ?? '').includes('Usual')).toBe(true)
})
it('match Usual hides with nothing behind it', () => {
  expect(!alone.cards.some((card) => card.compare?.includes('Usual'))).toBe(true)
})
it('including the match changes the Receive line', () => {
  expect(byId(including.cards, 'receive').compare !== byId(complete.cards, 'receive').compare).toBe(true)
})
const small = tagged.filter((match) => match.id !== one.id).slice(0, 1)
it('match Usual hides under 100 rallies', () => {
  expect(!matchInsights(one, small).cards.some((card) => card.compare?.includes('Usual'))).toBe(true)
})

it('part tagged on the coverage line', () => {
  expect((none.coverage ?? '').includes('1 part tagged')).toBe(true)
})
it('global about names the filter', () => {
  expect(none.cards[0].about.some((line) => line.includes('Across the matches in the filter'))).toBe(true)
})
it('phases about names the grade', () => {
  expect(none.cards[0].about.some((line) => line.includes('100 of your points'))).toBe(true)
})
it('marked has no Usual line', () => {
  expect(!(none.marked?.about ?? []).some((line) => line.startsWith('Usual'))).toBe(true)
})

const playlist = byId(none.cards, 'serve').playlist
const order = playlist?.items.map((item) => item.matchId) ?? []
const rank = new Map(tagged.map((match, index) => [match.id, index]))
it('playlist is newest match first', () => {
  const grouped = order.every((id, index) => index === 0 || (rank.get(id) ?? 0) >= (rank.get(order[index - 1]) ?? 0))
  expect(grouped && order[0] === tagged[0].id, order.slice(0, 4).join(',')).toBe(true)
})