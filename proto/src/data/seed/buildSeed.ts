/**
 * The fourteen demo matches. Every rally is a Best + FA save from the script,
 * and every set mark is written here. Dates are days before `today`.
 */
import type { MatchRecord, Points, SetData, SetMark, VideoAsset } from '@/types/match'
import type { RallyData, Side } from '@/types/rally'
import type { VideoScript } from '@/types/video'
import { isoDaysBefore } from '@/rules/format'
import { otherSide, pointRally } from '@/rules/rally'
import {
  addPoint,
  firstServerForSet,
  countPoints,
  isLegalEnd,
  isSetWon,
  serverAt,
  setOverOnRule,
} from '@/rules/score'
import {
  buildScripts,
  matchScript,
  rallyFromScript,
  setWinners,
  type ScriptSet,
} from './script'
import {
  firstContactG,
  lastContactG,
  segmentAt,
  segmentsOf,
  toGlobal,
  totalDuration,
  type Segment,
} from '@/rules/timeline'

const round = (v: number) => Math.round(v * 100) / 100

function videoOf(id: string, fileName: string, script: VideoScript, archived = false): VideoAsset {
  const sizeMb = Math.round(script.duration * 6)
  return {
    id,
    fileName,
    sizeMb: archived ? Math.round(sizeMb * 0.12) : sizeMb,
    archived,
    kind: 'demo',
    durationS: script.duration,
    script,
  }
}

function blankSet(setId: number): SetData {
  return {
    setId,
    entered: { me: '', them: '' },
    finished: false,
    firstServer: firstServerForSet('me', setId),
    rallies: [],
    draft: null,
    mark: null,
  }
}

/**
 * Prefer losing your own serve and winning the receive, without ending the set early.
 * Falls back to an even set when the walk cannot land on the score.
 */
function biasedWinners(me: number, them: number, first: Side, keepServerEvery: number): Side[] {
  const need: Points = { me, them }
  let score: Points = { me: 0, them: 0 }
  const out: Side[] = []
  while (need.me + need.them > 0) {
    const server = serverAt(first, score)
    const wantServer = out.length % keepServerEvery === keepServerEvery - 1
    const prefer: Side = wantServer ? server : otherSide(server)
    const options: Side[] = [prefer, otherSide(prefer)]
    let took: Side | null = null
    for (const side of options) {
      if (need[side] <= 0) continue
      const next = addPoint(score, side)
      const left = need.me + need.them - 1
      if (left > 0 && isSetWon(next)) continue
      took = side
      break
    }
    if (!took) return setWinners(me * 17 + them, me, them)
    out.push(took)
    score = addPoint(score, took)
    need[took] -= 1
  }
  if (!isLegalEnd(score) || !setOverOnRule(out)) return setWinners(me * 17 + them, me, them)
  return out
}

function winnersOf(seed: number, me: number, them: number, first: Side, keepServerEvery: number): Side[] {
  return keepServerEvery > 0 ? biasedWinners(me, them, first, keepServerEvery) : setWinners(seed, me, them)
}

/** 9 - 7, you ahead, never a legal end along the way. */
function earlyWinners(): Side[] {
  const out: Side[] = []
  for (let i = 0; i < 7; i++) out.push('me', 'them')
  out.push('me', 'me')
  return out
}

type Filmed = {
  setId: number
  winners: Side[]
  /** How many rallies from the start are saved. The rest only fill the video. */
  save: number
  finished: boolean
  /** The mark runs to the end of the video that holds the last saved rally. */
  toEnd: boolean
  /** The mark runs through the rest of this set's script and stays incomplete. */
  coverRest: boolean
  entered: { me: string; them: string }
  /** Saved indexes that are points added without video. */
  points: number[]
}

function enteredOf(me: number, them: number): { me: string; them: string } {
  return { me: String(me), them: String(them) }
}

