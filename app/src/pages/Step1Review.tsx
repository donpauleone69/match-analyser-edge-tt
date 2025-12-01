import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertTriangle, Upload, Trash2, Plus, Film, Star } from 'lucide-react'
import { useTaggingStore } from '../stores/taggingStore'
import { Button, Card, Badge } from '../components/ui'
import { VideoPlayer, type VideoPlayerHandle, type ConstrainedPlayback } from '../components/tagging/VideoPlayer'
import { VideoExportPanel } from '../components/export'
import { formatTime, cn } from '../lib/utils'

type SelectionType = 
  | { type: 'server'; rallyId: string }
  | { type: 'contact'; rallyId: string; contactId: string }
  | { type: 'winner'; rallyId: string }

export function Step1Review() {
  const navigate = useNavigate()
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  
  const {
    matchId,
    videoUrl,
    setVideoUrl,
    rallies,
    player1Name,
    player2Name,
    currentRallyContacts,
    updateContactTime,
    updateRallyServer,
    updateRallyWinner,
    updateWinnerTime,
    deleteContact,
    addContactToRally,
    toggleRallyHighlight,
    insertRallyAtTime,
    completeStep1,
  } = useTaggingStore()

  const [selection, setSelection] = useState<SelectionType | null>(null)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [showExportPanel, setShowExportPanel] = useState(false)

  // Auto-scroll to selected item in timeline
  useEffect(() => {
    if (!selection) return
    
    // Build a unique selector for the selected element
    let selector = ''
    if (selection.type === 'server') {
      selector = `[data-rally-id="${selection.rallyId}"][data-type="server"]`
    } else if (selection.type === 'contact') {
      selector = `[data-contact-id="${selection.contactId}"]`
    } else if (selection.type === 'winner') {
      selector = `[data-rally-id="${selection.rallyId}"][data-type="winner"]`
    }
    
    const element = timelineScrollRef.current?.querySelector(selector)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selection])

  // Effective video source
  const effectiveVideoUrl = videoUrl || localVideoUrl

  // Handle video file selection
  const handleVideoSelect = (url: string) => {
    setLocalVideoUrl(url)
    setVideoUrl(url)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl)
      }
    }
  }, [localVideoUrl])

  // Redirect if no match
  useEffect(() => {
    if (!matchId) {
      navigate('/matches/new/step1')
    }
  }, [matchId, navigate])

  // Build flat navigation list (Server → Shots → Winner)
  const navItems: SelectionType[] = useMemo(() => {
    const items: SelectionType[] = []
    rallies.forEach(rally => {
      items.push({ type: 'server', rallyId: rally.id })
      rally.contacts.forEach(contact => {
        items.push({ type: 'contact', rallyId: rally.id, contactId: contact.id })
      })
      if (rally.isScoring) {
        items.push({ type: 'winner', rallyId: rally.id })
      }
    })
    return items
  }, [rallies])

  // Find current selection index
  const currentIndex = selection ? navItems.findIndex(item => {
    if (selection.type === 'server' && item.type === 'server') {
      return item.rallyId === selection.rallyId
    }
    if (selection.type === 'contact' && item.type === 'contact') {
      return item.rallyId === selection.rallyId && item.contactId === selection.contactId
    }
    if (selection.type === 'winner' && item.type === 'winner') {
      return item.rallyId === selection.rallyId
    }
    return false
  }) : -1

  // Get selected rally and contact data
  const selectedRally = selection ? rallies.find(r => r.id === selection.rallyId) : null
  const selectedContactData = selection?.type === 'contact'
    ? selectedRally?.contacts.find(c => c.id === selection.contactId)
    : null

  // Calculate constrained playback bounds based on selection
  const constrainedPlayback: ConstrainedPlayback | undefined = useMemo(() => {
    if (!selection || !selectedRally) return undefined

    if (selection.type === 'contact' && selectedContactData) {
      const contactIndex = selectedRally.contacts.findIndex(c => c.id === selectedContactData.id)
      const nextContact = selectedRally.contacts[contactIndex + 1]
      
      // End time is either next contact's time or winner time
      const endTime = nextContact 
        ? nextContact.time - (1/30) // Stop 1 frame before next shot
        : (selectedRally.winnerTime ?? selectedContactData.time + 2)

      return {
        enabled: true,
        startTime: selectedContactData.time,
        endTime,
        loopOnEnd: true, // Loop the shot clip
      }
    }

    if (selection.type === 'winner') {
      // Winner is just a still frame - defines end point, no playback
      return undefined // No constrained playback, just a still frame
    }

    return undefined
  }, [selection, selectedRally, selectedContactData])

  // Get current display time based on selection
  const getDisplayTime = () => {
    if (!selection || !selectedRally) return 0
    if (selection.type === 'contact' && selectedContactData) {
      return selectedContactData.time
    }
    if (selection.type === 'winner') {
      return selectedRally.winnerTime || (selectedRally.contacts[selectedRally.contacts.length - 1]?.time || 0)
    }
    return 0
  }

  // Navigate selection
  const navigateSelection = useCallback((direction: 'up' | 'down') => {
    if (navItems.length === 0) return
    
    let newIndex: number
    if (currentIndex === -1) {
      newIndex = direction === 'down' ? 0 : navItems.length - 1
    } else {
      newIndex = direction === 'up' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(navItems.length - 1, currentIndex + 1)
    }
    
    const newSelection = navItems[newIndex]
    setSelection(newSelection)
    
    // Seek video based on selection type
    const rally = rallies.find(r => r.id === newSelection.rallyId)
    if (rally && videoPlayerRef.current) {
      if (newSelection.type === 'contact') {
        const contact = rally.contacts.find(c => c.id === newSelection.contactId)
        if (contact) {
          videoPlayerRef.current.seek(contact.time)
          videoPlayerRef.current.play() // Auto-play shots (they loop)
        }
      } else if (newSelection.type === 'winner' && rally.winnerTime !== undefined) {
        videoPlayerRef.current.seek(rally.winnerTime)
        videoPlayerRef.current.pause() // Winner is still frame only
      } else {
        // Server selection - just pause
        videoPlayerRef.current.pause()
      }
    }
  }, [navItems, currentIndex, rallies])

  // Handle left/right based on selection type
  const handleLeftRight = useCallback((direction: 'left' | 'right', withShift = false) => {
    if (!selection) return

    const rally = rallies.find(r => r.id === selection.rallyId)
    if (!rally) return

    if (selection.type === 'server') {
      // Toggle server
      const newServer = rally.serverId === 'player1' ? 'player2' : 'player1'
      updateRallyServer(rally.id, newServer)
    } else if (selection.type === 'winner' && rally.isScoring) {
      if (withShift) {
        // Shift+←→ = Frame step winner time
        videoPlayerRef.current?.pause()
        videoPlayerRef.current?.stepFrame(direction === 'right' ? 'forward' : 'backward', true)
        const newTime = videoPlayerRef.current?.getCurrentTime() ?? 0
        updateWinnerTime(rally.id, newTime)
      } else {
        // ←→ = Choose winner (left = player1, right = player2)
        const newWinner = direction === 'left' ? 'player1' : 'player2'
        updateRallyWinner(rally.id, newWinner)
      }
    } else if (selection.type === 'contact') {
      // Frame step contact time - ignore constraints to allow free editing
      videoPlayerRef.current?.pause()
      videoPlayerRef.current?.stepFrame(direction === 'right' ? 'forward' : 'backward', true)
      const newTime = videoPlayerRef.current?.getCurrentTime() ?? 0
      updateContactTime(selection.contactId, newTime)
    }
  }, [selection, rallies, updateRallyServer, updateWinnerTime, updateContactTime, updateRallyWinner])

  // Toggle winner (for pressing W or clicking)
  const toggleWinner = useCallback(() => {
    if (!selection || selection.type !== 'winner') return
    const rally = rallies.find(r => r.id === selection.rallyId)
    if (!rally || !rally.isScoring) return
    
    const newWinner = rally.winnerId === 'player1' ? 'player2' : 'player1'
    updateRallyWinner(rally.id, newWinner)
  }, [selection, rallies, updateRallyWinner])

  // Play video at current selection
  const playCurrentSelection = useCallback(() => {
    if (!videoPlayerRef.current || !selection) return
    
    const rally = rallies.find(r => r.id === selection.rallyId)
    if (!rally) return

    if (selection.type === 'contact') {
      const contact = rally.contacts.find(c => c.id === selection.contactId)
      if (contact) {
        videoPlayerRef.current.seek(contact.time)
      }
    } else if (selection.type === 'winner' && rally.winnerTime !== undefined) {
      // For winner, start from last contact
      const lastContact = rally.contacts[rally.contacts.length - 1]
      if (lastContact) {
        videoPlayerRef.current.seek(lastContact.time)
      }
    }
    
    videoPlayerRef.current.play()
  }, [selection, rallies])

  // Delete selected contact
  const handleDeleteContact = useCallback(() => {
    if (selection?.type !== 'contact') return
    
    deleteContact(selection.rallyId, selection.contactId)
    
    // Move selection up
    if (currentIndex > 0) {
      setSelection(navItems[currentIndex - 1])
    } else if (navItems.length > 1) {
      setSelection(navItems[1])
    } else {
      setSelection(null)
    }
  }, [selection, deleteContact, currentIndex, navItems])

  // Add contact at current video time
  const handleAddContact = useCallback((rallyId: string) => {
    const time = videoPlayerRef.current?.getCurrentTime() ?? 0
    addContactToRally(rallyId, time)
  }, [addContactToRally])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          navigateSelection('up')
          break
        case 'ArrowDown':
        case 'Enter':
          e.preventDefault()
          navigateSelection('down')
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleLeftRight('left', e.shiftKey)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleLeftRight('right', e.shiftKey)
          break
        case ' ':
          e.preventDefault()
          playCurrentSelection()
          break
        case 'w':
        case 'W':
          if (selection?.type === 'winner') {
            e.preventDefault()
            toggleWinner()
          }
          break
        case 'Delete':
        case 'Backspace':
          if (selection?.type === 'contact') {
            e.preventDefault()
            handleDeleteContact()
          }
          break
        case 'h':
        case 'H':
          if (selection) {
            e.preventDefault()
            toggleRallyHighlight(selection.rallyId)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigateSelection, handleLeftRight, playCurrentSelection, toggleWinner, handleDeleteContact, toggleRallyHighlight, selection])

  // Auto-select first item
  useEffect(() => {
    if (navItems.length > 0 && !selection) {
      setSelection(navItems[0])
    }
  }, [navItems.length])

  const totalContacts = rallies.reduce((sum, r) => sum + r.contacts.length, 0)
  const hasOpenRally = currentRallyContacts.length > 0
  const canComplete = rallies.length > 0 && !hasOpenRally

  if (!matchId) return null

  return (
    <div className="h-screen bg-bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-bg-surface flex items-center justify-between px-4 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/matches/new/step1')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-neutral-50">Review & Confirm</h1>
            <p className="text-xs text-neutral-400">
              {rallies.length} rallies • {totalContacts} shots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setShowExportPanel(!showExportPanel)}
          >
            <Film className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="primary" disabled={!canComplete} onClick={() => { completeStep1(); navigate('/matches/new/step2') }}>
            <Check className="h-4 w-4 mr-1" />
            Complete Step 1
          </Button>
        </div>
      </header>

      {/* Warning if open rally */}
      {hasOpenRally && (
        <div className="bg-warning-muted border-b border-warning/30 px-4 py-2">
          <p className="text-sm text-warning flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Unfinished rally with {currentRallyContacts.length} contact(s).
            <Button variant="ghost" size="sm" className="text-warning" onClick={() => navigate('/matches/new/step1')}>
              Go back
            </Button>
          </p>
        </div>
      )}

      {/* Keyboard hints */}
      <div className="bg-bg-card border-b border-neutral-700 px-4 py-1.5">
        <p className="text-xs text-neutral-500 text-center">
          <span className="px-2">↑↓/Enter Navigate</span>
          <span className="px-2">←→ Edit (Winner: choose player)</span>
          <span className="px-2">Shift+←→ Frame step</span>
          <span className="px-2">Space Play</span>
          <span className="px-2">H Highlight</span>
          <span className="px-2">Del Remove</span>
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Timeline (scrolls independently) */}
        <aside className="w-80 bg-bg-shell border-r border-neutral-700 flex flex-col min-h-0">
          <div ref={timelineScrollRef} className="flex-1 overflow-y-auto p-2">
            {rallies.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-sm text-neutral-400">No rallies yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rallies.map((rally, idx) => (
                  <RallyPod
                    key={rally.id}
                    rally={rally}
                    index={idx + 1}
                    player1Name={player1Name}
                    player2Name={player2Name}
                    selection={selection}
                    onSelectServer={() => setSelection({ type: 'server', rallyId: rally.id })}
                    onSelectWinner={() => {
                      setSelection({ type: 'winner', rallyId: rally.id })
                      if (rally.winnerTime !== undefined) {
                        videoPlayerRef.current?.seek(rally.winnerTime)
                        videoPlayerRef.current?.pause()
                      }
                    }}
                    onSelectContact={(contactId) => {
                      setSelection({ type: 'contact', rallyId: rally.id, contactId })
                      const contact = rally.contacts.find(c => c.id === contactId)
                      if (contact) {
                        videoPlayerRef.current?.seek(contact.time)
                        videoPlayerRef.current?.play() // Auto-play shots
                      }
                    }}
                    onAddContact={() => handleAddContact(rally.id)}
                    onToggleWinner={toggleWinner}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Add Rally button at bottom of sidebar */}
          <div className="p-2 border-t border-neutral-700 shrink-0">
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full"
              onClick={() => {
                const time = videoPlayerRef.current?.getCurrentTime() ?? 0
                insertRallyAtTime(time)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Insert Rally Here
            </Button>
          </div>
        </aside>

        {/* Center: Video */}
        <main className="flex-1 flex flex-col p-4">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 bg-bg-app relative">
              <VideoPlayer
                ref={videoPlayerRef}
                videoSrc={effectiveVideoUrl}
                onVideoSelect={handleVideoSelect}
                constrainedPlayback={constrainedPlayback}
                showTimeOverlay={true}
              />
            </div>

            {/* Action bar */}
            <div className="p-3 border-t border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selection?.type === 'contact' && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteContact}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Shot
                  </Button>
                )}
                {selection && (
                  <Button variant="secondary" size="sm" onClick={() => handleAddContact(selection.rallyId)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Shot
                  </Button>
                )}
              </div>
              <div className="text-sm text-neutral-400">
                {selection?.type === 'contact' && (
                  <span>Shot {selectedContactData?.shotIndex} • ←→ adjust time</span>
                )}
                {selection?.type === 'server' && `←→ toggle server`}
                {selection?.type === 'winner' && `←→ adjust time • W toggle winner`}
              </div>
            </div>
          </Card>
        </main>

        {/* Right: Export Panel (collapsible) */}
        {showExportPanel && (
          <aside className="w-80 bg-bg-shell border-l border-neutral-700 overflow-y-auto p-4">
            <VideoExportPanel />
          </aside>
        )}
      </div>
    </div>
  )
}

