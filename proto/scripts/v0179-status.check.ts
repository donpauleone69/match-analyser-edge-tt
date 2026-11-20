/**
 * v0.17.9 status line and the one button per set.
 * Run: npm run check:v0179
 */
import type { MatchRecord, SetData, SetMark, VideoAsset } from '../src/data/demoStore'
import { lineAction, videoStatus } from '../src/features/tagging/setMark'

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

function mark(videoId: string, a: number, b: number, complete: boolean): SetMark {
  return { from: { videoId, t: a }, to: { videoId, t: b }, complete }
}

function setOf(setId: number, placed: SetMark | null, kind: 'off' | 'part' | 'ready' | 'tagging' | 'saved'): SetData {
  const tagged = kind === 'tagging' || kind === 'saved'
  return {
    setId,
    entered: { me: '', them: '' },
    skipped: false,
    finished: kind === 'saved',
    firstServer: 'me',
    rallies: tagged ? [{ winner: 'me' } as SetData['rallies'][number]] : [],
    draft: null,
    mark: placed,
  }
}

function match(videos: VideoAsset[], sets: SetData[]): MatchRecord {
  return {
    id: 'm',
    opponent: 'Sam',
    event: 'Club night',
    date: '',
    result: { me: null, them: null },
    videos,
    sets,
    tagDone: false,
  }
}

const v1 = video('v1')
const v2 = video('v2')
const archived = video('arc', true)

ok('archived wins', videoStatus(match([archived], [setOf(1, mark('arc', 0, 100, true), 'tagging')]), 'arc') === 'Archived')
ok('no sets yet', videoStatus(match([v1], [setOf(1, null, 'off')]), 'v1') === 'No sets yet')
ok('tagging', videoStatus(match([v1], [setOf(1, mark('v1', 0, 200, true), 'tagging')]), 'v1') === 'Tagging')
ok(
  'tagging before ready',
  videoStatus(
    match(
      [v1],
      [setOf(1, mark('v1', 0, 100, true), 'saved'), setOf(2, mark('v1', 100, 400, true), 'tagging'), setOf(3, mark('v1', 400, 500, true), 'ready')]
    ),
    'v1'
  ) === 'Tagging'
)
ok(
  'ready to tag',
  videoStatus(match([v1], [setOf(1, mark('v1', 0, 100, true), 'saved'), setOf(2, mark('v1', 200, 400, true), 'ready')]), 'v1') === 'Ready to tag'
)
ok('part filmed is done', videoStatus(match([v1], [setOf(1, mark('v1', 0, 80, false), 'part')]), 'v1') === 'Done')
ok(
  'saved and part filmed is done',
  videoStatus(match([v1], [setOf(1, mark('v1', 0, 100, true), 'saved'), setOf(2, mark('v1', 100, 180, false), 'part')]), 'v1') === 'Done'
)
ok('free time still done', videoStatus(match([v1], [setOf(1, mark('v1', 0, 90, true), 'saved')]), 'v1') === 'Done')

const spanning = match(
  [v1, v2],
  [setOf(3, { from: { videoId: 'v1', t: 500 }, to: { videoId: 'v2', t: 40 }, complete: true }, 'ready')]
)
ok('span counts on the next video', videoStatus(spanning, 'v2') === 'Ready to tag')
ok('span counts on the first video', videoStatus(spanning, 'v1') === 'Ready to tag')

ok('ready button', lineAction(setOf(2, mark('v1', 0, 10, true), 'ready')) === 'Tag')
ok('tagging button', lineAction(setOf(2, mark('v1', 0, 10, true), 'tagging')) === 'Continue')
ok('saved button', lineAction(setOf(1, mark('v1', 0, 10, true), 'saved')) === 'Open')
ok('part filmed has no button', lineAction(setOf(3, mark('v1', 0, 10, false), 'part')) === null)
ok('unmarked has no button', lineAction(setOf(4, null, 'off')) === null)

if (fails.length) {
  console.error(`v0.17.9 status: ${fails.length} failed`)
  process.exit(1)
}
console.log('v0.17.9 status: all passed')
