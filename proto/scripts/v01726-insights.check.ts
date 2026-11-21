/**
 * v0.17.26 Match Insights counts.
 * Run: npm run check:v01726
 */
import { SEED, emptySet, type MatchRecord } from '../src/data/demoStore'
import { gradeOf, matchInsights, phaseOf, type InsightCardModel, type InsightRow } from '../src/features/insights/insightCounts'
import type { Ending, Side } from '../src/features/tagging/rally'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`PASS  ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL  ${name} ${detail}`.trim())
  }
}

const BANNED = /clip|reel|—|–|→|➔/i

function stringsOf(card: InsightCardModel): string[] {
  const out = [card.title, card.value, card.sub, card.compare, card.empty, card.playlist?.name, ...card.about]
  for (const col of card.columns ?? []) out.push(col)
  for (const row of card.rows) {
    out.push(row.label, row.single?.main, row.single?.detail, row.you?.text, row.you?.of, row.them?.text, row.them?.of, row.grade)
  }
  for (const item of card.playlist?.items ?? []) out.push(item.note)
  return out.filter((s): s is string => Boolean(s))
}

function rowSums(card: InsightCardModel, side: 'you' | 'them') {
  return card.rows.reduce((sum, row) => sum + (side === 'you' ? row.youN : row.themN), 0)
}

function noThinPercent(row: InsightRow, side: 'you' | 'them'): boolean {
  const n = side === 'you' ? row.youN : row.themN
  if (n >= 5) return true
  const bits = side === 'you' ? [row.you?.text, row.single?.detail] : [row.them?.text]
  return bits.every((bit) => !bit || !bit.includes('%'))
}

function checkCard(card: InsightCardModel) {
  for (const row of card.rows) {
    ok(`${card.id} row ${row.label} no thin percent`, noThinPercent(row, 'you') && noThinPercent(row, 'them'))
    ok(`${card.id} grade ${row.label} needs 20`, !row.grade || row.youN >= 20, `n=${row.youN} ${row.grade}`)
  }
  for (const text of stringsOf(card)) {
    ok(`${card.id} copy`, !BANNED.test(text), text)
  }
  if (card.playlist) {
    ok(`${card.id} playlist has items`, card.playlist.items.length > 0)
  }
}

const final = SEED.find((m) => m.id === 'm-complete')!
const club = SEED.find((m) => m.id === 'm-partial')!
const ready = SEED.find((m) => m.id === 'm-ready')!

function report(label: string, match: MatchRecord) {
  const model = matchInsights(match)
  console.log(`\n${label}  coverage=${model.coverage ?? ''}  empty=${model.empty}`)
  for (const card of model.cards) {
    console.log(
      `  ${card.title}: ${card.value ?? card.empty} | ${card.sub ?? ''} | ${card.compare ?? ''} | rows ${card.rows.length} | list ${card.playlist?.items.length ?? 0}`,
    )
  }
  return model
}

const league = report('League final', final)
const night = report('Club night', club)
const bare = matchInsights(ready)

ok('league has five cards', league.cards.map((c) => c.id).join(',') === 'phases,serve,receive,attack,end')
ok('club has five cards', night.cards.map((c) => c.id).join(',') === 'phases,serve,receive,attack,end')
ok('league coverage', league.coverage === 'Sets 1 to 3', league.coverage ?? '')
ok('club coverage', (night.coverage ?? '').includes('part of set 2'), night.coverage ?? '')
ok('nothing tagged', bare.empty && bare.cards.length === 0)

const byId = (cards: InsightCardModel[], id: string) => cards.find((c) => c.id === id)!

for (const model of [league, night]) {
  for (const card of model.cards) checkCard(card)
  const phases = byId(model.cards, 'phases')
  const serve = byId(model.cards, 'serve')
  const receive = byId(model.cards, 'receive')
  const attack = byId(model.cards, 'attack')
  const end = byId(model.cards, 'end')
  ok('phases cover your points', rowSums(phases, 'you') === phases.counts.youN, `${rowSums(phases, 'you')} ${phases.counts.youN}`)
  ok('phases cover their points', rowSums(phases, 'them') === phases.counts.themN)
  ok('phases three rows', phases.rows.length === 3)
  if (!serve.empty) ok('serve rows sum', rowSums(serve, 'you') === serve.counts.youN)
  if (!receive.empty) ok('receive rows sum', rowSums(receive, 'you') === receive.counts.youN)
  if (!attack.empty) {
    ok('attack your rows sum', rowSums(attack, 'you') === attack.counts.youN)
    ok('attack their rows sum', rowSums(attack, 'them') === attack.counts.themN)
  }
  if (!end.empty) {
    ok('end your rows sum', rowSums(end, 'you') === end.counts.youN)
    ok('end their rows sum', rowSums(end, 'them') === end.counts.themN)
    ok('end value is a count', end.value === String(end.counts.youN), end.value ?? '')
  }
  ok(
    'serve wins plus their wins on your serve',
    serve.counts.youWon + receive.counts.themWon === serve.counts.youN,
    `${serve.counts.youWon}+${receive.counts.themWon} vs ${serve.counts.youN}`,
  )
  ok(
    'receive wins plus their wins on their serve',
    receive.counts.youWon + serve.counts.themWon === receive.counts.youN,
    `${receive.counts.youWon}+${serve.counts.themWon} vs ${receive.counts.youN}`,
  )
}