function clockAt(segs: Segment[], g: number): { videoId: string; t: number } {
  const total = totalDuration(segs)
  const clamped = Math.min(Math.max(0, g), Math.max(0, total - 0.01))
  const seg = segmentAt(segs, clamped)!
  const t = Math.min(seg.duration, Math.max(0, clamped - seg.offset))
  return { videoId: seg.id, t: round(t) }
}

function videoEnd(segs: Segment[], videoId: string): { videoId: string; t: number } {
  const seg = segs.find((s) => s.id === videoId)!
  return { videoId, t: round(seg.duration) }
}

function globalOf(segs: Segment[], point: { videoId: string; t: number }): number {
  return toGlobal(segs, point.videoId, point.t) ?? 0
}

/** Pads of a few seconds, then pull neighbouring marks together when a gap would be 8s or more. */
function scriptContact(videos: VideoAsset[], setId: number, which: 'first' | 'last'): { videoId: string; t: number } | null {
  let found: { videoId: string; t: number } | null = null
  for (const video of videos) {
    for (const rally of video.script?.rallies ?? []) {
      if (rally.setNo !== setId || rally.contacts.length === 0) continue
      const t = which === 'first' ? rally.contacts[0] : rally.contacts[rally.contacts.length - 1]
      const point = { videoId: video.id, t }
      if (which === 'first' && found) return found
      found = point
    }
  }
  return found
}

function marksFor(videos: VideoAsset[], sets: SetData[], toEnd: Set<number>, coverRest: Set<number>): SetData[] {
  const segs = segmentsOf(videos)
  const next = sets.map((set) => {
    const rallies = set.rallies.filter((r) => r.contacts.length > 0 || r.point)
    if (rallies.length === 0 || !set.mark && set.rallies.length === 0) return set
    if (set.rallies.length === 0) return set
    const startG = firstContactG(segs, set.rallies[0])
    const endG = lastContactG(segs, set.rallies[set.rallies.length - 1])
    if (startG === null || endG === null) return set
    const from = clockAt(segs, Math.max(0.2, startG - 3))
    const endVideo = segmentAt(segs, Math.min(endG, totalDuration(segs) - 0.01))
    const scriptEnd = coverRest.has(set.setId) ? scriptContact(videos, set.setId, 'last') : null
    const nextSet = scriptContact(videos, set.setId + 1, 'first')
    let to = scriptEnd
      ? clockAt(segs, globalOf(segs, scriptEnd) + 3)
      : toEnd.has(set.setId) && endVideo
        ? videoEnd(segs, endVideo.id)
        : clockAt(segs, endG + 3)
    if (scriptEnd && nextSet) {
      const limit = globalOf(segs, nextSet) - 1
      if (globalOf(segs, to) > limit) to = clockAt(segs, limit)
    }
    const complete =
      !toEnd.has(set.setId) &&
      !coverRest.has(set.setId) &&
      from.t > 0 &&
      !(endVideo && to.videoId === segs[segs.length - 1].id && to.t >= segs[segs.length - 1].duration - 0.05)
    return { ...set, mark: { from, to, complete } as SetMark }
  })

  const filmed = next.filter((s) => s.mark && s.rallies.length > 0)
  for (let i = 0; i < filmed.length - 1; i++) {
    const a = filmed[i].mark!
    const b = filmed[i + 1].mark!
    const gap = globalOf(segs, b.from) - globalOf(segs, a.to)
    if (gap < 8) continue
    const left = globalOf(segs, a.to)
    const right = globalOf(segs, b.from)
    const mid = (left + right) / 2
    a.to = clockAt(segs, mid - 0.5)
    b.from = clockAt(segs, mid + 0.5)
  }
  // A saved mark must not sit on 0:00 or the very end, or it would read as part filmed.
  for (const set of next) {
    if (!set.mark || toEnd.has(set.setId)) continue
    if (set.mark.from.t <= 0 && set.mark.from.videoId === videos[0]?.id) {
      set.mark = { ...set.mark, from: { ...set.mark.from, t: 0.2 } }
    }
    const last = segs[segs.length - 1]
    if (last && set.mark.to.videoId === last.id && set.mark.to.t >= last.duration - 0.05) {
      set.mark = { ...set.mark, to: { videoId: last.id, t: round(Math.max(0, last.duration - 0.4)) } }
    }
    const startG = firstContactG(segs, set.rallies[0])
    const endG = lastContactG(segs, set.rallies[set.rallies.length - 1])
    if (startG !== null && globalOf(segs, set.mark.from) > startG) {
      set.mark = { ...set.mark, from: clockAt(segs, Math.max(0.2, startG - 0.3)) }
    }
    if (endG !== null && globalOf(segs, set.mark.to) < endG) {
      set.mark = { ...set.mark, to: clockAt(segs, endG + 0.3) }
    }
  }
  return next
}

