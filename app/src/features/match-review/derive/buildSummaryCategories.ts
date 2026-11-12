/**
 * Pure helpers for Summary category navigation + hero playlists.
 * No React, no IO.
 */

import type { CompareSectionModel, EvidenceRef, RallyRowModel } from '../models'

/** Short teaser under a category tile — first hero story line or question. */
export function deriveCategoryTeaser(section: CompareSectionModel): string {
  const firstStory = section.cards.find((c) => c.story.trim().length > 0)?.story
  return firstStory ?? section.question
}

/**
 * Unique rally ids from hero-side evidence in a category (stats → problems → clips).
 * Prefers rows that look like problems (bad tone) then falls back to all hero evidence.
 */
export function collectHeroPlaylistIds(section: CompareSectionModel): string[] {
  const problemIds: string[] = []
  const allIds: string[] = []
  const seenProblem = new Set<string>()
  const seenAll = new Set<string>()

  for (const card of section.cards) {
    for (const row of card.rows) {
      const evidence = row.hero.evidence
      if (!evidence) continue
      for (const id of evidence.rallyIds) {
        if (!seenAll.has(id)) {
          seenAll.add(id)
          allIds.push(id)
        }
        if (row.hero.tone === 'bad' && !seenProblem.has(id)) {
          seenProblem.add(id)
          problemIds.push(id)
        }
      }
    }
  }

  return problemIds.length > 0 ? problemIds : allIds
}

export function buildCategoryPlaylist(
  section: CompareSectionModel,
  rallyById: Map<string, RallyRowModel>
): { evidence: EvidenceRef; rallies: RallyRowModel[] } {
  const ids = collectHeroPlaylistIds(section)
  const rallies = ids
    .map((id) => rallyById.get(id))
    .filter((r): r is RallyRowModel => Boolean(r))
    .sort((a, b) => a.setNumber - b.setNumber || a.rallyIndex - b.rallyIndex)
  return {
    evidence: {
      title: `${section.title} · points for you`,
      subtitle: 'Hero-side numbers in this category — play them as a playlist.',
      rallyIds: rallies.map((r) => r.id),
    },
    rallies,
  }
}