ok('phases names Zhang', league.cards[0].about.some((line) => line.includes('Zhang 2004')))
ok('serve names Djokic', byId(league.cards, 'serve').about.some((line) => line.includes('Djokic 2020')))
ok('receive names Djokic', byId(league.cards, 'receive').about.some((line) => line.includes('Djokic 2020')))
ok('attack names Fuchs', byId(league.cards, 'attack').about.some((line) => line.includes('Fuchs and Lames 2021')))
ok(
  'attack names the blocked serve',
  byId(league.cards, 'attack').about.some((line) => line.includes('blocked fast serve')),
)

const removed: MatchRecord = { ...final, videos: [] }
const gone = matchInsights(removed)
ok('removed video keeps numbers', !gone.empty && gone.cards[0].value !== null)
ok('removed video line', (gone.videoLine ?? '').includes('video was removed'), gone.videoLine ?? '')
ok(
  'removed video hides play',
  gone.cards.every((card) => card.playlist === null),
)

const cases: [string, Side, number, Ending, Side, 'serve' | 'receive' | 'rally'][] = [
  ['your ace, you', 'me', 1, 'Winner', 'me', 'serve'],
  ['your ace, them', 'me', 1, 'Winner', 'them', 'receive'],
  ['your fault, you', 'me', 1, 'Net', 'me', 'serve'],
  ['your fault, them', 'me', 1, 'Net', 'them', 'receive'],
  ['they miss your 3rd, you', 'me', 4, 'Wide', 'me', 'serve'],
  ['they miss your 3rd, them', 'me', 4, 'Wide', 'them', 'receive'],
  ['their 4th beats you, you', 'me', 4, 'Winner', 'me', 'serve'],
  ['their 4th beats you, them', 'me', 4, 'Winner', 'them', 'receive'],
  ['your 5th wins, you', 'me', 5, 'Winner', 'me', 'serve'],
  ['your 5th wins, them', 'me', 5, 'Winner', 'them', 'rally'],
  ['their 5th beats you, you', 'them', 5, 'Winner', 'me', 'rally'],
  ['their 5th beats you, them', 'them', 5, 'Winner', 'them', 'serve'],
]
for (const [name, server, n, ending, player, phase] of cases) {
  ok(`phase ${name}`, phaseOf(server, n, ending, player) === phase, String(phaseOf(server, n, ending, player)))
}
ok('lucky counts as a winner', phaseOf('me', 1, 'Lucky', 'me') === 'serve' && phaseOf('me', 1, 'Lucky', 'them') === 'receive')
// 13 of 21 is 61.9, which rounds to 62. Serve Good starts at 62.
ok('grade uses the shown percent', gradeOf('serve', 13, 21) === 'Good', String(gradeOf('serve', 13, 21)))
ok('grade under the shown percent stays Pass', gradeOf('serve', 12, 21) === 'Pass', String(gradeOf('serve', 12, 21)))

const onlyMine: MatchRecord = {
  id: 'only-mine',
  opponent: 'Pat',
  event: '',
  date: '',
  result: { me: null, them: null },
  videos: [],
  sets: [
    {
      ...emptySet(1),
      finished: true,
      rallies: [
        {
          id: 'a',
          videoId: 'v',
          server: 'me',
          contacts: [1, 2, 3, 4],
          start: 0,
          end: 4,
          ending: 'Net',
          fa: 2,
          shots: [{}, { stroke: 'Attack' }, { stroke: 'Control' }, { stroke: 'Control', wing: 'FH' }],
          winner: 'them',
        },
      ],
    },
  ],
  tagDone: false,
}
const solo = matchInsights(onlyMine)
const soloServe = solo.cards.find((c) => c.id === 'serve')!
const soloReceive = solo.cards.find((c) => c.id === 'receive')!
const soloAttack = solo.cards.find((c) => c.id === 'attack')!
ok('elite when they have no serves', soloServe.compare === 'Pat none yet · Elite 51%', soloServe.compare ?? '')
ok('receive empty has no elite line', soloReceive.compare === null)
ok('elite when you have not attacked first', soloAttack.compare === 'Pat none yet · Elite 48%', soloAttack.compare ?? '')
const zeroCell = solo.cards.find((c) => c.id === 'phases')!.rows.find((row) => row.youN === 0)
ok('empty rate cell is a dash', zeroCell?.you?.text === '-', zeroCell?.you?.text ?? '')

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nAll insights checks passed')
