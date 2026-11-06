/**
 * ServeMarkingComposer — Alternative phase: mark serves and who won each rally
 *
 * Separate from Phase 1. Timestamps each serve; when the next serve is marked,
 * pauses and asks who won the previous point (or Let). Saves a rally plus
 * serve shot (index 1) and unnumbered end shot (index 0).
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { SetupControlsBlock, RallyCard, ShotListItem, VideoControlsBar, type SetupData } from '../blocks'
import { PhaseLayoutTemplate } from '../layouts'
import { UserInputSection, VideoPlayerSection, StatusBarSection, RallyListSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { Button, ServeButton } from '@/ui-mine'
import { ButtonGrid } from '../blocks/ButtonGrid'
import { calculateServer } from '@/rules'
import { rallyDb, shotDb, setDb } from '@/data'
import type { NewRally, NewShot } from '@/data'
import { getVideoFile } from '@/helpers/videoStorage'

export interface ServeMarkingComposerProps {
  matchId: string
  setNumber: number
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  className?: string
}

type WinnerChoice = 'player1' | 'player2' | 'let'

interface OpenServe {
  timestamp: number
}

interface CompletedServeRally {
  rallyIndex: number
  serveTimestamp: number
  endTimestamp: number
  serverId: 'player1' | 'player2'
  winnerId: 'player1' | 'player2' | null
  isLet: boolean
  serverName: string
  winnerName: string
}

function buildServeShot(rallyId: string, playerId: string, timestamp: number): NewShot {
  return {
    rally_id: rallyId,
    video_id: null,
    timestamp_start: timestamp,
    timestamp_end: null,
    shot_index: 1,
    player_id: playerId,
    serve_spin_family: null,
    serve_type: null,
    shot_length: null,
    shot_wing: null,
    intent: null,
    shot_result: 'in_play',
    shot_origin: null,
    shot_target: null,
    shot_label: 'serve',
    is_rally_end: false,
    rally_end_role: 'none',
    intent_quality: null,
    pressure_level: null,
    shot_quality: null,
    shot_type: 'serve',
    shot_contact_timing: null,
    player_position: null,
    player_distance: null,
    shot_spin: null,
    shot_speed: null,
    shot_arc: null,
    is_third_ball_attack: false,
    is_receive_attack: false,
    is_tagged: false,
  }
}

function buildEndShot(rallyId: string, boundaryTimestamp: number): NewShot {
  return {
    rally_id: rallyId,
    video_id: null,
    timestamp_start: boundaryTimestamp,
    timestamp_end: null,
    shot_index: 999,
    player_id: '',
    serve_spin_family: null,
    serve_type: null,
    shot_length: null,
    shot_wing: null,
    intent: null,
    shot_result: 'in_play',
    shot_origin: null,
    shot_target: null,
    shot_label: 'rally_shot',
    is_rally_end: true,
    rally_end_role: 'none',
    intent_quality: null,
    pressure_level: null,
    shot_quality: null,
    shot_type: null,
    shot_contact_timing: null,
    player_position: null,
    player_distance: null,
    shot_spin: null,
    shot_speed: null,
    shot_arc: null,
    is_third_ball_attack: false,
    is_receive_attack: false,
    is_tagged: false,
  }
}

export function ServeMarkingComposer({
  matchId,
  setNumber,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  className,
}: ServeMarkingComposerProps) {
  const navigate = useNavigate()
  const currentTime = useVideoPlaybackStore((state) => state.currentTime)
  const videoUrl = useVideoPlaybackStore((state) => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((state) => state.setVideoUrl)
  const isPlaying = useVideoPlaybackStore((state) => state.isPlaying)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const shotLogRef = useRef<HTMLDivElement | null>(null)

  const [setId, setSetId] = useState<string | null>(null)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupNextServer, setSetupNextServer] = useState<'player1' | 'player2'>('player1')
  const [currentScore, setCurrentScore] = useState({ player1: 0, player2: 0 })

  const [openServe, setOpenServe] = useState<OpenServe | null>(null)
  const [completedRallies, setCompletedRallies] = useState<CompletedServeRally[]>([])
  const [awaitingWinner, setAwaitingWinner] = useState(false)
  const [closingFinal, setClosingFinal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Resolve set id and load video
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
        setSetId(target.id)

        const sessionId = `${matchId}-${setNumber}`
        const videoFile = await getVideoFile(sessionId)
        if (videoFile) {
          const blobUrl = URL.createObjectURL(videoFile)
          setVideoUrl(blobUrl)
        }
      } catch (error) {
        console.error('[ServeMarking] Failed to init:', error)
        alert('Failed to load set for serve marking')
      }
    }
    init()
  }, [matchId, setNumber, navigate, setVideoUrl])

  const getPlayerName = (id: 'player1' | 'player2') =>
    id === 'player1' ? player1Name : player2Name

  const handleSetupComplete = (setup: SetupData) => {
    setSetupNextServer(setup.nextServerId)
    setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupComplete(true)
  }

  const saveClosedRally = async (
    winner: WinnerChoice,
    serveTimestamp: number,
    endTimestamp: number
  ): Promise<CompletedServeRally | null> => {
    if (!setId) return null

    const scoreBefore = { ...currentScore }
    const serverResult = calculateServer({
      firstServerId: setupNextServer,
      player1Score: scoreBefore.player1,
      player2Score: scoreBefore.player2,
    })
    const serverId = serverResult.serverId as 'player1' | 'player2'
    const isScoring = winner !== 'let'
    const winnerLocal: 'player1' | 'player2' | null =
      winner === 'let' ? null : winner

    const scoreAfter = isScoring && winnerLocal
      ? {
          player1: winnerLocal === 'player1' ? scoreBefore.player1 + 1 : scoreBefore.player1,
          player2: winnerLocal === 'player2' ? scoreBefore.player2 + 1 : scoreBefore.player2,
        }
      : scoreBefore

    const existing = await rallyDb.getBySetId(setId)
    const tagged = existing.filter((r) => !r.is_stub_rally)
    const maxIndex = tagged.reduce((max, r) => Math.max(max, r.rally_index || 0), 0)
    const rallyIndex = maxIndex + 1

    const serverDbId = serverId === 'player1' ? player1Id : player2Id
    const receiverDbId = serverId === 'player1' ? player2Id : player1Id
    const winnerDbId =
      winnerLocal === 'player1' ? player1Id : winnerLocal === 'player2' ? player2Id : null

    const newRally: NewRally = {
      set_id: setId,
      rally_index: rallyIndex,
      video_id: null,
      has_video_data: true,
      timestamp_start: serveTimestamp,
      timestamp_end: endTimestamp,
      end_of_point_time: endTimestamp,
      server_id: serverDbId,
      receiver_id: receiverDbId,
      is_scoring: isScoring,
      winner_id: winnerDbId,
      player1_score_before: scoreBefore.player1,
      player2_score_before: scoreBefore.player2,
      player1_score_after: scoreAfter.player1,
      player2_score_after: scoreAfter.player2,
      point_end_type: null,
      is_highlight: false,
      framework_confirmed: true,
      detail_complete: false,
      server_corrected: false,
      score_corrected: false,
      correction_notes: null,
      is_stub_rally: false,
    }

    const savedRally = await rallyDb.create(newRally)
    await shotDb.create(buildServeShot(savedRally.id, serverDbId, serveTimestamp))
    await shotDb.create(buildEndShot(savedRally.id, endTimestamp))

    setCurrentScore(scoreAfter)

    return {
      rallyIndex,
      serveTimestamp,
      endTimestamp,
      serverId,
      winnerId: winnerLocal,
      isLet: !isScoring,
      serverName: getPlayerName(serverId),
      winnerName: winnerLocal ? getPlayerName(winnerLocal) : '—',
    }
  }

  const handleServe = () => {
    if (awaitingWinner || isSaving || !setupComplete || openServe) return

    setOpenServe({ timestamp: currentTime })
    setClosingFinal(false)
    setAwaitingWinner(true)
  }

  const handleEnd = () => {
    if (isSaving || !setupComplete) return

    // No open rally — finish the set
    if (!openServe) {
      if (completedRallies.length > 0) setIsComplete(true)
      return
    }

    // Open rally waiting for winner — treat next choice as last rally
    if (awaitingWinner) {
      setClosingFinal(true)
      return
    }

    setClosingFinal(true)
    setAwaitingWinner(true)
  }

  const handleWinnerChoice = async (choice: WinnerChoice) => {
    if (!openServe || isSaving) return

    // Let: discard open serve, no rally written
    if (choice === 'let') {
      setOpenServe(null)
      setAwaitingWinner(false)
      setClosingFinal(false)
      return
    }

    const endTimestamp = currentTime
    setIsSaving(true)
    try {
      const saved = await saveClosedRally(choice, openServe.timestamp, endTimestamp)
      if (saved) {
        setCompletedRallies((prev) => [...prev, saved])
      }

      setOpenServe(null)
      setAwaitingWinner(false)

      if (closingFinal) {
        setClosingFinal(false)
        setIsComplete(true)
      } else {
        setClosingFinal(false)
      }
    } catch (error) {
      console.error('[ServeMarking] Failed to save rally:', error)
      alert('Failed to save rally. Check console for details.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTogglePlay = () => {
    videoPlayerRef.current?.togglePlay()
  }

  const handleRewind = () => {
    videoPlayerRef.current?.seek(Math.max(0, currentTime - 10))
  }

  const handleFastForward = () => {
    videoPlayerRef.current?.seek(currentTime + 10)
  }

  const openServerResult = setupComplete
    ? calculateServer({
        firstServerId: setupNextServer,
        player1Score: currentScore.player1,
        player2Score: currentScore.player2,
      })
    : null
  const openServerId = (openServerResult?.serverId || 'player1') as 'player1' | 'player2'

  if (isComplete) {
    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="p-8 max-w-lg text-center bg-bg-card rounded-lg border border-neutral-700">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-neutral-50 mb-2">Serve Marking Complete</h2>
          <p className="text-neutral-400 mb-6">
            Saved {completedRallies.length} rallies for<br />
            <span className="font-semibold text-neutral-200">
              {player1Name} vs {player2Name}
            </span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/matches')}>
              Back to Matches
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/data-viewer?match=${matchId}`)}
            >
              View Data
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PhaseLayoutTemplate
      shotLogRef={shotLogRef}
      className={className}
      shotLog={
        <RallyListSection
          title="Serve Log"
          emptyMessage={
            completedRallies.length === 0 && !openServe
              ? 'No serves marked yet. Press Serve to begin.'
              : undefined
          }
        >
          {completedRallies.map((rally) => (
            <RallyCard
              key={rally.rallyIndex}
              rallyNumber={rally.rallyIndex}
              serverName={rally.serverName}
              winnerName={rally.winnerName}
              endCondition={rally.isLet ? 'let' : 'winner'}
              serverColor={rally.serverId}
              winnerColor={rally.winnerId || undefined}
            >
              <ShotListItem
                shotNumber={1}
                shotType="serve"
                playerName={rally.serverName}
                timestamp={rally.serveTimestamp}
                playerColor={rally.serverId}
              />
              <ShotListItem
                shotNumber={999}
                shotType="shot"
                playerName="End"
                timestamp={rally.endTimestamp}
                isEnding
              />
            </RallyCard>
          ))}

          {openServe && (
            <RallyCard
              rallyNumber={completedRallies.length + 1}
              serverName={getPlayerName(openServerId)}
              winnerName=""
              endCondition="winner"
              isCurrent
              serverColor={openServerId}
            >
              <ShotListItem
                shotNumber={1}
                shotType="serve"
                playerName={getPlayerName(openServerId)}
                timestamp={openServe.timestamp}
                playerColor={openServerId}
                isActive
              />
            </RallyCard>
          )}
        </RallyListSection>
      }
      videoPlayer={
        <VideoPlayerSection
          ref={videoPlayerRef}
          videoUrl={videoUrl}
          onVideoSelect={setVideoUrl}
        />
      }
      statusBar={
        <StatusBarSection
          items={[
            <div key="rally" className="flex flex-col text-[11px] leading-tight">
              <div className="flex justify-between gap-2">
                <span className="text-neutral-400">Rally</span>
                <span className="text-neutral-200 font-semibold">
                  {openServe ? completedRallies.length + 1 : completedRallies.length || '—'}
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
            <div key="saved" className="flex flex-col items-center text-[11px] leading-tight">
              <span className="text-neutral-400">Saved</span>
              <span className="text-neutral-200 font-semibold">{completedRallies.length}</span>
            </div>,
            <div key="mode" className="flex flex-col items-center justify-center text-[11px]">
              <span className="text-neutral-400">Mode</span>
              <span className="text-neutral-200 font-semibold">Serves</span>
            </div>,
            <Button
              key="end"
              variant="primary"
              onClick={handleEnd}
              disabled={
                !setupComplete ||
                isSaving ||
                (!openServe && completedRallies.length === 0)
              }
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
          onTogglePlay={handleTogglePlay}
          onFrameStepBack={() => videoPlayerRef.current?.stepFrame('backward')}
          onFrameStepForward={() => videoPlayerRef.current?.stepFrame('forward')}
          onRewind={handleRewind}
          onFastForward={handleFastForward}
        />
      }
      userInput={
        <UserInputSection>
          {!setupComplete ? (
            <SetupControlsBlock
              player1Name={player1Name}
              player2Name={player2Name}
              onComplete={handleSetupComplete}
            />
          ) : awaitingWinner ? (
            <ButtonGrid columns={3}>
              <Button
                variant="primary"
                onClick={() => handleWinnerChoice('player1')}
                disabled={isSaving}
                className="w-full h-full text-sm font-semibold bg-blue-600 hover:bg-blue-500"
              >
                {player1Name}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleWinnerChoice('player2')}
                disabled={isSaving}
                className="w-full h-full text-sm font-semibold bg-orange-600 hover:bg-orange-500"
              >
                {player2Name}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleWinnerChoice('let')}
                disabled={isSaving}
                className="w-full h-full text-sm font-semibold"
              >
                Let
              </Button>
            </ButtonGrid>
          ) : (
            <div className="flex items-center justify-center gap-0.5 p-0.5 h-[72px]">
              <ServeButton onClick={handleServe} disabled={isSaving || !setId} />
            </div>
          )}
        </UserInputSection>
      }
    />
  )
}
