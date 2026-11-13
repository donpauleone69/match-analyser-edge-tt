/**
 * DetailsSection — match admin / facts: context, result, tagging, sets, storage.
 * Kept off the main Summary / Work on / Clips tabs so chrome stays light.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { deriveVideoJumpMarkers } from '@/rules/videoLifecycle'
import { SetsPanelSection } from './SetsPanelSection'
import { MatchStorageBlock } from '../blocks/MatchStorageBlock'
import {
  MatchContextBlock,
  type MatchContextDraft,
} from '../blocks/MatchContextBlock'
import type { MatchReviewViewModel, SetPanelModel } from '../models'
import type { MatchStorageModel } from '../derive/useDeriveMatchStorage'
import type { DBPlayer, DBTournament, MatchRound } from '@/data'

export interface DetailsSectionProps {
  review: MatchReviewViewModel
  players: DBPlayer[]
  tournaments: DBTournament[]
  storage: MatchStorageModel | null
  signedIn: boolean
  cloudAvailable: boolean
  busy: string | null
  uploadPercent: number | null
  conflict: boolean
  contextSaving: boolean
  onSaveContext: (draft: {
    matchDate: string
    player2Id: string | null
    tournamentId: string | null
    round: MatchRound | null
  }) => void
  onCreateOpponent: (firstName: string, lastName: string) => void
  onCreateTournament: (name: string) => void
  onUseVideoDate: (date: string) => void
  onTag: (set: SetPanelModel) => void
  onBrowse: (set: SetPanelModel) => void
  onStartOver: (set: SetPanelModel) => void
  onAddSet: () => void
  onSignIn: () => void
  onBackUpMatch: () => void
  onKeepDevice: () => void
  onUseCloud: () => void
  onBackUpVideo: (assetId: string) => void
  onArchiveVideo: (assetId: string) => void
  onRetrieveVideo: (assetId: string) => void
  onTrimVideo: (assetId: string, setNumber: number, sourceStart: number, sourceEnd: number) => void
  onSaveFile: () => void
}

function draftFromReview(review: MatchReviewViewModel): MatchContextDraft {
  const c = review.context
  return {
    matchDate: c.matchDate,
    player2Id: c.player2Id ?? '',
    tournamentId: c.tournamentId ?? '',
    round: c.round ?? '',
    newOpponentFirst: '',
    newOpponentLast: '',
    newTournamentName: '',
    showNewOpponent: false,
    showNewTournament: false,
  }
}

export function DetailsSection({
  review,
  players,
  tournaments,
  storage,
  signedIn,
  cloudAvailable,
  busy,
  uploadPercent,
  conflict,
  contextSaving,
  onSaveContext,
  onCreateOpponent,
  onCreateTournament,
  onUseVideoDate,
  onTag,
  onBrowse,
  onStartOver,
  onAddSet,
  onSignIn,
  onBackUpMatch,
  onKeepDevice,
  onUseCloud,
  onBackUpVideo,
  onArchiveVideo,
  onRetrieveVideo,
  onTrimVideo,
  onSaveFile,
}: DetailsSectionProps) {
  const taggedSets = review.sets.filter((s) => s.rallyCount > 0).length
  const [draft, setDraft] = useState<MatchContextDraft>(() => draftFromReview(review))
  const jumpMarkers = useMemo(
    () =>
      deriveVideoJumpMarkers(
        review.rallies.map((r) => ({
          setNumber: r.setNumber,
          rallyIndex: r.rallyIndex,
          loop: r.loop,
        }))
      ),
    [review.rallies]
  )

  useEffect(() => {
    setDraft((prev) => ({
      ...draftFromReview(review),
      showNewOpponent: prev.showNewOpponent,
      showNewTournament: prev.showNewTournament,
      newOpponentFirst: prev.newOpponentFirst,
      newOpponentLast: prev.newOpponentLast,
      newTournamentName: prev.newTournamentName,
    }))
  }, [
    review.context.matchDate,
    review.context.player2Id,
    review.context.tournamentId,
    review.context.round,
    review.context.matchDateSourceLabel,
    review.context.suggestedVideoDate,
  ])

  const patchDraft = (patch: Partial<MatchContextDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-5 border border-neutral-700 space-y-3">
        <h2 className="text-lg font-semibold text-neutral-50">Your match</h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-neutral-500">Result</dt>
            <dd
              className={cn(
                'mt-0.5 font-semibold',
                review.resultTone === 'good' && 'text-result-winner',
                review.resultTone === 'bad' && 'text-result-error',
                review.resultTone === 'info' && 'text-neutral-200'
              )}
            >
              {review.resultLabel}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Date</dt>
            <dd className="mt-0.5 text-neutral-200">{review.dateLabel}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Tagging</dt>
            <dd className="mt-0.5 text-neutral-200">
              {review.totalPoints > 0
                ? `${review.totalPoints} points · ${taggedSets} of ${review.sets.length} set${review.sets.length === 1 ? '' : 's'}`
                : 'Nothing tagged yet'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Players</dt>
            <dd className="mt-0.5 text-neutral-200">
              You ({review.heroName}) vs {review.villainName}
            </dd>
          </div>
          {review.context.tournamentName && (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Tournament</dt>
              <dd className="mt-0.5 text-neutral-200">
                {review.context.tournamentName}
                {review.context.roundLabel ? ` · ${review.context.roundLabel}` : ''}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="p-4 md:p-5 border border-neutral-700 space-y-3">
        {(!review.context.player2Id || !review.context.tournamentId) && (
          <p className="text-sm text-neutral-400">
            Optional: add an opponent or tournament so Clips scope (and Review scope) can filter “vs player” or by event.
            Nothing here is required to tag or review.
          </p>
        )}
        {(review.context.player2Id || review.context.tournamentId) && (
          <div className="flex flex-wrap gap-2">
            {review.context.player2Id && (
              <Link
                to={`/clips?scope=opponent&id=${encodeURIComponent(review.context.player2Id)}`}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-600 bg-bg-card px-3 py-2 text-sm text-neutral-100 hover:border-neutral-400"
              >
                <Icon name="film" size="sm" /> Clips vs opponent
              </Link>
            )}
            {review.context.tournamentId && (
              <Link
                to={`/clips?scope=tournament&id=${encodeURIComponent(review.context.tournamentId)}`}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-600 bg-bg-card px-3 py-2 text-sm text-neutral-100 hover:border-neutral-400"
              >
                <Icon name="film" size="sm" /> Clips in tournament
              </Link>
            )}
          </div>
        )}
        <MatchContextBlock
          heroName={review.heroName}
          dateSourceLabel={review.context.matchDateSourceLabel}
          suggestedVideoDate={review.context.suggestedVideoDate}
          players={players}
          tournaments={tournaments}
          heroPlayerId={review.context.player1Id}
          draft={draft}
          saving={contextSaving}
          onChange={patchDraft}
          onSave={() =>
            onSaveContext({
              matchDate: draft.matchDate,
              player2Id: draft.player2Id || null,
              tournamentId: draft.tournamentId || null,
              round: draft.round || null,
            })
          }
          onCreateOpponent={() => onCreateOpponent(draft.newOpponentFirst, draft.newOpponentLast)}
          onCreateTournament={() => onCreateTournament(draft.newTournamentName)}
          onUseVideoDate={() => {
            if (review.context.suggestedVideoDate) {
              patchDraft({ matchDate: review.context.suggestedVideoDate })
              onUseVideoDate(review.context.suggestedVideoDate)
            }
          }}
        />
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-neutral-50">Your sets</h2>
        <p className="text-sm text-neutral-400">Start, continue, or clear a set. Browse opens the Rallies tab.</p>
        <SetsPanelSection
          sets={review.sets}
          onTag={onTag}
          onBrowse={onBrowse}
          onStartOver={onStartOver}
          onAddSet={onAddSet}
        />
      </section>

      {jumpMarkers.chips.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-50">Jump markers</h2>
          <p className="text-sm text-neutral-400">
            Source times for first serve and set ends — use while trimming or when scrubbing the set video.
          </p>
          <ul className="flex flex-wrap gap-2">
            {jumpMarkers.chips.map((chip) => (
              <li key={chip.key}>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-600 bg-bg-card px-3 py-2 text-sm text-neutral-100">
                  <Icon name="target" size="sm" className="text-brand-primary" />
                  {chip.label}
                  <span className="font-mono text-neutral-400">
                    {Math.floor(chip.timeS / 60)}:
                    {Math.floor(chip.timeS % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {storage && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-50">Storage &amp; backup</h2>
          <p className="text-sm text-neutral-400">
            Guided trim cuts intro/gaps using play windows. Archive removes the device original after cloud
            backup. Tags stay on source-video time.
          </p>
          <MatchStorageBlock
            storage={storage}
            setMarkers={jumpMarkers.sets}
            signedIn={signedIn}
            cloudAvailable={cloudAvailable}
            busy={busy}
            uploadPercent={uploadPercent}
            conflict={conflict}
            onSignIn={onSignIn}
            onBackUpMatch={onBackUpMatch}
            onKeepDevice={onKeepDevice}
            onUseCloud={onUseCloud}
            onBackUpVideo={onBackUpVideo}
            onArchiveVideo={onArchiveVideo}
            onRetrieveVideo={onRetrieveVideo}
            onTrimVideo={onTrimVideo}
            onSaveFile={onSaveFile}
          />
        </section>
      )}
    </div>
  )
}
