/**
 * MatchReviewComposer — Match Review page (route: /matches/:id)
 *
 * Header, Section A (Match story), locked shells for sections B–F,
 * and the Tag / Resume button that opens the set picker.
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
import { SetSelectionModal } from '@/features/match-management/sections/SetSelectionModal'
import { resolveOpponentId } from '@/helpers/themSide'
import { useDeriveMatchStory } from '../derive/useDeriveMatchStory'
import { MatchStorySection } from '../sections/MatchStorySection'
import { ReviewShotsListBlock } from '../blocks/ReviewShotsListBlock'
import { LockedSectionBlock } from '../blocks/LockedSectionBlock'
import type { LockedSectionModel } from '../models'

/** Sections that unlock as more tagging detail exists */
const LOCKED_SECTIONS: LockedSectionModel[] = [
  {
    id: 'B',
    title: 'Serve',
    question: 'Is my serve effective? Does it win points, force mistakes and set up my attack, or does it get punished?',
  },
  {
    id: 'C',
    title: 'Receive',
    question: 'How do I choose to receive, attack or passive, and how well does each work?',
  },
  {
    id: 'D',
    title: 'My first attack',
    question: 'Is my first attack working for me?',
  },
  {
    id: 'E',
    title: 'When they attack',
    question: 'When my opponent attacks first, how do I respond, and do I get back into the point?',
  },
  {
    id: 'F',
    title: 'How points finish',
    question: "Can I finish points, and can I survive when they're finishing?",
  },
]

export function MatchReviewComposer() {
  const { id: matchId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { match, sets, story, isLoading, notFound, error } = useDeriveMatchStory(matchId)
  const [showSetPicker, setShowSetPicker] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400">Loading match...</p>
      </div>
    )
  }

  if (error || notFound || !match || !story) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-neutral-50 mb-2">
          {error ? 'Could not load match' : 'Match not found'}
        </h2>
        {error && <p className="text-sm text-neutral-400 mb-4">{error}</p>}
        <Button variant="secondary" onClick={() => navigate('/matches')}>
          Back to Matches
        </Button>
      </Card>
    )
  }

  const hasTaggingStarted = sets.some((s) => s.tagging_started_at !== null || s.is_tagged)
  const matchDate = new Date(match.match_date).toLocaleDateString()

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/matches')}
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100 transition-colors mb-2"
          >
            <Icon name="arrow-left" size="sm" />
            Matches
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50">
            {story.heroName} <span className="text-neutral-500 font-normal">vs</span>{' '}
            {story.villainName}
          </h1>
          <p className="text-neutral-400 mt-1 text-sm md:text-base">
            Match review · {matchDate}
          </p>
        </div>
        <Button onClick={() => setShowSetPicker(true)}>
          <Icon name="play" size="sm" />
          {hasTaggingStarted ? 'Resume tagging' : 'Tag match'}
        </Button>
      </header>

      <MatchStorySection story={story} />

      <ReviewShotsListBlock rows={story.reviewShots} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-50">More to unlock</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {LOCKED_SECTIONS.map((section) => (
            <LockedSectionBlock
              key={section.id}
              id={section.id}
              title={section.title}
              question={section.question}
            />
          ))}
        </div>
      </section>

      {showSetPicker && (
        <SetSelectionModal
          matchId={match.id}
          sets={sets}
          player1Name={story.heroName}
          player2Name={story.villainName}
          player1Id={match.player1_id}
          player2Id={resolveOpponentId(match.player2_id)}
          taggingMode="pass1focus"
          onClose={() => setShowSetPicker(false)}
        />
      )}
    </div>
  )
}
