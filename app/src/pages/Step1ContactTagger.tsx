import { useEffect, useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Settings, FastForward, Play } from 'lucide-react'
import { useTaggingStore } from '../stores/taggingStore'
import { VideoPlayer, type VideoPlayerHandle } from '../components/tagging/VideoPlayer'
import { Timeline, ScoreDisplay } from '../components/tagging'
import { Button, Card, Badge } from '../components/ui'
import { cn } from '../lib/utils'

type TaggingSpeed = 0.5 | 0.75 | 1
type FastForwardSpeed = 1 | 2 | 4

export function Step1ContactTagger() {
  const navigate = useNavigate()
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  
  const {
    matchId,
    videoUrl,
    setVideoUrl,
    addContact,
    undoLastContact,
    setPlaybackSpeed,
    playbackSpeed,
    rallies,
    currentRallyContacts,
  } = useTaggingStore()

  // Local state for tagging workflow
  const [taggingSpeed, setTaggingSpeed] = useState<TaggingSpeed>(0.75)
  const [fastForwardSpeed, setFastForwardSpeed] = useState<FastForwardSpeed>(2)
  const [isFastForwarding, setIsFastForwarding] = useState(false)
  const [currentFFSpeed, setCurrentFFSpeed] = useState<1 | 2 | 4>(2)

  // Auto-initialize a match if none exists (dev convenience)
  useEffect(() => {
    if (!matchId) {
      const { initMatch } = useTaggingStore.getState()
      initMatch('Player 1', 'Player 2', 'player1', null)
    }
  }, [matchId])

  // Sync playback speed with store
  useEffect(() => {
    if (isFastForwarding) {
      setPlaybackSpeed(currentFFSpeed)
    } else {
      setPlaybackSpeed(taggingSpeed)
    }
  }, [isFastForwarding, currentFFSpeed, taggingSpeed, setPlaybackSpeed])

  // End rally and start fast forward
  const endRallyAndFastForward = useCallback(() => {
    if (currentRallyContacts.length === 0) return
    
    // End the rally (without winner - will be set in review)
    const { endRallyWithoutWinner } = useTaggingStore.getState()
    endRallyWithoutWinner()
    
    // Start fast forwarding
    setIsFastForwarding(true)
    setCurrentFFSpeed(fastForwardSpeed)
    videoPlayerRef.current?.play()
  }, [currentRallyContacts.length, fastForwardSpeed])

  // Increase fast forward speed
  const increaseFastForward = useCallback(() => {
    if (!isFastForwarding) return
    
    if (currentFFSpeed === 1) {
      setCurrentFFSpeed(2)
    } else if (currentFFSpeed === 2) {
      setCurrentFFSpeed(4)
    }
    // Already at 4, do nothing
  }, [isFastForwarding, currentFFSpeed])

  // Decrease speed
  const decreaseSpeed = useCallback(() => {
    if (isFastForwarding) {
      if (currentFFSpeed === 4) {
        setCurrentFFSpeed(2)
      } else if (currentFFSpeed === 2) {
        setCurrentFFSpeed(1)
      } else {
        // At 1x, exit fast forward
        setIsFastForwarding(false)
      }
    }
  }, [isFastForwarding, currentFFSpeed])

  // Mark contact (or start new rally if fast forwarding)
  const handleSpacePress = useCallback(() => {
    if (isFastForwarding) {
      // Exit fast forward and start new rally with serve
      setIsFastForwarding(false)
      addContact() // This becomes the serve for the new rally
    } else {
      // Normal contact tagging
      addContact()
    }
  }, [isFastForwarding, addContact])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case ' ': // Space = Contact / Start new rally
        e.preventDefault()
        handleSpacePress()
        break
      case 'ArrowRight': // → = End rally + fast forward OR increase FF speed
        e.preventDefault()
        if (isFastForwarding) {
          increaseFastForward()
        } else if (currentRallyContacts.length > 0) {
          endRallyAndFastForward()
        }
        break
      case 'ArrowLeft': // ← = Slow down
        e.preventDefault()
        decreaseSpeed()
        break
      case 'k':
      case 'K': // K = Play/Pause
        e.preventDefault()
        const store = useTaggingStore.getState()
        store.setIsPlaying(!store.isPlaying)
        break
      case 'z':
      case 'Z': // Ctrl+Z = Undo
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          undoLastContact()
        }
        break
    }
  }, [handleSpacePress, isFastForwarding, increaseFastForward, decreaseSpeed, endRallyAndFastForward, undoLastContact, currentRallyContacts.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const totalContacts = rallies.reduce((sum, r) => sum + r.contacts.length, 0) + currentRallyContacts.length
  const canComplete = rallies.length > 0 && currentRallyContacts.length === 0

  if (!matchId) {
    return null
  }

  return (
    <div className="h-screen bg-bg-app flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-bg-surface flex items-center justify-between px-4 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/matches/new')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-neutral-50">Step 1: Contact Tagging</h1>
            <p className="text-xs text-neutral-400">
              {rallies.length} rallies • {totalContacts} contacts
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" disabled={!canComplete} onClick={() => navigate('/matches/new/review')}>
          <Check className="h-4 w-4 mr-1" />
          Review & Complete
        </Button>
      </header>

      {/* Keyboard hints */}
      <div className="bg-bg-card border-b border-neutral-700 px-4 py-1.5 shrink-0">
        <p className="text-xs text-neutral-500 text-center">
          <span className="px-2">Space Contact/Serve</span>
          <span className="px-2">→ End Rally + Fast Forward</span>
          <span className="px-2">← Slow Down</span>
          <span className="px-2">K Play/Pause</span>
          <span className="px-2">Ctrl+Z Undo</span>
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Video and Timeline */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Video Player - constrained height */}
          <div className="h-[50vh] max-h-[400px] shrink-0">
            <VideoPlayer 
              ref={videoPlayerRef}
              videoSrc={videoUrl || undefined} 
              onVideoSelect={(url) => setVideoUrl(url)}
            />
          </div>

          {/* Timeline */}
          <div className="shrink-0">
            <Timeline />
          </div>

          {/* Score Display */}
          <div className="shrink-0">
            <ScoreDisplay />
          </div>

          {/* Current status */}
          <div className="flex-1 flex items-center justify-center">
            {isFastForwarding ? (
              <div className="text-center">
                <FastForward className="h-12 w-12 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold text-warning">{currentFFSpeed}x Fast Forward</p>
                <p className="text-sm text-neutral-400 mt-1">Press Space to mark serve</p>
              </div>
            ) : currentRallyContacts.length > 0 ? (
              <div className="text-center">
                <Badge variant="primary" className="text-lg px-4 py-2">
                  Rally in progress: {currentRallyContacts.length} shot{currentRallyContacts.length !== 1 ? 's' : ''}
                </Badge>
                <p className="text-sm text-neutral-400 mt-2">Press → to end rally</p>
              </div>
            ) : (
              <div className="text-center">
                <Play className="h-12 w-12 text-brand-primary mx-auto mb-2" />
                <p className="text-lg text-neutral-300">Press Space to mark serve</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings sidebar */}
        <aside className="w-64 bg-bg-shell border-l border-neutral-700 p-4 shrink-0 overflow-y-auto">
          <h3 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tagging Settings
          </h3>

          {/* Tagging Speed */}
          <Card className="p-3 mb-4">
            <label className="text-xs text-neutral-400 block mb-2">Tagging Speed</label>
            <div className="flex gap-1">
              {([0.5, 0.75, 1] as TaggingSpeed[]).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setTaggingSpeed(speed)}
                  className={cn(
                    "flex-1 py-2 rounded text-sm font-medium transition-colors",
                    taggingSpeed === speed
                      ? "bg-brand-primary text-white"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">Speed during tagging</p>
          </Card>

          {/* Fast Forward Speed */}
          <Card className="p-3 mb-4">
            <label className="text-xs text-neutral-400 block mb-2">Fast Forward Speed</label>
            <div className="flex gap-1">
              {([1, 2, 4] as FastForwardSpeed[]).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setFastForwardSpeed(speed)}
                  className={cn(
                    "flex-1 py-2 rounded text-sm font-medium transition-colors",
                    fastForwardSpeed === speed
                      ? "bg-warning text-black"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">Initial speed after rally</p>
          </Card>

          {/* Current Speed Display */}
          <Card className="p-3">
            <label className="text-xs text-neutral-400 block mb-2">Current Speed</label>
            <div className={cn(
              "text-3xl font-bold text-center py-2",
              isFastForwarding ? "text-warning" : "text-brand-primary"
            )}>
              {playbackSpeed}x
            </div>
            <p className="text-xs text-neutral-500 text-center">
              {isFastForwarding ? "Fast forwarding" : "Tagging mode"}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
