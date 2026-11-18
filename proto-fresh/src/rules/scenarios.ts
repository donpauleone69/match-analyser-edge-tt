import { blankDraft, type Contact, type Draft, type Side } from './rally.ts'

export type Scenario = {
  key: string
  name: string
  one: boolean
  server: Side
  no: number
  score: [number, number]
  /** True contact times, which the stand-in video plays. */
  truth: number[]
  /** What the tagger tapped. */
  taps: number[]
  line: string
  walk: string[]
}

const T0 = 1.2
const GAP = 0.85
const times = (n: number) => Array.from({ length: n }, (_, i) => +(T0 + i * GAP).toFixed(2))

function withTaps(truth: number[], edit: (t: number[]) => number[]) {
  return edit([...truth]).sort((a, b) => a - b)
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'ten',
    name: '10 shots',
    one: false,
    server: 'me',
    no: 13,
    score: [6, 6],
    truth: times(10),
    taps: times(10),
    line: 'Controls on 2 to 4. You open on 5. Kim loops 8, you counter 9, Kim counters 10 for the winner.',
    walk: [
      'End: Winner, Point to Kim. Shot 10: FH Attack.',
      'Serve: Short. Shots 2, 3 and 4: Control.',
      'Shot 8 page: Who attacked first? You. Shot 8: FH Attack.',
      'Shot 9: BH Counter. It saves and plays on.',
    ],
  },
  {
    key: 'seven',
    name: '7 shots',
    one: false,
    server: 'me',
    no: 13,
    score: [6, 6],
    truth: times(7),
    taps: times(7),
    line: 'Three pushes, then you open on 5, Kim counters 6, you win with a FH counter on 7.',
    walk: ['End: Winner, Point to You. Shot 7: FH Counter.', 'Serve: Short. Shots 2, 3, 4: Control.', 'Shot 5: FH Attack. Shot 6: BH Counter. It saves.'],
  },
  {
    key: 'endtap',
    name: 'Extra end tap',
    one: false,
    server: 'me',
    no: 14,
    score: [7, 6],
    truth: times(5),
    taps: withTaps(times(5), (t) => [...t, t[4] + 0.3]),
    line: 'Your FH winner on shot 5 was tapped twice: 6 taps for 5 shots.',
    walk: ['End: Winner, Point to You.', 'The line says shot 6, the winner, is Kim’s.', 'Delete last. It agrees. Shot 5: FH Attack.'],
  },
  {
    key: 'toss',
    name: 'Toss tapped',
    one: false,
    server: 'them',
    no: 17,
    score: [8, 8],
    truth: times(5),
    taps: withTaps(times(5), (t) => [t[0] - 0.9, ...t]),
    line: "Kim's toss was tapped as contact 1. Kim wins with a FH winner on 5.",
    walk: ['End: Winner, Point to Kim.', 'Delete first. It agrees.', 'Or Delete last, then on Serve: Delete first instead.'],
  },
  {
    key: 'double',
    name: 'Double tap',
    one: false,
    server: 'them',
    no: 12,
    score: [6, 5],
    truth: times(9),
    taps: withTaps(times(9), (t) => [...t, t[5] + 0.18]),
    line: 'Shot 6 was tapped twice: 10 taps for 9 shots. Kim wins with a FH winner on 9.',
    walk: ['End: Winner, Point to Kim.', 'Check, then the minus on 7. It agrees.', 'Shot 9, Serve, 2, 3, 4, then 7 and 8.'],
  },
  {
    key: 'missed',
    name: 'Missed contact',
    one: false,
    server: 'me',
    no: 21,
    score: [9, 9],
    truth: times(4),
    taps: withTaps(times(4), (t) => t.filter((_, i) => i !== 2)),
    line: 'Shot 3 was not tapped: 3 taps for 4 shots. Kim wins with a BH winner.',
    walk: ['End: Winner, Point to Kim.', 'More, Add missed, then tap as shot 3 is played.', 'Shot 4: BH Attack. Serve, 2, 3.'],
  },
  {
    key: 'nobody',
    name: 'Nobody first',
    one: false,
    server: 'me',
    no: 15,
    score: [7, 7],
    truth: times(10),
    taps: times(10),
    line: "A long push rally. You attack 9 at last and Kim's block on 10 goes long.",
    walk: ['End: Long, Point to You. Shot 10: BH Control.', 'Serve, 2, 3, 4: Control.', 'Shot 8 page: Nobody. Shot 8: Control.', 'Shot 9: FH Attack. First attack 9.'],
  },
  {
    key: 'ace',
    name: 'Ace',
    one: false,
    server: 'me',
    no: 6,
    score: [3, 2],
    truth: times(1),
    taps: times(1),
    line: 'You serve an ace.',
    walk: ['End: Winner. Point to You. It saves.'],
  },
  {
    key: 'third',
    name: 'Third ball',
    one: false,
    server: 'them',
    no: 9,
    score: [4, 4],
    truth: times(3),
    taps: times(3),
    line: 'Kim serves short, you push FH, Kim wins with a FH attack.',
    walk: ['End: Winner, Point to Kim. Shot 3: FH Attack.', 'Serve: Short.', 'Shot 2: FH Control. It saves.'],
  },
  {
    key: 'one',
    name: 'Rally one',
    one: true,
    server: 'them',
    no: 1,
    score: [0, 0],
    truth: times(3),
    taps: times(3),
    line: 'First rally of a set. Kim serves and wins with a FH third ball.',
    walk: ['End: Winner, Point to Kim. Kim becomes the server.', 'Shot 3: FH Attack. Serve: Long. Shot 2: BH Control.'],
  },
  {
    key: 'receive',
    name: 'Receive attack',
    one: false,
    server: 'them',
    no: 20,
    score: [10, 8],
    truth: times(8),
    taps: times(8),
    line: "You flick Kim's serve, Kim counters, then Kim attacks 7 and your block on 8 goes long.",
    walk: ['End: Long, Point to Kim. Shot 8: BH Control.', 'Serve: Short. Shot 2: BH Attack. Shot 3: FH Counter.', 'Shots 4, 6, 7, then mark Rally on the saved row.'],
  },
]

export function draftOf(sc: Scenario, set: number): Draft {
  const contacts: Contact[] = sc.taps.map((t, i) => ({ id: i + 1, t }))
  return blankDraft({ set, no: sc.no, one: sc.one, server: sc.server, contacts, score: sc.score })
}