function film(seed: number, plans: Filmed[], cuts: number[], videoIds: string[], names: string[], archived: boolean): {
  videos: VideoAsset[]
  sets: SetData[]
} {
  const scriptSets: ScriptSet[] = plans.map((plan) => ({
    firstServer: firstServerForSet('me', plan.setId),
    winners: plan.winners,
    setNo: plan.setId,
  }))
  const scripts = buildScripts(seed, scriptSets, cuts)
  const videos = scripts.map((script, i) => videoOf(videoIds[i], names[i], script, archived))
  const flat: { videoId: string; rally: VideoScript['rallies'][number] }[] = []
  videos.forEach((video) => {
    for (const rally of video.script?.rallies ?? []) flat.push({ videoId: video.id, rally })
  })
  let cursor = 0
  let rallyNo = 0
  const toEnd = new Set<number>()
  const coverRest = new Set<number>()
  const sets: SetData[] = plans.map((plan) => {
    const slice = flat.slice(cursor, cursor + plan.winners.length)
    cursor += plan.winners.length
    const saved = slice.slice(0, plan.save)
    const rallies: RallyData[] = saved.map((item, i) => {
      const index = rallyNo
      rallyNo += 1
      if (plan.points.includes(i)) {
        const video = videos.find((v) => v.id === item.videoId)
        if (video?.script) {
          video.script = { ...video.script, rallies: video.script.rallies.filter((rally) => rally !== item.rally) }
        }
        const server = serverAt(firstServerForSet('me', plan.setId), scoreBefore(plan.winners, i))
        return pointRally(`${item.videoId}-p${index}`, item.videoId, round(item.rally.contacts[0]), server, plan.winners[i])
      }
      return rallyFromScript(item.videoId, item.rally, index)
    })
    if (plan.toEnd) toEnd.add(plan.setId)
    if (plan.coverRest) coverRest.add(plan.setId)
    return {
      ...blankSet(plan.setId),
      entered: plan.entered,
      finished: plan.finished,
      firstServer: firstServerForSet('me', plan.setId),
      rallies,
      mark: rallies.length ? { from: { videoId: videos[0].id, t: 0 }, to: { videoId: videos[0].id, t: 1 }, complete: false } : null,
    }
  })
  return { videos, sets: marksFor(videos, sets, toEnd, coverRest) }
}

function scoreBefore(winners: Side[], index: number): Points {
  let score: Points = { me: 0, them: 0 }
  for (let i = 0; i < index; i++) score = addPoint(score, winners[i])
  return score
}

function saved(seed: number, setId: number, me: number, them: number, keepServerEvery = 0, entered?: { me: number; them: number }, points: number[] = []): Filmed {
  const first = firstServerForSet('me', setId)
  const winners = winnersOf(seed + setId, me, them, first, keepServerEvery)
  return {
    setId,
    winners,
    save: winners.length,
    finished: true,
    toEnd: false,
    coverRest: false,
    entered: enteredOf(entered?.me ?? me, entered?.them ?? them),
    points,
  }
}

