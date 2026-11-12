/**
 * Training comparison — group posts by kind/label/month for the focal player.
 * Pure. Training never participates in match review scopes.
 */

import type { ReviewScope } from '@/rules/reviewScope'

export type TrainingPostKind = 'shot_type' | 'combination'

export interface TrainingPostRef {
  id: string
  player_id: string
  kind: TrainingPostKind
  label: string
  month: string // YYYY-MM
  clip_asset_ids: string[]
}

export function postsForPlayer(posts: readonly TrainingPostRef[], playerId: string): TrainingPostRef[] {
  return posts.filter((p) => p.player_id === playerId)
}

/** Same shot type or combination across months (excludes other kinds/labels). */
export function comparePostsOfSameSeries(
  posts: readonly TrainingPostRef[],
  playerId: string,
  kind: TrainingPostKind,
  label: string,
): TrainingPostRef[] {
  return postsForPlayer(posts, playerId)
    .filter((p) => p.kind === kind && p.label === label)
    .sort((a, b) => a.month.localeCompare(b.month))
}

/** October’s post must not appear when comparing only November’s month set. */
export function postsInMonth(
  series: readonly TrainingPostRef[],
  month: string,
): TrainingPostRef[] {
  return series.filter((p) => p.month === month)
}

export function isCombinationPost(post: TrainingPostRef): boolean {
  return post.kind === 'combination'
}

export function isShotTypePost(post: TrainingPostRef): boolean {
  return post.kind === 'shot_type'
}

/** Training posts are never match-scope members. */
export function trainingPostInMatchScope(_post: TrainingPostRef, _scope: ReviewScope): false {
  return false
}
