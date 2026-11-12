import { describe, it, expect } from 'vitest'
import { collectHeroPlaylistIds, deriveCategoryTeaser } from './buildSummaryCategories'
import type { CompareSectionModel } from '../models'

const section: CompareSectionModel = {
  id: 'F',
  title: 'Your misses',
  question: 'What kind of error are you making?',
  cards: [
    {
      id: 'F1',
      title: 'Miss reasons',
      story: 'Most of your misses were timing.',
      rows: [
        {
          key: 'timing',
          label: 'Timing',
          hero: {
            text: '40% (2)',
            tone: 'bad',
            evidence: { title: 'You · timing misses', rallyIds: ['r1', 'r2'] },
          },
          villain: { text: '—', tone: 'none', evidence: null },
        },
        {
          key: 'tech',
          label: 'Technical',
          hero: {
            text: '20% (1)',
            tone: 'none',
            evidence: { title: 'You · technical misses', rallyIds: ['r3', 'r1'] },
          },
          villain: { text: '—', tone: 'none', evidence: null },
        },
      ],
    },
  ],
}

describe('buildSummaryCategories', () => {
  it('prefers bad-tone hero evidence for the playlist', () => {
    expect(collectHeroPlaylistIds(section)).toEqual(['r1', 'r2'])
  })

  it('uses the first card story as teaser', () => {
    expect(deriveCategoryTeaser(section)).toBe('Most of your misses were timing.')
  })
})