function off(setId: number, me: number, them: number): SetData {
  return { ...blankSet(setId), entered: enteredOf(me, them) }
}

function matchOf(
  id: string,
  opponent: string,
  event: string,
  date: string,
  result: { me: number; them: number } | null,
  videos: VideoAsset[],
  sets: SetData[],
): MatchRecord {
  return {
    id,
    opponent,
    event,
    date,
    result: result ? { me: result.me, them: result.them } : { me: null, them: null },
    videos,
    sets,
  }
}

export function buildSeed(today: Date): MatchRecord[] {
  const on = (days: number) => isoDaysBefore(today, days)

  const partialSeven: Side[] = ['me', 'me', 'them', 'me', 'them', 'them', 'me']
  // From 4 - 3 the rest trades until 9 - 10, then Sam takes the set 9 - 11.
  const samTail: Side[] = ['them', 'me', 'them', 'me', 'them', 'me', 'them', 'me', 'them', 'me', 'them', 'them', 'them']
  const set2 = [...partialSeven, ...samTail]
  const set2Score = countPoints(set2)
  if (set2Score.me !== 9 || set2Score.them !== 11 || !setOverOnRule(set2)) {
    throw new Error(`Club night set 2 scripts ${set2Score.me} - ${set2Score.them}`)
  }
  const partialPlans: Filmed[] = [
    { ...saved(11, 1, 11, 7), winners: setWinners(11, 11, 7) },
    {
      setId: 2,
      winners: set2,
      save: partialSeven.length,
      finished: false,
      toEnd: false,
      coverRest: true,
      entered: enteredOf(9, 11),
      points: [],
    },
    { ...saved(13, 3, 11, 8), save: 0, finished: false },
  ]
  // The cut is the first point after the seven saved rallies of set 2.
  const partialCut = setWinners(11, 11, 7).length + partialSeven.length
  const partial = film(101, partialPlans, [partialCut], ['v-club-1', 'v-club-2'], ['club-night-part-1.mp4', 'club-night-part-2.mp4'], false)

  const complete = film(
    202,
    [
      saved(21, 1, 11, 8, 4),
      saved(22, 2, 8, 11, 4, { me: 9, them: 11 }),
      saved(23, 3, 11, 6, 4),
      saved(24, 4, 7, 11, 4),
      saved(25, 5, 11, 9, 4),
    ],
    [],
    ['v-final'],
    ['league-final.mp4'],
    false,
  )

  const h1 = film(301, [saved(31, 1, 11, 5), saved(32, 2, 11, 7), saved(33, 3, 11, 4)], [], ['v-h1'], ['junior-gp-alex.mp4'], false)
  const h2 = film(
    302,
    [saved(34, 1, 11, 8), saved(35, 2, 6, 11), saved(36, 3, 9, 11), saved(37, 4, 4, 11)],
    [],
    ['v-h2'],
    ['junior-gp-jo.mp4'],
    false,
  )
  const h3Early: Filmed = {
    setId: 5,
    winners: earlyWinners(),
    save: earlyWinners().length,
    finished: true,
    toEnd: true,
    coverRest: false,
    entered: enteredOf(9, 7),
    points: [],
  }
  const h3 = film(
    303,
    [saved(41, 1, 11, 9), saved(42, 2, 9, 11), saved(43, 3, 11, 7), saved(44, 4, 8, 11), h3Early],
    [],
    ['v-h3'],
    ['league-kim.mp4'],
    false,
  )
  const h4 = film(304, [saved(51, 1, 11, 9), saved(52, 2, 8, 11), saved(53, 3, 11, 6)], [], ['v-h4'], ['club-sam.mp4'], false)
  const h5 = film(305, [saved(61, 1, 11, 7), saved(62, 2, 11, 8), saved(64, 4, 11, 5)], [], ['v-h5'], ['county-max.mp4'], false)
  const h6 = film(
    306,
    [
      saved(71, 1, 11, 9, 3),
      saved(72, 2, 9, 11, 3),
      saved(73, 3, 11, 7, 3),
      saved(74, 4, 6, 11, 3),
      saved(75, 5, 9, 11, 3),
    ],
    [],
    ['v-h6'],
    ['league-pat.mp4'],
    false,
  )

  const h7sets = [saved(81, 1, 11, 6), saved(82, 2, 11, 9), saved(83, 3, 7, 11), saved(84, 4, 11, 8)]
  const h7cut = h7sets[0].winners.length + h7sets[1].winners.length + Math.floor(h7sets[2].winners.length / 2)
  const h7 = film(307, h7sets, [h7cut], ['v-h7-a', 'v-h7-b'], ['nationals-alex-1.mp4', 'nationals-alex-2.mp4'], false)

  const h8 = film(308, [saved(91, 1, 5, 11), saved(92, 2, 8, 11), saved(93, 3, 3, 11)], [], ['v-h8'], ['nationals-jo.mp4'], false)

  const h9set2 = saved(102, 2, 11, 9, 0, undefined, [4, 9])
  const h9 = film(309, [saved(101, 1, 11, 7), h9set2, saved(103, 3, 9, 11), saved(104, 4, 11, 4)], [], ['v-h9'], ['league-lee.mp4'], false)

  const h10 = film(
    310,
    [saved(111, 1, 11, 8), saved(112, 2, 7, 11), saved(113, 3, 11, 9), saved(114, 4, 10, 12), saved(115, 5, 11, 6)],
    [],
    ['v-h10'],
    ['junior-gp-max.mp4'],
    true,
  )

  const readyVideo = videoOf('v-county', 'county-open.mp4', matchScript(31))

  return [
    matchOf('m-new', 'Lee', 'Open trial', '', null, [], [blankSet(1)]),
    matchOf('m-ready', 'Kim', 'County open', on(3), null, [readyVideo], [blankSet(1)]),
    matchOf('m-partial', 'Sam', 'Club night', on(6), { me: 3, them: 1 }, partial.videos, [
      partial.sets[0],
      partial.sets[1],
      partial.sets[2],
      off(4, 11, 6),
    ]),
    matchOf('m-complete', 'Pat', 'League final', on(12), { me: 3, them: 2 }, complete.videos, complete.sets),
    matchOf('m-h1', 'Alex', 'Junior GP', on(19), { me: 3, them: 0 }, h1.videos, h1.sets),
    matchOf('m-h2', 'Jo', 'Junior GP', on(19), { me: 1, them: 3 }, h2.videos, h2.sets),
    matchOf('m-h3', 'Kim', 'League', on(26), { me: 3, them: 2 }, h3.videos, h3.sets),
    matchOf('m-h4', 'Sam', 'Club night', on(33), { me: 2, them: 1 }, h4.videos, h4.sets),
    matchOf('m-h5', 'Max', 'County open', on(40), { me: 3, them: 1 }, h5.videos, [...h5.sets.slice(0, 2), off(3, 6, 11), h5.sets[2]]),
    matchOf('m-h6', 'Pat', 'League', on(47), { me: 2, them: 3 }, h6.videos, h6.sets),
    matchOf('m-h7', 'Alex', 'Nationals', on(61), { me: 3, them: 1 }, h7.videos, h7.sets),
    matchOf('m-h8', 'Jo', 'Nationals', on(61), { me: 0, them: 3 }, h8.videos, h8.sets),
    matchOf('m-h9', 'Lee', 'League', on(75), { me: 3, them: 1 }, h9.videos, h9.sets),
    matchOf('m-h10', 'Max', 'Junior GP', on(88), { me: 3, them: 2 }, h10.videos, h10.sets),
  ]
}
