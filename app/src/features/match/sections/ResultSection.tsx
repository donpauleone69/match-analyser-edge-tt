import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Card, CardTitle } from '@/ui-mine'
import { WfWarnBadge } from '@/ui-mine'
import { formatScore } from '@/rules/format'
import {
  deriveLastTaggedSetId,
  calculateMatchSetsWon,
  resultDiffers,
  calculateResultSetCount,
  hasDifferingScores,
} from '@/rules/match'
import type { EnteredScore, MatchRecord, MatchResult, SetData } from '@/types/match'
import { applyTaggedScore, applyTaggedScores } from '@/rules/matchOps'
import {
  enteredScoresMissResult,
  calculateEnteredSetsWon,
  isRealResult,
  deriveSetsLostByResult,
  taggedResultReady,
} from '@/rules/matchStatus'
import { cn } from '@/helpers/utils'
import { ConfirmBlock } from '../blocks/ConfirmBlock'
import { ResultSelectBlock } from '../blocks/ResultSelectBlock'
import { ScoreInputBlock } from '../blocks/ScoreInputBlock'
import { TaggedCellBlock } from '../blocks/TaggedCellBlock'
import { flagClass, flagRowClass, labelClass, noteRowClass } from '../styles'

function setList(sets: SetData[]): string {
  const names = sets.map((s) => `set ${s.setId}`)
  const text =
    names.length <= 1
      ? names.join('')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Result and set scores as one area. The result dictates the number of sets.
 * At most two lines sit above the scores: one about the result, one about
 * the set scores.
 */
export function ResultSection({
  match,
  setResult,
  setEnteredScore,
  mutateMatch,
}: {
  match: MatchRecord
  setResult: (matchId: string, result: MatchResult) => void
  setEnteredScore: (matchId: string, setId: number, entered: EnteredScore) => void
  mutateMatch: (id: string, fn: (m: MatchRecord) => MatchRecord) => void
}) {
  const count = calculateResultSetCount(match)
  const lastTagged = deriveLastTaggedSetId(match)
  const differing = match.sets.filter(hasDifferingScores).length
  const them = match.opponent.trim() || 'Opponent'
  const fromTagging = calculateMatchSetsWon(match)
  const taggedReady = taggedResultReady(match)
  const saved =
    match.result.me !== null && match.result.them !== null
      ? { me: match.result.me, them: match.result.them }
      : null

  // A lower result that would stop listing sets that hold scores waits here,
  // not in the match, until it is confirmed.
  const [pending, setPending] = useState<{ base: MatchResult; next: MatchResult } | null>(null)
  const waiting = pending && pending.base === match.result ? pending.next : null
  const lost = waiting ? deriveSetsLostByResult(match, waiting) : []

  // Links that say "enter the result" land on the picker.
  const { hash } = useLocation()
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (hash !== '#result') return
    cardRef.current?.scrollIntoView({ block: 'start' })
    cardRef.current?.querySelector('select')?.focus({ preventScroll: true })
  }, [hash])

  const pick = (next: MatchResult) => {
    if (deriveSetsLostByResult(match, next).length > 0) {
      setPending({ base: match.result, next })
    } else {
      setResult(match.id, next)
      setPending(null)
    }
  }

  const commitPending = () => {
    if (waiting) setResult(match.id, waiting)
    setPending(null)
  }

  // Nothing left in the way (the scores it would have dropped were cleared): save it.
  const clear = waiting !== null && lost.length === 0
  useEffect(() => {
    if (clear) commitPending()
  })

  const useTaggedResult = taggedReady ? (
    <Button kind="control" variant="secondary" onClick={() => pick(fromTagging)}>
      Use tagged result
    </Button>
  ) : null

  // One line about the result. The first that applies.
  const resultLine =
    waiting && lost.length > 0 ? (
      <ConfirmBlock label="Change result">
        <p>
          {formatScore({ me: waiting.me ?? 0, them: waiting.them ?? 0 })} gives{' '}
          {(waiting.me ?? 0) + (waiting.them ?? 0)} sets. {setList(lost)}{' '}
          {lost.length === 1 ? 'has' : 'have'} entered scores that will be
          removed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button kind="control" onClick={commitPending}>
            Change to {formatScore({ me: waiting.me ?? 0, them: waiting.them ?? 0 })}
          </Button>
          <Button kind="control" variant="ghost" onClick={() => setPending(null)}>
            {saved ? `Keep ${formatScore(saved)}` : 'Cancel'}
          </Button>
        </div>
      </ConfirmBlock>
    ) : resultDiffers(match) ? (
      <div className={flagRowClass}>
        <span className="inline-flex flex-wrap items-center gap-2">
          <WfWarnBadge>Differs</WfWarnBadge>
          Tagged sets give {formatScore(fromTagging)}.
        </span>
        {useTaggedResult}
      </div>
    ) : saved && !isRealResult(saved) ? (
      <p className={flagClass}>A match cannot end {formatScore(saved)}. Pick the result.</p>
    ) : count !== null && lastTagged > count ? (
      <p className={flagClass}>
        {formatScore(saved ?? fromTagging)} gives {count} sets. Set {lastTagged} is tagged.
      </p>
    ) : count === null && taggedReady ? (
      <div className={noteRowClass}>
        <span>Tagged sets give {formatScore(fromTagging)}.</span>
        {useTaggedResult}
      </div>
    ) : null

  // One line about the set scores. A single differing set is said on its row.
  const scoresLine =
    differing > 1 ? (
      <div className={flagRowClass}>
        <span>{differing} sets differ from tagging.</span>
        <Button
          kind="control"
          variant="secondary"
          onClick={() => mutateMatch(match.id, applyTaggedScores)}
        >
          Use tagged scores
        </Button>
      </div>
    ) : saved && enteredScoresMissResult(match) && !resultDiffers(match) ? (
      <p className={flagClass}>
        Entered set scores add up to {formatScore(calculateEnteredSetsWon(match))}, not {formatScore(saved)}.
      </p>
    ) : null

  return (
    <Card ref={cardRef} id="result" className="space-y-3">
      <CardTitle>Result</CardTitle>
      <div className="flex flex-wrap items-center gap-2 text-sm text-primary">
        <span>You</span>
        <ResultSelectBlock value={waiting ?? match.result} onChange={pick} />
        <span className="min-w-0 truncate">{them}</span>
        <span className="ml-auto text-xs text-muted">
          {count ? `${count} ${count === 1 ? 'set' : 'sets'}` : 'Sets follow the result'}
        </span>
      </div>

      {resultLine}
      {scoresLine}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className={cn(labelClass, 'pb-1 pr-3')}>Set</th>
            <th className={cn(labelClass, 'pb-1 pr-3')}>Entered</th>
            <th className={cn(labelClass, 'pb-1')}>Tagged</th>
          </tr>
        </thead>
        <tbody>
          {match.sets.map((s) => {
            const flagged = hasDifferingScores(s)
            return (
              <tr key={s.setId} className="border-t border-border">
                <td className="py-2 pr-3 font-medium text-primary tabular-nums">{s.setId}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <ScoreInputBlock
                      label={`Set ${s.setId}, your points`}
                      value={s.entered.me}
                      flagged={flagged}
                      onChange={(me) => setEnteredScore(match.id, s.setId, { ...s.entered, me })}
                    />
                    <span className="text-muted">-</span>
                    <ScoreInputBlock
                      label={`Set ${s.setId}, ${them} points`}
                      value={s.entered.them}
                      flagged={flagged}
                      onChange={(next) =>
                        setEnteredScore(match.id, s.setId, { ...s.entered, them: next })
                      }
                    />
                  </span>
                </td>
                <td className="py-2">
                  <TaggedCellBlock
                    set={s}
                    tagHref={`/matches/${match.id}/tag/${s.setId}`}
                    onUseTagged={() => mutateMatch(match.id, (m) => applyTaggedScore(m, s.setId))}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
