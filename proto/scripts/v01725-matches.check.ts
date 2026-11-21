/**
 * v0.17.25 Matches row name, line and status.
 * Run: npm run check:v01725
 */
import { emptySet } from '../src/data/demoStore'
import type { MatchRecord, SetData, VideoAsset } from '../src/types/match'
import {
  formatMatchDate,
  matchName,
  matchResultLine,
  matchRowLine,
  matchRowStatus,
  taggedResultReady,
} from '../src/features/match/matchChecks'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`PASS  ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL  ${name} ${detail}`.trim())
  }
}

function video(id: string, archived = false): VideoAsset {
  return { id, fileName: `${id}.mp4`, sizeMb: 1, archived, kind: 'demo', durationS: 600 }
}

function won(setId: number): SetData {
  return {
    ...emptySet(setId),
    finished: true,
    rallies: Array.from({ length: 11 }, () => ({ winner: 'me' }) as SetData['rallies'][number]),
  }
}

function open(setId: number): SetData {
  return {
    ...emptySet(setId),
    rallies: [{ winner: 'me' } as SetData['rallies'][number]],
  }
}

function match(over: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: 'm',
    opponent: '',
    event: '',
    date: '',
    result: { me: null, them: null },
    videos: [],
    sets: [emptySet(1)],
    tagDone: false,
    ...over,
  }
}

const today = new Date(2026, 10, 20)

ok('date this year', formatMatchDate('2026-11-11', today) === '11 Nov')
ok('date another year', formatMatchDate('2025-10-04', today) === '4 Oct 2025')
ok('no date', formatMatchDate('', today) === '')
ok('won', matchResultLine(match({ result: { me: 3, them: 1 } })) === 'Won 3 - 1')
ok('lost', matchResultLine(match({ result: { me: 1, them: 3 } })) === 'Lost 1 - 3')
ok('level', matchResultLine(match({ result: { me: 2, them: 2 } })) === '2 - 2')
ok('no result line', matchResultLine(match()) === '')

const named = match({
  opponent: 'Sam',
  event: 'Club night',
  date: '2026-11-11',
  result: { me: 3, them: 1 },
})
ok('name is the opponent', matchName(named) === 'vs Sam')
ok('event is last', matchRowLine(named) === '11 Nov · Won 3 - 1 · Club night', matchRowLine(named))
ok('event is the name', matchName(match({ event: 'Club night' })) === 'Club night')
ok('event stays off line 2', matchRowLine(match({ event: 'Club night', date: '2026-11-11' })) === '11 Nov')
ok('new match', matchName(match()) === 'New match')
ok('unnamed once there is video', matchName(match({ videos: [video('v')] })) === 'Unnamed match')

const fresh = match()
ok('no video', matchRowStatus(fresh).text === 'No video' && matchRowStatus(fresh).tab === 'tag')

const ready = match({ opponent: 'Kim', videos: [video('v')] })
ok('not tagged', matchRowStatus(ready).text === 'Not tagged' && matchRowStatus(ready).tab === 'tag')

const tagging = match({
  opponent: 'Sam',
  videos: [video('v')],
  sets: [won(1), open(2)],
  result: { me: 3, them: 1 },
})
const taggingStatus = matchRowStatus(tagging)
ok('continue wins', taggingStatus.kind === 'continue' && taggingStatus.text === 'Continue set 2' && taggingStatus.setId === 2 && taggingStatus.tab === 'tag')

const readyResult = match({
  videos: [video('v')],
  sets: [won(1), won(2)],
})
ok('tagged result ready', taggedResultReady(readyResult))
const noResult = matchRowStatus(readyResult)
ok('no result', noResult.text === 'No result' && noResult.tab === 'details' && noResult.kind === 'no-result')

const stillOpen = match({
  videos: [video('v')],
  sets: [won(1), won(2), open(3)],
})
ok('continue before no result', matchRowStatus(stillOpen).kind === 'continue' && matchRowStatus(stillOpen).setId === 3)

const archived = match({
  videos: [video('v', true)],
  sets: [won(1), won(2), open(3)],
})
ok('archived has no continue', matchRowStatus(archived).kind === 'no-result')

const part = match({
  videos: [video('v')],
  sets: [
    {
      ...emptySet(1),
      finished: true,
      rallies: [{ winner: 'me' } as SetData['rallies'][number]],
    },
  ],
})
ok('part tagged', matchRowStatus(part).text === 'Part tagged' && matchRowStatus(part).tab === 'tag')

const tagged = match({
  opponent: 'Pat',
  videos: [video('v')],
  sets: [won(1), won(2)],
  result: { me: 2, them: 0 },
  tagDone: true,
})
ok('tagged', matchRowStatus(tagged).text === 'Tagged' && matchRowStatus(tagged).tab === 'insights')

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nall passed')
