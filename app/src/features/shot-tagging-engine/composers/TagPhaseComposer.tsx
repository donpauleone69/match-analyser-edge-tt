/**
 * TagPhaseComposer — UI-only Opening Test
 *
 * Serve + winner → loop rally → track serve until first open (or ball 5).
 * In-memory only — no DB writes.
 *
 * Funnel: serve length → serve spin → receive wing → receive push|open
 *         → if push: 3rd/4th/5th push|open until open or ball 5.
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { SetupControlsBlock, RallyCard, VideoControlsBar, type SetupData } from '../blocks'
import { PhaseLayoutTemplate } from '../layouts'
import { UserInputSection, VideoPlayerSection, StatusBarSection, RallyListSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { Button, ServeButton } from '@/ui-mine'
import { ButtonGrid } from '../blocks/ButtonGrid'
import { calculateServer } from '@/rules'
import { setDb } from '@/data'
import { getVideoFile } from '@/helpers/videoStorage'

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
type ServeLength = 'short' | 'halflong' | 'deep'
type ServeSpin = 'underspin' | 'nospin' | 'topspin'
type Wing = 'fh' | 'bh'
type BallChoice = 'push' | 'open'

type Step =
  | 'serve'
  | 'winner'
  | 'serveLength'
  | 'serveSpin'
  | 'receiveWing'
  | 'receiveChoice'
  | 'ball3'
  | 'ball4'
  | 'ball5'

interface OpenRally {
  serveTimestamp: number
  endTimestamp: number | null
  winnerId: WinnerId | null
  serveLength: ServeLength | null
  serveSpin: ServeSpin | null
  receiveWing: Wing | null
  /** Choices for balls 2–5; stops when open or after ball 5 */
  ballChoices: BallChoice[]
  openedOnBall: 2 | 3 | 4 | 5 | null
}

interface CompletedOpeningRally {
  rallyIndex: number
  serveTimestamp: number
  endTimestamp: number
  serverId: 'player1' | 'player2'
  winnerId: WinnerId
  serverName: string
  winnerName: string
  serveLength: ServeLength
  serveSpin: ServeSpin
  receiveWing: Wing
  ballChoices: BallChoice[]
  openedOnBall: 2 | 3 | 4 | 5 | null
}

const LENGTH_LABEL: Record<ServeLength, string> = {
  short: 'Short',
  halflong: 'Half-long',
  deep: 'Deep',
}

const SPIN_LABEL: Record<ServeSpin, string> = {
  underspin: 'Underspin',
  nospin: 'No spin',
  topspin: 'Topspin',
}

const WING_LABEL: Record<Wing, string> = { fh: 'FH', bh: 'BH' }

const QUESTION_TEXT: Partial<Record<Step, string>> = {
  serveLength: 'Serve length?',
  serveSpin: 'Serve spin?',
  receiveWing: 'Receive wing?',
  receiveChoice: 'Receive: push or open?',
  ball3: '3rd ball: push or open?',
  ball4: '4th ball: push or open?',
  ball5: '5th ball: push or open?',
}

function QuestionShell({
  children,
  onBack,
}: {
  children: ReactNode
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5 p-0.5">
      {children}
      <Button variant="secondary" onClick={onBack} className="h-7 text-[11px]">
        Back
      </Button>
    </div>
  )
}

