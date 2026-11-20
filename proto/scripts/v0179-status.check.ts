/**
 * v0.17.9 status line and the one button per set.
 * Run: npm run check:v0179
 */
import type { MatchRecord, SetData, SetMark, VideoAsset } from '../src/data/demoStore'
import { clampWing, lineAction, newMarkAt, videoStatus, wingLimits } from '../src/features/tagging/setMark'

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

const open = match([video('v1', false)], [])
open.videos[0] = { ...open.videos[0], durationS: 1000 }
const added = newMarkAt(open, 'v1', null)
ok('add at the start is part filmed', added.ok && added.setId === 1 && added.mark.complete === false && added.mark.from.t === 0 && added.mark.to.t === 600)
const mid = newMarkAt(open, 'v1', 100)
ok('add in free time is complete', mid.ok && mid.mark.from.t === 100 && mid.mark.to.t === 700 && mid.mark.complete === true)
const short = match([{ ...video('v1'), durationS: 700 }], [])
const tail = newMarkAt(short, 'v1', 200)
ok('add at the last video end is part filmed', tail.ok && tail.mark.to.t === 700 && tail.mark.complete === false)

const taken = match(
  [{ ...video('v1'), durationS: 1000 }],
  [setOf(1, mark('v1', 0, 100, true), 'saved')]
)
const next = newMarkAt(taken, 'v1', null)
ok('add takes the next number', next.ok && next.setId === 2 && next.mark.from.t === 100)
const none = newMarkAt(taken, 'v1', 500, 1)
ok('taken number is refused', !none.ok && none.reason === 'No set number is free here.')

function rally(videoId: string, a: number, b: number): SetData['rallies'][number] {
  return { id: `${a}`, videoId, contacts: [a, b], start: a, end: b, winner: 'me' } as SetData['rallies'][number]
}
const bounded = match(
  [{ ...video('v1'), durationS: 600 }],
  [
    setOf(1, mark('v1', 0, 100, true), 'saved'),
    {
      ...setOf(2, mark('v1', 100, 400, true), 'tagging'),
      rallies: [rally('v1', 180, 260)],
    },
  ]
)
const startLimit = wingLimits(bounded, 2, 'start')
const endLimit = wingLimits(bounded, 2, 'end')
ok('start stops at the rally', startLimit !== null && clampWing(startLimit, 300).hint === 'Stops at rally 1' && clampWing(startLimit, 300).at === 180)
ok('start stops at the neighbour', startLimit !== null && clampWing(startLimit, 10).hint === 'Stops at set 1')
ok('end stops at the rally', endLimit !== null && clampWing(endLimit, 200).hint === 'Stops at rally 1' && Math.round(clampWing(endLimit, 200).at) === 260)
ok('end stops at the video end', endLimit !== null && clampWing(endLimit, 900).hint === 'Stops at the video end' && clampWing(endLimit, 900).at === 600)
ok('end keeps 60 seconds', endLimit !== null && clampWing(endLimit, 120).at >= 160)
const plain = match([{ ...video('v1'), durationS: 600 }], [setOf(1, mark('v1', 0, 200, true), 'ready')])
const plainEnd = wingLimits(plain, 1, 'end')
ok(
  '60 seconds from the other wing',
  plainEnd !== null && clampWing(plainEnd, 20).hint === 'Stops at 1 minute' && clampWing(plainEnd, 20).at === 60
)

if (fails.length) {
  console.error(`v0.17.9 status: ${fails.length} failed`)
  process.exit(1)
}
console.log('v0.17.9 status: all passed')
