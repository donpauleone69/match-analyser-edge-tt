/**
 * v0.17.28 global Insights. Prints the pooled cards and checks the rules
 * that differ from a single match.
 */
import { SEED, hasTaggedRallies, type MatchRecord } from '../src/data/demoStore'
import {
  insightRules,
  insightsFor,
  matchInsights,
  type InsightCardModel,
} from '../src/features/insights/insightCounts'
import { filterMatches, migrateFilters, type InsightsFilters } from '../src/features/insights/insightsFilterContext'

const fails: string[] = []
const say = (name: string, cond: boolean, detail = '') => {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`
  console.log(line)
  if (!cond) fails.push(line)
}

const tagged = SEED.filter(hasTaggedRallies)
const byId = (cards: InsightCardModel[], id: string) => cards.find((card) => card.id === id)!

function printCards(label: string, cards: InsightCardModel[]) {
  console.log(`\n${label}`)
  for (const card of cards) {
    console.log(
      `  ${card.title}  ${card.value ?? card.empty ?? ''}  |  ${card.sub ?? ''}  |  ${card.compare ?? ''}`,
    )
  }
}

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

const none = insightsFor(tagged, insightRules('global', '', false), tagged)
const patKept = filterMatches(tagged, { dates: 'Any', from: '', to: '', opponent: 'Pat', event: 'Any' })
const pat = insightsFor(patKept, insightRules('global', 'Pat', true), tagged)
const leagueKept = filterMatches(tagged, { dates: 'Any', from: '', to: '', opponent: 'Any', event: 'League' })
const league = insightsFor(leagueKept, insightRules('global', '', true), tagged)

printCards('no filter', none.cards)
printCards('Opponent: Pat', pat.cards)
printCards('Event: League', league.cards)
console.log(`coverage  ${none.coverage}`)
console.log(`pat coverage  ${pat.coverage}`)
console.log('')

for (const id of ['phases', 'serve', 'receive', 'attack', 'end']) {
  const pooled = byId(none.cards, id).counts
  const sum = sumCounts(tagged, id)
  say(
    `${id} pooled counts`,
    pooled.youWon === sum.youWon && pooled.youN === sum.youN && pooled.themWon === sum.themWon && pooled.themN === sum.themN,
    `pool ${pooled.youWon}/${pooled.youN} sum ${sum.youWon}/${sum.youN}`,
  )
  const rows = sumRows(tagged, id)
  const card = byId(none.cards, id)
  const rowOk = card.rows.every((row) => {
    const got = rows.get(rowKey(row.label))
    return got !== undefined && got.youN === row.youN && got.themN === row.themN
  })
  say(`${id} pooled rows`, rowOk && card.rows.length === rows.size)
}

const one = SEED.find((match) => match.id === 'm-complete')!
const oneGlobal = insightsFor([one], insightRules('global', one.opponent, true), [])
const oneMatch = matchInsights(one)
for (const id of ['phases', 'serve', 'receive', 'attack', 'end']) {
  const a = byId(oneGlobal.cards, id).counts
  const b = byId(oneMatch.cards, id).counts
  say(`${id} one-match counts`, a.youWon === b.youWon && a.youN === b.youN && a.themN === b.themN, `${a.youN} ${b.youN}`)
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

say('no percent under 30', [none, pat, league].every((model) => noPercentUnder(model, 30)))
say('no grade under 100', [none, pat, league].every((model) => model.cards.every((card) => card.rows.every((row) => !row.grade || row.youN >= 100))))

const hasUsual = (model: ReturnType<typeof insightsFor>) => model.cards.some((card) => card.compare?.includes('Usual'))
say('no Usual without a filter', !hasUsual(none))
say('Usual needs rallies behind it', !hasUsual(insightsFor(patKept, insightRules('global', 'Pat', true), [])))
say('Usual hides when the gap is under 10', !hasUsual(insightsFor(patKept, insightRules('global', 'Pat', true), patKept)))
say('Pat Serve shows Usual', (byId(pat.cards, 'serve').compare ?? '').includes('Usual'), byId(pat.cards, 'serve').compare ?? '')

const complete = matchInsights(one, tagged.filter((match) => match.id !== one.id))
const alone = matchInsights(one)
const including = matchInsights(one, tagged)
say('match Usual leaves this match out', (byId(complete.cards, 'receive').compare ?? '').includes('Usual'), byId(complete.cards, 'receive').compare ?? '')
say('match Usual hides with nothing behind it', !alone.cards.some((card) => card.compare?.includes('Usual')))
say(
  'including the match changes the Receive line',
  byId(including.cards, 'receive').compare !== byId(complete.cards, 'receive').compare,
)
const small = tagged.filter((match) => match.id !== one.id).slice(0, 1)
say('match Usual hides under 100 rallies', !matchInsights(one, small).cards.some((card) => card.compare?.includes('Usual')))

say('part tagged on the coverage line', (none.coverage ?? '').includes('1 part tagged'), none.coverage ?? '')
say('global about names the filter', none.cards[0].about.some((line) => line.includes('Across the matches in the filter')))
say('phases about names the grade', none.cards[0].about.some((line) => line.includes('100 of your points')))
say('marked has no Usual line', !(none.marked?.about ?? []).some((line) => line.startsWith('Usual')))

const migrated = migrateFilters({ matches: 'Last 3', tournament: 'League', dates: 'This week', opponent: 'All' })
const expect: InsightsFilters = { dates: 'Last 5 matches', from: '', to: '', opponent: 'Any', event: 'League' }
say('old filter reads as Dates and Event', migrated.dates === expect.dates && migrated.event === expect.event && migrated.opponent === 'Any', JSON.stringify(migrated))

const playlist = byId(none.cards, 'serve').playlist
const order = playlist?.items.map((item) => item.matchId) ?? []
const rank = new Map(tagged.map((match, index) => [match.id, index]))
const grouped = order.every((id, index) => index === 0 || (rank.get(id) ?? 0) >= (rank.get(order[index - 1]) ?? 0))
say('playlist is newest match first', grouped && order[0] === tagged[0].id, order.slice(0, 4).join(','))

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nglobal insights ok')