// Rally Pod Component
interface RallyPodProps {
  rally: ReturnType<typeof useTaggingStore.getState>['rallies'][0]
  index: number
  player1Name: string
  player2Name: string
  selection: SelectionType | null
  onSelectServer: () => void
  onSelectWinner: () => void
  onSelectContact: (contactId: string) => void
  onAddContact: () => void
  onToggleWinner: () => void
}

function RallyPod({
  rally,
  index,
  player1Name,
  player2Name,
  selection,
  onSelectServer,
  onSelectWinner,
  onSelectContact,
  onAddContact,
  onToggleWinner,
}: RallyPodProps) {
  const isServerSelected = selection?.type === 'server' && selection.rallyId === rally.id
  const isWinnerSelected = selection?.type === 'winner' && selection.rallyId === rally.id

  const serverName = rally.serverId === 'player1' ? player1Name : player2Name
  const winnerName = rally.winnerId === 'player1' ? player1Name : rally.winnerId === 'player2' ? player2Name : null
  const winnerTime = rally.winnerTime ?? rally.contacts[rally.contacts.length - 1]?.time

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden bg-bg-card",
      rally.isHighlight ? "border-warning" : "border-neutral-700"
    )}>
      {/* Rally header */}
      <div className={cn(
        "px-3 py-2 border-b border-neutral-700 flex items-center justify-between",
        rally.isHighlight ? "bg-warning/10" : "bg-bg-elevated"
      )}>
        <div className="flex items-center gap-2">
          {rally.isHighlight && <Star className="h-4 w-4 text-warning fill-warning" />}
          <span className="font-bold text-neutral-100">Rally {index}</span>
          <Badge variant={rally.isScoring ? 'success' : 'warning'} className="text-xs">
            {rally.player1ScoreAfter}-{rally.player2ScoreAfter}
          </Badge>
        </div>
        <button
          onClick={onAddContact}
          className="p-1 rounded hover:bg-neutral-600 text-neutral-400 hover:text-neutral-200"
          title="Add shot at current video time"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Server row */}
      <button
        data-rally-id={rally.id}
        data-type="server"
        onClick={onSelectServer}
        className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors ${
          isServerSelected
            ? 'bg-brand-primary-muted border-l-2 border-brand-primary'
            : 'hover:bg-neutral-700/50 border-l-2 border-transparent'
        }`}
      >
        <span className="text-neutral-400">Server</span>
        <span className={`font-medium ${isServerSelected ? 'text-brand-primary' : 'text-neutral-100'}`}>
          {serverName}
          {isServerSelected && <span className="text-xs ml-2 opacity-60">←→</span>}
        </span>
      </button>

      {/* Contacts */}
      {rally.contacts.map((contact, idx) => {
        const isSelected = selection?.type === 'contact' && 
          selection.rallyId === rally.id && 
          selection.contactId === contact.id

        return (
          <button
            key={contact.id}
            data-contact-id={contact.id}
            onClick={() => onSelectContact(contact.id)}
            className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors ${
              isSelected
                ? 'bg-brand-primary-muted border-l-2 border-brand-primary'
                : 'hover:bg-neutral-700/50 border-l-2 border-transparent'
            }`}
          >
            <span className="text-neutral-300">Shot {idx + 1}</span>
            <span className={`font-mono text-xs ${isSelected ? 'text-brand-primary' : 'text-neutral-500'}`}>
              {formatTime(contact.time)}
              {isSelected && <span className="ml-2 opacity-60">←→</span>}
            </span>
          </button>
        )
      })}

      {/* Winner row (at bottom, only for scoring rallies) */}
      {rally.isScoring ? (
        <button
          data-rally-id={rally.id}
          data-type="winner"
          onClick={onSelectWinner}
          onDoubleClick={onToggleWinner}
          className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors border-t border-neutral-700 ${
            isWinnerSelected
              ? 'bg-success-muted border-l-2 border-success'
              : 'hover:bg-neutral-700/50 border-l-2 border-transparent'
          }`}
        >
          <span className="text-success font-medium">Winner</span>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isWinnerSelected ? 'text-success' : 'text-success'}`}>
              {winnerName}
            </span>
            <span className={`font-mono text-xs ${isWinnerSelected ? 'text-success' : 'text-neutral-500'}`}>
              {winnerTime !== undefined ? formatTime(winnerTime) : '--:--'}
            </span>
            {isWinnerSelected && <span className="text-xs opacity-60">←→ W</span>}
          </div>
        </button>
      ) : (
        <div className="px-3 py-2 flex items-center justify-between text-sm border-t border-neutral-700">
          <span className="text-warning font-medium">No Score</span>
          <span className="text-neutral-500 text-xs">Let / Interruption</span>
        </div>
      )}
    </div>
  )
}
