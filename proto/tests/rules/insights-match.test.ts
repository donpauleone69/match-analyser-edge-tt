import { expect, it } from 'vitest'
import { emptySet, gradeOf, matchInsights, phaseOf, SEED, type Ending, type InsightCardModel, type InsightRow, type MatchRecord, type Side } from '../lib/app'

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

function registerCardChecks(card: InsightCardModel) {
  for (const row of card.rows) {
    it(`${card.id} row ${row.label} no thin percent`, () => {
      expect(noThinPercent(row, 'you') && noThinPercent(row, 'them')).toBe(true)
    })
    it(`${card.id} grade ${row.label} needs 20`, () => {
      expect(!row.grade || row.youN >= 20, `n=${row.youN} ${row.grade}`).toBe(true)
    })
  }
  for (const text of stringsOf(card)) {
    it(`${card.id} copy`, () => {
      expect(BANNED.test(text), text).toBe(false)
    })
  }
  if (card.playlist) {
    it(`${card.id} playlist has items`, () => {
      expect(card.playlist!.items.length > 0).toBe(true)
    })
  }
}

const final = SEED.find((m) => m.id === 'm-complete')!
const club = SEED.find((m) => m.id === 'm-partial')!
const ready = SEED.find((m) => m.id === 'm-ready')!
const league = matchInsights(final)
const night = matchInsights(club)
const bare = matchInsights(ready)
const byId = (cards: InsightCardModel[], id: string) => cards.find((c) => c.id === id)!

it('league has five cards', () => {
  expect(league.cards.map((c) => c.id).join(',')).toBe('phases,serve,receive,attack,end')
})
it('club has five cards', () => {
  expect(night.cards.map((c) => c.id).join(',')).toBe('phases,serve,receive,attack,end')
})
it('league coverage', () => {
  expect(league.coverage).toBe('Sets 1 to 5')
})
it('club coverage', () => {
  expect((night.coverage ?? '').includes('part of set 2')).toBe(true)
})
it('nothing tagged', () => {
  expect(bare.empty && bare.cards.length === 0).toBe(true)
})

for (const model of [league, night]) {
  for (const card of model.cards) registerCardChecks(card)
  const phases = byId(model.cards, 'phases')
  const serve = byId(model.cards, 'serve')
  const receive = byId(model.cards, 'receive')
  const attack = byId(model.cards, 'attack')
  const end = byId(model.cards, 'end')
  it(`${model === league ? 'league' : 'club'} phases cover your points`, () => {
    expect(rowSums(phases, 'you') === phases.counts.youN, `${rowSums(phases, 'you')} ${phases.counts.youN}`).toBe(true)
  })
  it(`${model === league ? 'league' : 'club'} phases cover their points`, () => {
    expect(rowSums(phases, 'them') === phases.counts.themN).toBe(true)
  })
  it(`${model === league ? 'league' : 'club'} phases three rows`, () => {
    expect(phases.rows.length).toBe(3)
  })
  if (!serve.empty) {
    it(`${model === league ? 'league' : 'club'} serve rows sum`, () => {
      expect(rowSums(serve, 'you') === serve.counts.youN).toBe(true)
    })
  }
  if (!receive.empty) {
    it(`${model === league ? 'league' : 'club'} receive rows sum`, () => {
      expect(rowSums(receive, 'you') === receive.counts.youN).toBe(true)
    })
  }
  if (!attack.empty) {
    it(`${model === league ? 'league' : 'club'} attack your rows sum`, () => {
      expect(rowSums(attack, 'you') === attack.counts.youN).toBe(true)
    })
    it(`${model === league ? 'league' : 'club'} attack their rows sum`, () => {
      expect(rowSums(attack, 'them') === attack.counts.themN).toBe(true)
    })
  }
  if (!end.empty) {
    it(`${model === league ? 'league' : 'club'} end your rows sum`, () => {
      expect(rowSums(end, 'you') === end.counts.youN).toBe(true)
    })
    it(`${model === league ? 'league' : 'club'} end their rows sum`, () => {
      expect(rowSums(end, 'them') === end.counts.themN).toBe(true)
    })
    it(`${model === league ? 'league' : 'club'} end value is a count`, () => {
      expect(end.value === String(end.counts.youN), end.value ?? '').toBe(true)
    })
  }
  it(`${model === league ? 'league' : 'club'} serve wins plus their wins on your serve`, () => {
    expect(
      serve.counts.youWon + receive.counts.themWon === serve.counts.youN,
      `${serve.counts.youWon}+${receive.counts.themWon} vs ${serve.counts.youN}`,
    ).toBe(true)
  })
  it(`${model === league ? 'league' : 'club'} receive wins plus their wins on their serve`, () => {
    expect(
      receive.counts.youWon + serve.counts.themWon === receive.counts.youN,
      `${receive.counts.youWon}+${serve.counts.themWon} vs ${receive.counts.youN}`,
    ).toBe(true)
  })
}

it('phases names Zhang', () => {
  expect(league.cards[0].about.some((line) => line.includes('Zhang 2004'))).toBe(true)
})
it('serve names Djokic', () => {
  expect(byId(league.cards, 'serve').about.some((line) => line.includes('Djokic 2020'))).toBe(true)
})
it('receive names Djokic', () => {
  expect(byId(league.cards, 'receive').about.some((line) => line.includes('Djokic 2020'))).toBe(true)
})
it('attack names Fuchs', () => {
  expect(byId(league.cards, 'attack').about.some((line) => line.includes('Fuchs and Lames 2021'))).toBe(true)
})
it('attack names the blocked serve', () => {
  expect(byId(league.cards, 'attack').about.some((line) => line.includes('blocked fast serve'))).toBe(true)
})

const removed: MatchRecord = { ...final, videos: [] }
const gone = matchInsights(removed)
it('removed video keeps numbers', () => {
  expect(!gone.empty && gone.cards[0].value !== null).toBe(true)
})
it('removed video line', () => {
  expect((gone.videoLine ?? '').includes('video was removed')).toBe(true)
})
it('removed video hides play', () => {
  expect(gone.cards.every((card) => card.playlist === null)).toBe(true)
})

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
  it(`phase ${name}`, () => {
    expect(phaseOf(server, n, ending, player)).toBe(phase)
  })
}

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
it('elite when they have no serves', () => {
  expect(soloServe.compare).toBe('Pat none yet · Elite 51%')
})
it('receive empty has no elite line', () => {
  expect(soloReceive.compare).toBeNull()
})
it('elite when you have not attacked first', () => {
  expect(soloAttack.compare).toBe('Pat none yet · Elite 48%')
})
const zeroCell = solo.cards.find((c) => c.id === 'phases')!.rows.find((row) => row.youN === 0)
it('empty rate cell is a dash', () => {
  expect(zeroCell?.you?.text).toBe('-')
})
it('grade uses the shown percent', () => {
  expect(gradeOf('serve', 13, 21)).toBe('Good')
})
it('grade under the shown percent stays Pass', () => {
  expect(gradeOf('serve', 12, 21)).toBe('Pass')
})