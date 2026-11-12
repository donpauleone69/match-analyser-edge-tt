import { describe, expect, it } from 'vitest'
import {
  comparePostsOfSameSeries,
  isCombinationPost,
  isShotTypePost,
  postsInMonth,
  trainingPostInMatchScope,
  type TrainingPostRef,
} from './compareTrainingPosts'

const posts: TrainingPostRef[] = [
  {
    id: 'oct-fh',
    player_id: 'p1',
    kind: 'shot_type',
    label: 'forehand_loop',
    month: '2026-10',
    clip_asset_ids: ['a1', 'a2'],
  },
  {
    id: 'nov-fh',
    player_id: 'p1',
    kind: 'shot_type',
    label: 'forehand_loop',
    month: '2026-11',
    clip_asset_ids: ['b1', 'b2'],
  },
  {
    id: 'nov-combo',
    player_id: 'p1',
    kind: 'combination',
    label: 'serve-open-drive',
    month: '2026-11',
    clip_asset_ids: ['c1'],
  },
  {
    id: 'other-player',
    player_id: 'p2',
    kind: 'shot_type',
    label: 'forehand_loop',
    month: '2026-11',
    clip_asset_ids: ['d1'],
  },
]

describe('compareTrainingPosts', () => {
  it('excludes November when listing October’s month of a shot type', () => {
    const series = comparePostsOfSameSeries(posts, 'p1', 'shot_type', 'forehand_loop')
    expect(series.map((p) => p.id)).toEqual(['oct-fh', 'nov-fh'])
    expect(postsInMonth(series, '2026-10').map((p) => p.id)).toEqual(['oct-fh'])
    expect(postsInMonth(series, '2026-10').map((p) => p.id)).not.toContain('nov-fh')
  })

  it('keeps combination posts out of shot-type comparison and the reverse', () => {
    const shotSeries = comparePostsOfSameSeries(posts, 'p1', 'shot_type', 'forehand_loop')
    expect(shotSeries.every(isShotTypePost)).toBe(true)
    expect(shotSeries.some(isCombinationPost)).toBe(false)

    const comboSeries = comparePostsOfSameSeries(posts, 'p1', 'combination', 'serve-open-drive')
    expect(comboSeries.map((p) => p.id)).toEqual(['nov-combo'])
    expect(comboSeries.every(isCombinationPost)).toBe(true)
    expect(comboSeries.some(isShotTypePost)).toBe(false)
  })

  it('never places a training post in a match review scope', () => {
    expect(trainingPostInMatchScope(posts[0], { kind: 'all', id: null })).toBe(false)
    expect(trainingPostInMatchScope(posts[0], { kind: 'tournament', id: 't1' })).toBe(false)
    expect(trainingPostInMatchScope(posts[0], { kind: 'opponent', id: 'opp' })).toBe(false)
    expect(trainingPostInMatchScope(posts[0], { kind: 'match', id: 'm1' })).toBe(false)
  })

  it('scopes posts to the focal player only', () => {
    const series = comparePostsOfSameSeries(posts, 'p1', 'shot_type', 'forehand_loop')
    expect(series.map((p) => p.player_id).every((id) => id === 'p1')).toBe(true)
    expect(series.map((p) => p.id)).not.toContain('other-player')
  })
})
