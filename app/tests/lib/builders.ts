import type { MatchRecord, SetData, SetMark, VideoAsset } from './app'
import { emptySet } from './app'
import type { Points, Side } from './app'
import { countPoints, isSetWon, setEndIndex } from './app'

export function video(id: string, archived = false): VideoAsset {
  return { id, fileName: `${id}.mp4`, sizeMb: 1, archived, kind: 'demo', durationS: 600 }
}

export function mark(videoId: string, a: number, b: number, complete: boolean): SetMark {
  return { from: { videoId, t: a }, to: { videoId, t: b }, complete }
}

export function setOf(
  setId: number,
  placed: SetMark | null,
  kind: 'off' | 'part' | 'ready' | 'tagging' | 'saved',
): SetData {
  const tagged = kind === 'tagging' || kind === 'saved'
  return {
    setId,
    entered: { me: '', them: '' },
    finished: kind === 'saved',
    firstServer: 'me',
    rallies:
      kind === 'saved'
        ? Array.from({ length: 11 }, () => ({ winner: 'me' }) as SetData['rallies'][number])
        : kind === 'tagging'
          ? [{ winner: 'me' } as SetData['rallies'][number]]
          : [],
    draft: null,
    mark: placed,
  }
}

export function matchOfSets(videos: VideoAsset[], sets: SetData[]): MatchRecord {
  return {
    id: 'm',
    opponent: 'Sam',
    event: 'Club night',
    date: '',
    result: { me: null, them: null },
    videos,
    sets,
  }
}

export function matchRecord(over: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: 'm',
    opponent: '',
    event: '',
    date: '',
    result: { me: null, them: null },
    videos: [],
    sets: [emptySet(1)],
    ...over,
  }
}

export function wonSet(setId: number): SetData {
  return {
    ...emptySet(setId),
    finished: true,
    rallies: Array.from({ length: 11 }, () => ({ winner: 'me' }) as SetData['rallies'][number]),
  }
}

export function openSet(setId: number): SetData {
  return {
    ...emptySet(setId),
    rallies: [{ winner: 'me' } as SetData['rallies'][number]],
  }
}

export function winnersSide(n: number, side: Side): Side[] {
  return Array.from({ length: n }, () => side)
}

export function scoreFromWinners(winners: Side[]): Points {
  return countPoints(winners)
}

/** The old Details clause: a broken set could be saved when the totals matched. */
export function withDetailsClause(winners: Side[], entered: Points | null): boolean {
  const now = scoreFromWinners(winners)
  const reached = entered !== null && entered.me === now.me && entered.them === now.them
  const end = setEndIndex(winners)
  return winners.length > 0 && (end === winners.length - 1 || Boolean(reached && entered && isSetWon(entered)))
}

export function placedSet(setId: number, winners: Side[], finished: boolean): SetData {
  return {
    ...emptySet(setId),
    finished,
    rallies: winners.map((winner) => ({ winner }) as SetData['rallies'][number]),
    mark: { from: { videoId: 'v', t: 0 }, to: { videoId: 'v', t: 30 }, complete: true },
  }
}

export function minimalMatchFromSet(s: SetData, result: MatchRecord['result'] = { me: null, them: null }): MatchRecord {
  return {
    id: 'm',
    opponent: 'Kim',
    event: '',
    date: '',
    result,
    videos: [],
    sets: [s],
  }
}