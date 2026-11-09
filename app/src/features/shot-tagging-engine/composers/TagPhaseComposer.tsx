/**
 * TagPhaseComposer — Pass 1 Opening dense-form UI test
 *
 * Serve → Rally end → outcome (Let / Fault / winner) → loop + form.
 * In-memory only. No shot-by-shot chrome / no rally sidebar.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import {
  SetupControlsBlock,
  VideoControlsBar,
  ChoicePillRow,
  MultiChoicePillRow,
  SegmentedChoice,
  Pass1FormSection,
  Pass1Question,
  type SetupData,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { Button, ServeButton } from '@/ui-mine'
import { ButtonGrid } from '../blocks/ButtonGrid'
import { calculateServer } from '@/rules'
import { setDb } from '@/data'
import { getVideoFile } from '@/helpers/videoStorage'
import {
  emptyPass1Answers,
  deriveVisibility,
  canSavePass1,
  visiblePass1Sections,
  isPass1SectionComplete,
  applyReceiveOutcome,
  applyFosTimingSideEffects,
  passedUpOptionsFor,
  togglePassedUp,
  toggleBallFlag,
  summarizePass1Line,
  PASS1_SECTION_LABEL,
  OPENING_FOS_OPTIONS,
  BALL_FLAG_OPTIONS,
  type Pass1SectionId,
  SERVE_SPIN_LABEL,
  SERVE_LENGTH_LABEL,
  RECEIVE_OUTCOME_LABEL,
  FOS_TIMING_LABEL,
  PASSED_UP_LABEL,
  INCOMING_SPIN_LABEL,
  INCOMING_LENGTH_LABEL,
  BALL_FLAG_LABEL,
  STROKE_LABEL,
  EXECUTION_LABEL,
  MISS_TYPE_LABEL,
  FOS_EFFECT_LABEL,
  NO_FOS_END_LABEL,
  type Pass1Answers,
  type ServeSpin,
  type ServeLength,
  type ReceiveOutcome,
  type FosTiming,
  type PassedUpTiming,
  type BallFlag,
  type IncomingSpin,
  type IncomingLength,
  type Wing,
  type FosStroke,
  type ExecutionQuality,
  type MissType,
  type FosImmediateEffect,
  type NoFosPointEnd,
} from './pass1OpeningModel'

export interface TagPhaseComposerProps {
  matchId: string
  setNumber: number
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  className?: string
}

type WinnerId = 'player1' | 'player2'
type PointOutcome = WinnerId | 'let' | 'service_fault'
type PhaseStep = 'setup' | 'serve' | 'rally' | 'outcome' | 'form' | 'complete'

interface OpenRally {
  serveTimestamp: number
  endTimestamp: number
  winnerId: WinnerId
  answers: Pass1Answers
}

interface CompletedRally {
  rallyIndex: number
  serveTimestamp: number
  endTimestamp: number
  serverId: 'player1' | 'player2'
  winnerId: WinnerId
  serverName: string
  winnerName: string
  answers: Pass1Answers
  summary: string
}

function opts<T extends string>(
  record: Record<T, string>,
  keys?: T[]
): { value: T; label: string }[] {
  const list = keys ?? (Object.keys(record) as T[])
  return list.map((value) => ({ value, label: record[value] }))
}

export function TagPhaseComposer({
  matchId,
  setNumber,
  player1Name,
  player2Name,
  className,
}: TagPhaseComposerProps) {
  const navigate = useNavigate()
  const currentTime = useVideoPlaybackStore((state) => state.currentTime)
  const videoUrl = useVideoPlaybackStore((state) => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((state) => state.setVideoUrl)
  const isPlaying = useVideoPlaybackStore((state) => state.isPlaying)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)

  const [setReady, setSetReady] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupNextServer, setSetupNextServer] = useState<'player1' | 'player2'>('player1')
  const [currentScore, setCurrentScore] = useState({ player1: 0, player2: 0 })

  const [phase, setPhase] = useState<PhaseStep>('setup')
  const [pendingServeAt, setPendingServeAt] = useState<number | null>(null)
  const [pendingEndAt, setPendingEndAt] = useState<number | null>(null)
  const [openRally, setOpenRally] = useState<OpenRally | null>(null)
  const [completed, setCompleted] = useState<CompletedRally[]>([])
  const [priorsOpen, setPriorsOpen] = useState(false)
  const [formSection, setFormSection] = useState<Pass1SectionId>('serve')
  const [constrainedPlayback, setConstrainedPlayback] = useState({
    enabled: false,
    startTime: 0,
    endTime: 0,
    loopOnEnd: true,
  })

  const clearPointLoop = () => {
    setConstrainedPlayback({
      enabled: false,
      startTime: 0,
      endTime: 0,
      loopOnEnd: true,
    })
  }

  useEffect(() => {
    const init = async () => {
      try {
        const sets = await setDb.getByMatchId(matchId)
        const target = sets.find((s) => s.set_number === setNumber)
        if (!target) {
          alert('Set not found')
          navigate('/matches')
          return
        }
        setSetReady(true)
        const sessionId = `${matchId}-${setNumber}`
        const videoFile = await getVideoFile(sessionId)
        if (videoFile) {
          setVideoUrl(URL.createObjectURL(videoFile))
        }
      } catch (error) {
        console.error('[TagPhase] Failed to init:', error)
        alert('Failed to load set for Tag Phase test')
      }
    }
    init()
  }, [matchId, setNumber, navigate, setVideoUrl])

  const getPlayerName = (id: 'player1' | 'player2') =>
    id === 'player1' ? player1Name : player2Name

  const openServerId = (
    setupComplete
      ? calculateServer({
          firstServerId: setupNextServer,
          player1Score: currentScore.player1,
          player2Score: currentScore.player2,
        }).serverId
      : 'player1'
  ) as 'player1' | 'player2'

  const answers = openRally?.answers ?? emptyPass1Answers()
  const visibility = useMemo(() => deriveVisibility(answers), [answers])
  const sections = useMemo(
    () => visiblePass1Sections(answers, visibility),
    [answers, visibility]
  )
  const canSave = openRally ? canSavePass1(answers, visibility) : false
  const sectionIndex = Math.max(0, sections.indexOf(formSection))
  const activeSection = sections[sectionIndex] ?? 'serve'

  // Keep formSection on a visible chapter when answers change path
  useEffect(() => {
    if (phase !== 'form') return
    if (!sections.includes(formSection)) {
      setFormSection(sections[sections.length - 1] ?? 'serve')
    }
  }, [phase, sections, formSection])

  const patchAnswers = (updater: (prev: Pass1Answers) => Pass1Answers) => {
    setOpenRally((cur) => (cur ? { ...cur, answers: updater(cur.answers) } : cur))
  }

  const handleSetupComplete = (setup: SetupData) => {
    setSetupNextServer(setup.nextServerId)
    setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupComplete(true)
    setPhase('serve')
  }

  const handleServe = () => {
    if (!setupComplete || !setReady || phase !== 'serve') return
    setPendingServeAt(currentTime)
    setPendingEndAt(null)
    setPhase('rally')
    videoPlayerRef.current?.play()
  }

  const handleRallyEnd = () => {
    if (pendingServeAt === null || phase !== 'rally') return
    setPendingEndAt(currentTime)
    setPhase('outcome')
    videoPlayerRef.current?.pause()
  }

  const commitCompletedRally = (
    serveTimestamp: number,
    endTimestamp: number,
    winnerId: WinnerId,
    answers: Pass1Answers
  ) => {
    const scoreAfter = {
      player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
      player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
    }
    setCompleted((prev) => [
      ...prev,
      {
        rallyIndex: prev.length + 1,
        serveTimestamp,
        endTimestamp,
        serverId: openServerId,
        winnerId,
        serverName: getPlayerName(openServerId),
        winnerName: getPlayerName(winnerId),
        answers,
        summary: summarizePass1Line(answers),
      },
    ])
    setCurrentScore(scoreAfter)
  }

  const handleOutcomeChoice = (choice: PointOutcome) => {
    if (pendingServeAt === null || pendingEndAt === null || phase !== 'outcome') return

    if (choice === 'let') {
      clearPointLoop()
      setPendingServeAt(null)
      setPendingEndAt(null)
      setPhase('serve')
      videoPlayerRef.current?.seek(pendingServeAt)
      return
    }

    if (choice === 'service_fault') {
      // Point to receiver
      const winnerId: WinnerId = openServerId === 'player1' ? 'player2' : 'player1'
      const answers: Pass1Answers = { ...emptyPass1Answers(), serviceFault: true }
      commitCompletedRally(pendingServeAt, pendingEndAt, winnerId, answers)
      setPendingServeAt(null)
      setPendingEndAt(null)
      clearPointLoop()
      setPhase('serve')
      videoPlayerRef.current?.seek(pendingEndAt)
      videoPlayerRef.current?.play()
      return
    }

    setOpenRally({
      serveTimestamp: pendingServeAt,
      endTimestamp: pendingEndAt,
      winnerId: choice,
      answers: emptyPass1Answers(),
    })
    setPendingServeAt(null)
    setPendingEndAt(null)
    setFormSection('serve')
    setPhase('form')
    setConstrainedPlayback({
      enabled: true,
      startTime: pendingServeAt,
      endTime: pendingEndAt,
      loopOnEnd: true,
    })
    videoPlayerRef.current?.seek(pendingServeAt)
    videoPlayerRef.current?.play()
  }

  const handleMarkFosResolved = () => {
    patchAnswers((a) => ({ ...a, fosResolvedTimestamp: currentTime }))
  }

  const handleSave = () => {
    if (!openRally || !canSave) return
    commitCompletedRally(
      openRally.serveTimestamp,
      openRally.endTimestamp,
      openRally.winnerId,
      openRally.answers
    )
    setOpenRally(null)
    setFormSection('serve')
    setPhase('serve')
    clearPointLoop()
    videoPlayerRef.current?.seek(openRally.endTimestamp)
    videoPlayerRef.current?.play()
  }

  const handleEndSession = () => {
    if (completed.length === 0 && !openRally) return
    clearPointLoop()
    setOpenRally(null)
    setPhase('complete')
  }

  const passedUpChoices = passedUpOptionsFor(answers.fosTiming)

  if (phase === 'complete') {
    const attacked = completed.filter(
      (r) =>
        r.answers.receiveOutcome === 'attacked_in_play' ||
        r.answers.receiveOutcome === 'failed_attack' ||
        r.answers.fosTiming === 'receiver_2nd'
    ).length
    const noFos = completed.filter(
      (r) =>
        r.answers.receiveOutcome === 'passive_miss' ||
        r.answers.fosTiming === 'no_fos' ||
        r.answers.serviceFault
    ).length
    const missed = completed.filter((r) => r.answers.execution === 'missed').length

    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="p-8 max-w-lg text-center bg-bg-card rounded-lg border border-neutral-700">
          <h2 className="text-2xl font-bold text-neutral-50 mb-2">Pass 1 test complete</h2>
          <p className="text-neutral-400 mb-1">{completed.length} openings tagged</p>
          <p className="text-neutral-500 text-sm mb-6">
            Attacked {attacked} · No FOS {noFos} · Missed FOS {missed}
            <br />
            Nothing saved — UI test only.
          </p>
          <Button variant="secondary" onClick={() => navigate('/matches')}>
            Back to Matches
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col bg-bg-surface overflow-hidden',
        className
      )}
    >
      {/* Compact video */}
      <div className="shrink-0 w-full bg-black max-h-[32vh] flex items-center justify-center">
        <div className="w-full aspect-video max-h-[32vh]">
          <VideoPlayerSection
            ref={videoPlayerRef}
            videoUrl={videoUrl}
            onVideoSelect={setVideoUrl}
            constrainedPlayback={constrainedPlayback}
          />
        </div>
      </div>

      {/* Thin status + transport */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-neutral-200 font-semibold truncate">
            {player1Name} vs {player2Name}
          </span>
          <span className="text-neutral-500">
            {currentScore.player1}–{currentScore.player2}
            {setupComplete && (
              <>
                {' · '}
                <span className={openServerId === 'player1' ? 'text-blue-400' : 'text-orange-400'}>
                  {getPlayerName(openServerId)} serving
                </span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-warning font-semibold">Pass 1</span>
          <Button
            variant="secondary"
            onClick={handleEndSession}
            disabled={completed.length === 0 && !openRally}
            className="h-7 px-2 text-[11px]"
          >
            End
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <VideoControlsBar
          isPlaying={isPlaying}
          onTogglePlay={() => videoPlayerRef.current?.togglePlay()}
          onFrameStepBack={() => videoPlayerRef.current?.stepFrame('backward')}
          onFrameStepForward={() => videoPlayerRef.current?.stepFrame('forward')}
          onRewind={() => videoPlayerRef.current?.seek(Math.max(0, currentTime - 10))}
          onFastForward={() => videoPlayerRef.current?.seek(currentTime + 10)}
        />
      </div>

      {/* Form / capture panel */}
      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {!setupComplete ? (
          <div className="p-3">
            <SetupControlsBlock
              player1Name={player1Name}
              player2Name={player2Name}
              onComplete={handleSetupComplete}
            />
          </div>
        ) : phase === 'serve' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <PriorRallies
              completed={completed}
              open={priorsOpen}
              onToggle={() => setPriorsOpen((o) => !o)}
            />
            <div className="flex-1 flex items-center justify-center p-4">
              <ServeButton onClick={handleServe} disabled={!setReady} />
            </div>
          </div>
        ) : phase === 'rally' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <PriorRallies
              completed={completed}
              open={priorsOpen}
              onToggle={() => setPriorsOpen((o) => !o)}
            />
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
              <p className="text-[12px] text-neutral-500">Watch the point — mark the end when it finishes</p>
              <Button
                variant="primary"
                onClick={handleRallyEnd}
                className="w-full max-w-xs h-14 text-base font-semibold"
              >
                Rally end
              </Button>
            </div>
          </div>
        ) : phase === 'outcome' ? (
          <div className="p-3 space-y-3">
            <p className="text-[13px] font-semibold text-neutral-100 text-center">
              Who won the point?
            </p>
            <ButtonGrid columns={2}>
              <Button
                variant="secondary"
                onClick={() => handleOutcomeChoice('let')}
                className="w-full h-full text-sm font-semibold"
              >
                Let
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleOutcomeChoice('service_fault')}
                className="w-full h-full text-sm font-semibold text-danger border-danger/40"
              >
                Service fault
              </Button>
              <Button
                variant="primary"
                onClick={() => handleOutcomeChoice('player1')}
                className="w-full h-full text-sm font-semibold bg-blue-600 hover:bg-blue-500"
              >
                {player1Name}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleOutcomeChoice('player2')}
                className="w-full h-full text-sm font-semibold bg-orange-600 hover:bg-orange-500"
              >
                {player2Name}
              </Button>
            </ButtonGrid>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-3 space-y-3">
              <PriorRallies
                completed={completed}
                open={priorsOpen}
                onToggle={() => setPriorsOpen((o) => !o)}
              />

              {/* Section progress */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {sections.map((id, i) => {
                  const done = isPass1SectionComplete(id, answers, visibility)
                  const active = id === activeSection
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        // Allow jump back freely; forward only through completed prefixes
                        const targetIdx = sections.indexOf(id)
                        const canJump =
                          targetIdx <= sectionIndex ||
                          sections
                            .slice(0, targetIdx)
                            .every((s) => isPass1SectionComplete(s, answers, visibility))
                        if (canJump) setFormSection(id)
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium border',
                        active
                          ? 'bg-neutral-100 text-neutral-900 border-neutral-100'
                          : done
                            ? 'border-neutral-500 text-neutral-300'
                            : 'border-neutral-700 text-neutral-500'
                      )}
                    >
                      {i + 1}. {PASS1_SECTION_LABEL[id]}
                    </button>
                  )
                })}
              </div>

              {activeSection === 'serve' && (
                <Pass1FormSection>
                  {visibility.showServeBasics && (
                    <>
                      <Pass1Question label="Spin">
                        <ChoicePillRow
                          options={opts(SERVE_SPIN_LABEL)}
                          value={answers.serveSpin}
                          onChange={(serveSpin: ServeSpin) =>
                            patchAnswers((a) => ({ ...a, serveSpin }))
                          }
                        />
                      </Pass1Question>
                      <Pass1Question label="Length">
                        <SegmentedChoice
                          options={opts(SERVE_LENGTH_LABEL)}
                          value={answers.serveLength}
                          onChange={(serveLength: ServeLength) =>
                            patchAnswers((a) => ({ ...a, serveLength }))
                          }
                        />
                      </Pass1Question>
                    </>
                  )}

                  {visibility.showServeFlags && (
                    <Pass1Question
                      label="Serve attributes"
                      hint="Optional · leave empty if normal"
                    >
                      <MultiChoicePillRow
                        options={BALL_FLAG_OPTIONS.map((value) => ({
                          value,
                          label: BALL_FLAG_LABEL[value],
                        }))}
                        values={answers.serveFlags}
                        onToggle={(value: BallFlag) =>
                          patchAnswers((a) => ({
                            ...a,
                            serveFlags: toggleBallFlag(a.serveFlags, value),
                          }))
                        }
                      />
                    </Pass1Question>
                  )}

                  {visibility.showReceiveOutcome && (
                    <Pass1Question label="What did the receiver do?">
                      <ChoicePillRow
                        options={opts(RECEIVE_OUTCOME_LABEL)}
                        value={answers.receiveOutcome}
                        onChange={(receiveOutcome: ReceiveOutcome) => {
                          const nextAnswers = applyReceiveOutcome(answers, receiveOutcome)
                          const nextVis = deriveVisibility(nextAnswers)
                          const nextSections = visiblePass1Sections(nextAnswers, nextVis)
                          patchAnswers(() => nextAnswers)
                          const nextSection = nextSections[1]
                          if (nextSection) setFormSection(nextSection)
                        }}
                      />
                    </Pass1Question>
                  )}
                </Pass1FormSection>
              )}

              {activeSection === 'opening' && (
                <Pass1FormSection>
                  <Pass1Question label="Who attacked first?">
                    <ChoicePillRow
                      options={opts(FOS_TIMING_LABEL, OPENING_FOS_OPTIONS)}
                      value={answers.fosTiming}
                      onChange={(fosTiming: FosTiming) =>
                        patchAnswers((a) => applyFosTimingSideEffects(a, fosTiming))
                      }
                    />
                  </Pass1Question>

                  {visibility.showPassedUp && (
                    <Pass1Question
                      label="Earlier openings passed up?"
                      hint="Optional · tap all that apply"
                    >
                      <MultiChoicePillRow
                        options={passedUpChoices.map((value) => ({
                          value,
                          label: PASSED_UP_LABEL[value],
                        }))}
                        values={answers.passedUp}
                        onToggle={(value: PassedUpTiming) =>
                          patchAnswers((a) => ({
                            ...a,
                            passedUp: togglePassedUp(a.passedUp, value),
                          }))
                        }
                      />
                    </Pass1Question>
                  )}

                  {visibility.showNoFosPointEnd && (
                    <Pass1Question label="How did the point end?">
                      <ChoicePillRow
                        options={opts(NO_FOS_END_LABEL)}
                        value={answers.noFosPointEnd}
                        onChange={(noFosPointEnd: NoFosPointEnd) =>
                          patchAnswers((a) => ({ ...a, noFosPointEnd }))
                        }
                      />
                    </Pass1Question>
                  )}
                </Pass1FormSection>
              )}

              {activeSection === 'shot' && (
                <Pass1FormSection>
                  {visibility.isPassiveMiss ? (
                    <>
                      <p className="text-[11px] text-neutral-500">
                        Passive receive miss — No FOS.
                      </p>
                      <Pass1Question label="Wing">
                        <SegmentedChoice
                          options={[
                            { value: 'fh' as Wing, label: 'Forehand' },
                            { value: 'bh' as Wing, label: 'Backhand' },
                          ]}
                          value={answers.receiveWing}
                          onChange={(receiveWing: Wing) =>
                            patchAnswers((a) => ({ ...a, receiveWing }))
                          }
                        />
                      </Pass1Question>
                      <Pass1Question label="Miss type">
                        <ChoicePillRow
                          options={opts(MISS_TYPE_LABEL)}
                          value={answers.receiveErrorDirection}
                          onChange={(receiveErrorDirection: MissType) =>
                            patchAnswers((a) => ({ ...a, receiveErrorDirection }))
                          }
                        />
                      </Pass1Question>
                    </>
                  ) : (
                    <>
                      {visibility.isFailedAttackReceive && (
                        <p className="text-[11px] text-neutral-500">
                          Attack missed on receive — FOS · 2nd · Missed.
                        </p>
                      )}
                      {visibility.isAttackedInPlay && (
                        <p className="text-[11px] text-neutral-500">
                          Attack on receive into play — FOS · 2nd.
                        </p>
                      )}

                      {visibility.showBallOnShot && (
                        <>
                          {visibility.showIncomingSpinLength && (
                            <>
                              <Pass1Question label="Ball spin">
                                <ChoicePillRow
                                  options={opts(INCOMING_SPIN_LABEL)}
                                  value={answers.incomingSpin}
                                  onChange={(incomingSpin: IncomingSpin) =>
                                    patchAnswers((a) => ({ ...a, incomingSpin }))
                                  }
                                />
                              </Pass1Question>
                              <Pass1Question label="Ball length">
                                <SegmentedChoice
                                  options={opts(INCOMING_LENGTH_LABEL)}
                                  value={answers.incomingLength}
                                  onChange={(incomingLength: IncomingLength) =>
                                    patchAnswers((a) => ({ ...a, incomingLength }))
                                  }
                                />
                              </Pass1Question>
                            </>
                          )}
                          {visibility.showBallFlags && (
                            <Pass1Question
                              label="Ball attributes"
                              hint="Optional · leave empty if normal"
                            >
                              <MultiChoicePillRow
                                options={BALL_FLAG_OPTIONS.map((value) => ({
                                  value,
                                  label: BALL_FLAG_LABEL[value],
                                }))}
                                values={answers.ballFlags}
                                onToggle={(value: BallFlag) =>
                                  patchAnswers((a) => ({
                                    ...a,
                                    ballFlags: toggleBallFlag(a.ballFlags, value),
                                  }))
                                }
                              />
                            </Pass1Question>
                          )}
                        </>
                      )}

                      <Pass1Question label="Wing">
                        <SegmentedChoice
                          options={[
                            { value: 'fh' as Wing, label: 'Forehand' },
                            { value: 'bh' as Wing, label: 'Backhand' },
                          ]}
                          value={answers.fosWing}
                          onChange={(fosWing: Wing) =>
                            patchAnswers((a) => ({ ...a, fosWing }))
                          }
                        />
                      </Pass1Question>
                      <Pass1Question label="Stroke">
                        <ChoicePillRow
                          options={opts(STROKE_LABEL)}
                          value={answers.fosStroke}
                          onChange={(fosStroke: FosStroke) =>
                            patchAnswers((a) => ({ ...a, fosStroke }))
                          }
                        />
                      </Pass1Question>
                      {!visibility.isFailedAttackReceive && (
                        <Pass1Question label="Execution">
                          <ChoicePillRow
                            options={opts(EXECUTION_LABEL)}
                            value={answers.execution}
                            onChange={(execution: ExecutionQuality) =>
                              patchAnswers((a) => ({
                                ...a,
                                execution,
                                missType: execution === 'missed' ? a.missType : null,
                                fosEffect: execution === 'missed' ? null : a.fosEffect,
                                fosResolvedTimestamp:
                                  execution === 'missed' ? null : a.fosResolvedTimestamp,
                              }))
                            }
                          />
                        </Pass1Question>
                      )}

                      {visibility.showMissType && (
                        <Pass1Question label="Miss type">
                          <ChoicePillRow
                            options={opts(MISS_TYPE_LABEL)}
                            value={answers.missType}
                            onChange={(missType: MissType) =>
                              patchAnswers((a) => ({ ...a, missType }))
                            }
                          />
                        </Pass1Question>
                      )}

                      {visibility.showFosEffect && (
                        <Pass1Question label="Outcome">
                          <ChoicePillRow
                            options={opts(FOS_EFFECT_LABEL)}
                            value={answers.fosEffect}
                            onChange={(fosEffect: FosImmediateEffect) =>
                              patchAnswers((a) => ({
                                ...a,
                                fosEffect,
                                fosResolvedTimestamp: null,
                              }))
                            }
                          />
                        </Pass1Question>
                      )}

                      {visibility.needsFosResolvedMark && (
                        <div className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-3 space-y-2">
                          <p className="text-[12px] text-neutral-200">
                            Rally continued past the FOS. Scrub to the moment the first attack
                            (and response) is clear, then mark.
                          </p>
                          <Button
                            variant="primary"
                            onClick={handleMarkFosResolved}
                            className="w-full"
                          >
                            {answers.fosResolvedTimestamp !== null
                              ? `FOS resolved @ ${answers.fosResolvedTimestamp.toFixed(1)}s — tap to update`
                              : 'Mark FOS resolved'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Pass1FormSection>
              )}
            </div>

            {/* Sticky save — section nav is the progress pills */}
            <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 p-3">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full h-11 text-sm font-semibold"
              >
                Save & next rally
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PriorRallies({
  completed,
  open,
  onToggle,
}: {
  completed: CompletedRally[]
  open: boolean
  onToggle: () => void
}) {
  if (completed.length === 0) return null

  return (
    <div className="border border-neutral-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-neutral-400 hover:bg-neutral-800/50"
      >
        <span>{completed.length} tagged</span>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1.5 max-h-28 overflow-y-auto">
          {completed.map((r) => (
            <div key={r.rallyIndex} className="text-[11px] text-neutral-300 leading-snug">
              <span className="text-neutral-500">R{r.rallyIndex}</span> {r.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