function formatPath(choices: BallChoice[], openedOnBall: 2 | 3 | 4 | 5 | null): string {
  const parts = choices.map((c, i) => `${i + 2}:${c === 'open' ? 'Open' : 'Push'}`)
  if (openedOnBall) return parts.join(' → ')
  if (choices.length >= 4) return `${parts.join(' → ')} (no open by 5)`
  return parts.join(' → ')
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
  const shotLogRef = useRef<HTMLDivElement | null>(null)

  const [setReady, setSetReady] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupNextServer, setSetupNextServer] = useState<'player1' | 'player2'>('player1')
  const [currentScore, setCurrentScore] = useState({ player1: 0, player2: 0 })

  const [step, setStep] = useState<Step>('serve')
  const [openRally, setOpenRally] = useState<OpenRally | null>(null)
  const [completedRallies, setCompletedRallies] = useState<CompletedOpeningRally[]>([])
  const [isComplete, setIsComplete] = useState(false)
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
          const blobUrl = URL.createObjectURL(videoFile)
          setVideoUrl(blobUrl)
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

  const openServerResult = setupComplete
    ? calculateServer({
        firstServerId: setupNextServer,
        player1Score: currentScore.player1,
        player2Score: currentScore.player2,
      })
    : null
  const openServerId = (openServerResult?.serverId || 'player1') as 'player1' | 'player2'

  const handleSetupComplete = (setup: SetupData) => {
    setSetupNextServer(setup.nextServerId)
    setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupComplete(true)
  }

  const commitRally = (draft: OpenRally) => {
    if (
      !draft.winnerId ||
      draft.endTimestamp === null ||
      !draft.serveLength ||
      !draft.serveSpin ||
      !draft.receiveWing ||
      draft.ballChoices.length === 0
    ) {
      return
    }

    const winnerId = draft.winnerId
    const scoreAfter = {
      player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
      player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
    }

    setCompletedRallies((prev) => [
      ...prev,
      {
        rallyIndex: prev.length + 1,
        serveTimestamp: draft.serveTimestamp,
        endTimestamp: draft.endTimestamp!,
        serverId: openServerId,
        winnerId,
        serverName: getPlayerName(openServerId),
        winnerName: getPlayerName(winnerId),
        serveLength: draft.serveLength!,
        serveSpin: draft.serveSpin!,
        receiveWing: draft.receiveWing!,
        ballChoices: draft.ballChoices,
        openedOnBall: draft.openedOnBall,
      },
    ])
    setCurrentScore(scoreAfter)
    setOpenRally(null)
    setStep('serve')
    clearPointLoop()
    videoPlayerRef.current?.seek(draft.endTimestamp)
    videoPlayerRef.current?.play()
  }

  const handleServe = () => {
    if (!setupComplete || !setReady || openRally || step !== 'serve') return
    setOpenRally({
      serveTimestamp: currentTime,
      endTimestamp: null,
      winnerId: null,
      serveLength: null,
      serveSpin: null,
      receiveWing: null,
      ballChoices: [],
      openedOnBall: null,
    })
    setStep('winner')
  }

  const handleWinnerChoice = (choice: WinnerId | 'let') => {
    if (!openRally || step !== 'winner') return

    if (choice === 'let') {
      clearPointLoop()
      setOpenRally(null)
      setStep('serve')
      return
    }

    const endTimestamp = currentTime
    setOpenRally({
      ...openRally,
      endTimestamp,
      winnerId: choice,
    })
    setStep('serveLength')
    setConstrainedPlayback({
      enabled: true,
      startTime: openRally.serveTimestamp,
      endTime: endTimestamp,
      loopOnEnd: true,
    })
    videoPlayerRef.current?.seek(openRally.serveTimestamp)
    videoPlayerRef.current?.play()
  }

  const handleServeLength = (serveLength: ServeLength) => {
    if (!openRally || step !== 'serveLength') return
    setOpenRally({ ...openRally, serveLength })
    setStep('serveSpin')
  }

  const handleServeSpin = (serveSpin: ServeSpin) => {
    if (!openRally || step !== 'serveSpin') return
    setOpenRally({ ...openRally, serveSpin })
    setStep('receiveWing')
  }

  const handleReceiveWing = (receiveWing: Wing) => {
    if (!openRally || step !== 'receiveWing') return
    setOpenRally({ ...openRally, receiveWing })
    setStep('receiveChoice')
  }

  const handleBallChoice = (choice: BallChoice) => {
    if (!openRally) return
    if (
      step !== 'receiveChoice' &&
      step !== 'ball3' &&
      step !== 'ball4' &&
      step !== 'ball5'
    ) {
      return
    }

    const ballNumber = (openRally.ballChoices.length + 2) as 2 | 3 | 4 | 5
    const ballChoices = [...openRally.ballChoices, choice]

    if (choice === 'open') {
      commitRally({
        ...openRally,
        ballChoices,
        openedOnBall: ballNumber,
      })
      return
    }

    // Push — continue or stop at 5
    if (ballNumber >= 5) {
      commitRally({
        ...openRally,
        ballChoices,
        openedOnBall: null,
      })
      return
    }

    const nextStep: Step =
      ballNumber === 2 ? 'ball3' : ballNumber === 3 ? 'ball4' : 'ball5'

    setOpenRally({
      ...openRally,
      ballChoices,
      openedOnBall: null,
    })
    setStep(nextStep)
  }

  const handleBack = () => {
    if (!openRally) return

    if (step === 'serveLength') {
      const resumeAt = openRally.endTimestamp
      clearPointLoop()
      setOpenRally({
        serveTimestamp: openRally.serveTimestamp,
        endTimestamp: null,
        winnerId: null,
        serveLength: null,
        serveSpin: null,
        receiveWing: null,
        ballChoices: [],
        openedOnBall: null,
      })
      setStep('winner')
      if (resumeAt !== null) videoPlayerRef.current?.seek(resumeAt)
      videoPlayerRef.current?.play()
      return
    }

    if (step === 'serveSpin') {
      setOpenRally({ ...openRally, serveLength: null })
      setStep('serveLength')
      return
    }

    if (step === 'receiveWing') {
      setOpenRally({ ...openRally, serveSpin: null })
      setStep('serveSpin')
      return
    }

    if (step === 'receiveChoice') {
      setOpenRally({ ...openRally, receiveWing: null })
      setStep('receiveWing')
      return
    }

    if (step === 'ball3') {
      setOpenRally({ ...openRally, ballChoices: openRally.ballChoices.slice(0, -1) })
      setStep('receiveChoice')
      return
    }

    if (step === 'ball4') {
      setOpenRally({ ...openRally, ballChoices: openRally.ballChoices.slice(0, -1) })
      setStep('ball3')
      return
    }

    if (step === 'ball5') {
      setOpenRally({ ...openRally, ballChoices: openRally.ballChoices.slice(0, -1) })
      setStep('ball4')
    }
  }

  const handleEnd = () => {
    if (!setupComplete) return
    if (completedRallies.length === 0 && !openRally) return
    clearPointLoop()
    setOpenRally(null)
    setStep('serve')
    setIsComplete(true)
  }

  const isQuestionStep = step !== 'serve' && step !== 'winner'
  const questionText = QUESTION_TEXT[step]

  if (isComplete) {
    const openedCount = completedRallies.filter((r) => r.openedOnBall !== null).length
    const receiveOpen = completedRallies.filter((r) => r.openedOnBall === 2).length
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="p-8 max-w-lg text-center bg-bg-card rounded-lg border border-neutral-700">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-neutral-50 mb-2">Opening Test Complete</h2>
          <p className="text-neutral-400 mb-2">
            {completedRallies.length} rallies · {openedCount} opened by ball 5<br />
            <span className="text-neutral-500 text-sm">
              Receive attacked: {receiveOpen} / {completedRallies.length}
            </span>
          </p>
          <p className="text-neutral-500 text-sm mb-6">Nothing was saved — UI test only.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/matches')}>
              Back to Matches
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderPushOpen = (onPick: (c: BallChoice) => void) => (
    <QuestionShell onBack={handleBack}>
      <ButtonGrid columns={2}>
        <Button
          variant="primary"
          onClick={() => onPick('push')}
          className="w-full h-full text-sm font-semibold"
        >
          Push
        </Button>
        <Button
          variant="primary"
          onClick={() => onPick('open')}
          className="w-full h-full text-sm font-semibold"
        >
          Open
        </Button>
      </ButtonGrid>
    </QuestionShell>
  )

  const renderAnswers = () => {
    if (!setupComplete) {
      return (
        <SetupControlsBlock
          player1Name={player1Name}
          player2Name={player2Name}
          onComplete={handleSetupComplete}
        />
      )
    }

    if (step === 'serve') {
      return (
        <div className="flex items-center justify-center gap-0.5 p-0.5 h-[72px]">
          <ServeButton onClick={handleServe} disabled={!setReady} />
        </div>
      )
    }

    if (step === 'winner') {
      return (
        <ButtonGrid columns={3}>
          <Button
            variant="primary"
            onClick={() => handleWinnerChoice('player1')}
            className="w-full h-full text-sm font-semibold bg-blue-600 hover:bg-blue-500"
          >
            {player1Name}
          </Button>
          <Button
            variant="primary"
            onClick={() => handleWinnerChoice('player2')}
            className="w-full h-full text-sm font-semibold bg-orange-600 hover:bg-orange-500"
          >
            {player2Name}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleWinnerChoice('let')}
            className="w-full h-full text-sm font-semibold"
          >
            Let
          </Button>
        </ButtonGrid>
      )
    }

    if (step === 'serveLength') {
      return (
        <QuestionShell onBack={handleBack}>
          <ButtonGrid columns={3}>
            <Button
              variant="primary"
              onClick={() => handleServeLength('short')}
              className="w-full h-full text-sm font-semibold"
            >
              Short
            </Button>
            <Button
              variant="primary"
              onClick={() => handleServeLength('halflong')}
              className="w-full h-full text-sm font-semibold"
            >
              Half-long
            </Button>
            <Button
              variant="primary"
              onClick={() => handleServeLength('deep')}
              className="w-full h-full text-sm font-semibold"
            >
              Deep
            </Button>
          </ButtonGrid>
        </QuestionShell>
      )
    }

    if (step === 'serveSpin') {
      return (
        <QuestionShell onBack={handleBack}>
          <ButtonGrid columns={3}>
            <Button
              variant="primary"
              onClick={() => handleServeSpin('underspin')}
              className="w-full h-full text-sm font-semibold"
            >
              Underspin
            </Button>
            <Button
              variant="primary"
              onClick={() => handleServeSpin('nospin')}
              className="w-full h-full text-sm font-semibold"
            >
              No spin
            </Button>
            <Button
              variant="primary"
              onClick={() => handleServeSpin('topspin')}
              className="w-full h-full text-sm font-semibold"
            >
              Topspin
            </Button>
          </ButtonGrid>
        </QuestionShell>
      )
    }

    if (step === 'receiveWing') {
      return (
        <QuestionShell onBack={handleBack}>
          <ButtonGrid columns={2}>
            <Button
              variant="primary"
              onClick={() => handleReceiveWing('fh')}
              className="w-full h-full text-sm font-semibold"
            >
              FH
            </Button>
            <Button
              variant="primary"
              onClick={() => handleReceiveWing('bh')}
              className="w-full h-full text-sm font-semibold"
            >
              BH
            </Button>
          </ButtonGrid>
        </QuestionShell>
      )
    }

    if (
      step === 'receiveChoice' ||
      step === 'ball3' ||
      step === 'ball4' ||
      step === 'ball5'
    ) {
      return renderPushOpen(handleBallChoice)
    }

    return null
  }

  return (
    <PhaseLayoutTemplate
      shotLogRef={shotLogRef}
      className={className}
      shotLog={
        <RallyListSection
          title="Opening Log"
          emptyMessage={
            completedRallies.length === 0 && !openRally
              ? 'No rallies yet. Press Serve to begin.'
              : undefined
          }
        >
          {completedRallies.map((rally) => (
            <RallyCard
              key={rally.rallyIndex}
              rallyNumber={rally.rallyIndex}
              serverName={rally.serverName}
              winnerName={rally.winnerName}
              endCondition="winner"
              serverColor={rally.serverId}
              winnerColor={rally.winnerId}
            >
              <div className="text-[11px] text-neutral-300 space-y-0.5">
                <div>
                  Serve: {LENGTH_LABEL[rally.serveLength]} · {SPIN_LABEL[rally.serveSpin]}
                </div>
                <div>
                  Rec: {WING_LABEL[rally.receiveWing]} ·{' '}
                  {formatPath(rally.ballChoices, rally.openedOnBall)}
                </div>
                <div className="text-neutral-400">
                  {rally.openedOnBall
                    ? `Opened on ball ${rally.openedOnBall}`
                    : 'No open by ball 5'}
                </div>
              </div>
            </RallyCard>
          ))}

          {openRally && (
            <RallyCard
              rallyNumber={completedRallies.length + 1}
              serverName={getPlayerName(openServerId)}
              winnerName={openRally.winnerId ? getPlayerName(openRally.winnerId) : ''}
              endCondition="winner"
              isCurrent
              serverColor={openServerId}
              winnerColor={openRally.winnerId || undefined}
            >
              <div className="text-[11px] text-neutral-400">
                {step === 'winner' && 'Awaiting winner…'}
                {isQuestionStep && (questionText || 'Answering…')}
                {openRally.ballChoices.length > 0 && (
                  <div className="mt-0.5 text-neutral-500">
                    {formatPath(openRally.ballChoices, null)}
                  </div>
                )}
              </div>
            </RallyCard>
          )}
        </RallyListSection>
      }
      videoPlayer={
        <VideoPlayerSection
          ref={videoPlayerRef}
          videoUrl={videoUrl}
          onVideoSelect={setVideoUrl}
          constrainedPlayback={constrainedPlayback}
        />
      }
      statusBar={
        <StatusBarSection
          items={[
            <div key="rally" className="flex flex-col text-[11px] leading-tight">
              <div className="flex justify-between gap-2">
                <span className="text-neutral-400">Rally</span>
                <span className="text-neutral-200 font-semibold">
                  {openRally ? completedRallies.length + 1 : completedRallies.length || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-neutral-400">Server</span>
                <span
                  className={cn(
                    'font-semibold',
                    openServerId === 'player1' ? 'text-blue-400' : 'text-orange-400'
                  )}
                >
                  {setupComplete ? getPlayerName(openServerId) : '—'}
                </span>
              </div>
            </div>,
            <div key="scores" className="flex flex-col text-[11px] leading-tight">
              <div className="flex justify-between gap-2">
                <span className="text-blue-400 font-medium">{player1Name}</span>
                <span className="text-success font-bold">{currentScore.player1}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-orange-400 font-medium">{player2Name}</span>
                <span className="text-success font-bold">{currentScore.player2}</span>
              </div>
            </div>,
            isQuestionStep ? (
              <div
                key="question"
                className="flex flex-col items-center justify-center text-[11px] leading-tight px-1"
              >
                <span className="text-brand-primary font-semibold text-center">
                  {questionText}
                </span>
              </div>
            ) : (
              <div key="logged" className="flex flex-col items-center text-[11px] leading-tight">
                <span className="text-neutral-400">Logged</span>
                <span className="text-neutral-200 font-semibold">{completedRallies.length}</span>
              </div>
            ),
            <div key="mode" className="flex flex-col items-center justify-center text-[11px]">
              <span className="text-warning font-semibold">Opening test</span>
            </div>,
            <Button
              key="end"
              variant="primary"
              onClick={handleEnd}
              disabled={!setupComplete || (completedRallies.length === 0 && !openRally)}
              className="h-8 px-3 text-[11px] font-medium"
            >
              End
            </Button>,
          ]}
        />
      }
      videoControls={
        <VideoControlsBar
          isPlaying={isPlaying}
          onTogglePlay={() => videoPlayerRef.current?.togglePlay()}
          onFrameStepBack={() => videoPlayerRef.current?.stepFrame('backward')}
          onFrameStepForward={() => videoPlayerRef.current?.stepFrame('forward')}
          onRewind={() => videoPlayerRef.current?.seek(Math.max(0, currentTime - 10))}
          onFastForward={() => videoPlayerRef.current?.seek(currentTime + 10)}
        />
      }
      userInput={<UserInputSection>{renderAnswers()}</UserInputSection>}
    />
  )
}
