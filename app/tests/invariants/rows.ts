import {
  deriveDbRows,
  deriveMatchRecords,
  deriveOutcome,
  validateDbRows,
  type DbRows,
  type MatchRecord,
} from '../lib/app'
import { serialize } from '../golden/serialize'

export type RowCtx = { matches: MatchRecord[]; rows: DbRows; now: number; today: Date }

export type RowInvariant = { id: string; text: string; check: (ctx: RowCtx) => string[] }

const at = (table: string, id: string, what: string) => `${table} ${id}: ${what}`

/** Invariants over the database rows, I-58 on. The catalog I-1 to I-57 also runs over the matches read back. */
export const ROW_INVARIANTS: RowInvariant[] = [
  {
    id: 'I-58',
    text: 'when resultMe and resultThem are set, outcome is Win if resultMe > resultThem, else Loss',
    check: ({ rows }) =>
      rows.matches.flatMap((m) => {
        if (m.resultMe === null || m.resultThem === null) return []
        const want = m.resultMe > m.resultThem ? 'Win' : 'Loss'
        return m.outcome === want ? [] : [at('matches', m.id, `outcome ${m.outcome} want ${want}`)]
      }),
  },
  {
    id: 'I-59',
    text: 'every row passes its validator, and keys, links and numbering hold across rows',
    check: ({ rows, today }) => validateDbRows(rows, today).map((e) => at(e.table, e.id, `${e.field} ${e.problem}`)),
  },
  {
    id: 'I-60',
    text: 'rows read back give the same matches, and the rows built from those are the same rows',
    check: ({ matches, rows, now }) => {
      const back = deriveMatchRecords(rows)
      const bad: string[] = []
      if (serialize(back.matches) !== serialize(matches)) bad.push('matches read back differ')
      if (serialize(deriveDbRows(back.matches, { now, removedVideos: back.removedVideos })) !== serialize(rows)) {
        bad.push('rows built again differ')
      }
      return bad
    },
  },
  {
    id: 'I-61',
    text: 'no Defence, decision 19 column or myEnd is filled, and outcome comes only from the result',
    check: ({ rows }) => {
      const bad: string[] = []
      for (const o of rows.opponents) {
        if ([o.club, o.handedness, o.style, o.birthYear, o.notes].some((v) => v !== null)) bad.push(at('opponents', o.id, 'detail filled'))
      }
      for (const e of rows.events) {
        if ([e.location, e.rankingStatus, e.importance].some((v) => v !== null)) bad.push(at('events', e.id, 'detail filled'))
      }
      for (const m of rows.matches) {
        if ([m.category, m.stage, m.round].some((v) => v !== null)) bad.push(at('matches', m.id, 'context filled'))
        if (m.outcome !== deriveOutcome(m.resultMe, m.resultThem)) bad.push(at('matches', m.id, `outcome ${m.outcome}`))
      }
      for (const v of rows.videos) if (v.myEnd !== null) bad.push(at('videos', v.id, `myEnd ${v.myEnd}`))
      for (const s of rows.shots) if (s.stroke === 'Defence') bad.push(at('shots', s.id, 'Defence'))
      return bad
    },
  },
]
