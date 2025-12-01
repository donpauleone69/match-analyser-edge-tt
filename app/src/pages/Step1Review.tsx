import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertTriangle, Trash2, Plus, Film, Star, User } from 'lucide-react'
import { useTaggingStore } from '../stores/taggingStore'
import { Button, Card, Badge } from '../components/ui'
import { VideoPlayer, type VideoPlayerHandle, type ConstrainedPlayback } from '../components/tagging/VideoPlayer'
import { VideoExportPanel } from '../components/export'
import { formatTime, cn } from '../lib/utils'

type SelectionType = 
  | { type: 'server'; rallyId: string }
  | { type: 'contact'; rallyId: string; contactId: string }
  | { type: 'endOfPoint'; rallyId: string }
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
    firstServerId,
    currentRallyContacts,
    updateContactTime,
    updateRallyServer,
    updateRallyWinner,
    updateEndOfPointTime,
    deleteContact,
    deleteRally,
    addContactToRally,
    toggleRallyHighlight,
    insertRallyAtTime,
    setFirstServerAndRecalculate,
    recalculateServersFromRally,
    completeStep1,
  } = useTaggingStore()

  const [selection, setSelection] = useState<SelectionType | null>(null)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [showFirstServerPrompt, setShowFirstServerPrompt] = useState(true)

  // Check if first server needs to be set (show prompt if rallies exist but none have winner)
  const needsFirstServer = rallies.length > 0 && !rallies.some(r => r.winnerId)

  // Auto-scroll to selected item in timeline
  useEffect(() => {
    if (!selection) return
    
    let selector = ''
    if (selection.type === 'server') {
      selector = `[data-rally-id="${selection.rallyId}"][data-type="server"]`
    } else if (selection.type === 'contact') {
      selector = `[data-contact-id="${selection.contactId}"]`
    } else if (selection.type === 'endOfPoint') {
      selector = `[data-rally-id="${selection.rallyId}"][data-type="endOfPoint"]`
    } else if (selection.type === 'winner') {
      selector = `[data-rally-id="${selection.rallyId}"][data-type="winner"]`
    }
    
    const element = timelineScrollRef.current?.querySelector(selector)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selection])

  const effectiveVideoUrl = videoUrl || localVideoUrl

  const handleVideoSelect = (url: string) => {
    setLocalVideoUrl(url)
    setVideoUrl(url)
  }

  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl)
      }
    }
  }, [localVideoUrl])

  useEffect(() => {
    if (!matchId) {
      navigate('/matches/new/step1')
    }
  }, [matchId, navigate])

  // Build flat navigation list: Server → Contacts → End of Point → Winner
  const navItems: SelectionType[] = useMemo(() => {
    const items: SelectionType[] = []
    rallies.forEach(rally => {
      items.push({ type: 'server', rallyId: rally.id })
      rally.contacts.forEach(contact => {
        items.push({ type: 'contact', rallyId: rally.id, contactId: contact.id })
      })
      if (rally.isScoring) {
        items.push({ type: 'endOfPoint', rallyId: rally.id })
        items.push({ type: 'winner', rallyId: rally.id })
      }
    })
    return items
  }, [rallies])

  const currentIndex = selection ? navItems.findIndex(item => {
    if (selection.type === 'server' && item.type === 'server') {
      return item.rallyId === selection.rallyId
    }
    if (selection.type === 'contact' && item.type === 'contact') {
      return item.rallyId === selection.rallyId && item.contactId === selection.contactId
    }
    if (selection.type === 'endOfPoint' && item.type === 'endOfPoint') {
      return item.rallyId === selection.rallyId
    }
    if (selection.type === 'winner' && item.type === 'winner') {
      return item.rallyId === selection.rallyId
    }
    return false
  }) : -1

  const selectedRally = selection ? rallies.find(r => r.id === selection.rallyId) : null
  const selectedContactData = selection?.type === 'contact'
    ? selectedRally?.contacts.find(c => c.id === selection.contactId)
    : null

  // Get shot label based on index
  const getShotLabel = (index: number) => {
    if (index === 0) return 'Serve'
    if (index === 1) return 'Receive'
    return `Shot ${index + 1}`
  }

  // Get server name for overlay
  const serverNameOverlay = useMemo(() => {
    if (!selection || !selectedRally) return null
    if (selection.type === 'contact' && selectedContactData?.shotIndex === 1) {
      // This is the serve - show server name
      return selectedRally.serverId === 'player1' ? player1Name : player2Name
    }
    return null
  }, [selection, selectedRally, selectedContactData, player1Name, player2Name])

  // Calculate constrained playback bounds
  const constrainedPlayback: ConstrainedPlayback | undefined = useMemo(() => {
    if (!selection || !selectedRally) return undefined

    if (selection.type === 'contact' && selectedContactData) {
      const contactIndex = selectedRally.contacts.findIndex(c => c.id === selectedContactData.id)
      const nextContact = selectedRally.contacts[contactIndex + 1]
      
      const endTime = nextContact 
        ? nextContact.time - (1/30)
        : (selectedRally.endOfPointTime ?? selectedContactData.time + 2)

      return {
        enabled: true,
        startTime: selectedContactData.time,
        endTime,
        loopOnEnd: true,
      }
    }

    if (selection.type === 'endOfPoint' && selectedRally.endOfPointTime !== undefined) {
      return undefined // Still frame for end of point
    }

    return undefined
  }, [selection, selectedRally, selectedContactData])

  const getDisplayTime = () => {
    if (!selection || !selectedRally) return 0
    if (selection.type === 'contact' && selectedContactData) {
      return selectedContactData.time
    }
    if (selection.type === 'endOfPoint') {
      return selectedRally.endOfPointTime || (selectedRally.contacts[selectedRally.contacts.length - 1]?.time || 0)
    }
    return 0
  }

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
    
    const rally = rallies.find(r => r.id === newSelection.rallyId)
    if (rally && videoPlayerRef.current) {
      if (newSelection.type === 'contact') {
        const contact = rally.contacts.find(c => c.id === newSelection.contactId)
        if (contact) {
          videoPlayerRef.current.seek(contact.time)
          videoPlayerRef.current.play()
        }
      } else if (newSelection.type === 'endOfPoint' && rally.endOfPointTime !== undefined) {
        videoPlayerRef.current.seek(rally.endOfPointTime)
        videoPlayerRef.current.pause()
      } else {
        videoPlayerRef.current.pause()
      }
    }
  }, [navItems, currentIndex, rallies])

  const handleLeftRight = useCallback((direction: 'left' | 'right', withShift = false) => {
    if (!selection) return

    const rally = rallies.find(r => r.id === selection.rallyId)
    if (!rally) return

    if (selection.type === 'server') {
      // Toggle server and recalculate subsequent rallies
      const newServer = rally.serverId === 'player1' ? 'player2' : 'player1'
      updateRallyServer(rally.id, newServer)
      // Recalculate servers for all rallies after this one
      setTimeout(() => recalculateServersFromRally(rally.id), 0)
    } else if (selection.type === 'winner' && rally.isScoring) {
      // ←→ = Choose winner (left = player1, right = player2)
      const newWinner = direction === 'left' ? 'player1' : 'player2'
      updateRallyWinner(rally.id, newWinner)
    } else if (selection.type === 'endOfPoint' && rally.isScoring) {
      // Frame step end of point time
      videoPlayerRef.current?.pause()
      videoPlayerRef.current?.stepFrame(direction === 'right' ? 'forward' : 'backward', true)
      const newTime = videoPlayerRef.current?.getCurrentTime() ?? 0
      updateEndOfPointTime(rally.id, newTime)
    } else if (selection.type === 'contact') {
      // Frame step contact time
      videoPlayerRef.current?.pause()
      videoPlayerRef.current?.stepFrame(direction === 'right' ? 'forward' : 'backward', true)
      const newTime = videoPlayerRef.current?.getCurrentTime() ?? 0
      updateContactTime(selection.contactId, newTime)
    }
  }, [selection, rallies, updateRallyServer, updateEndOfPointTime, updateContactTime, updateRallyWinner])

  const playCurrentSelection = useCallback(() => {
    if (!videoPlayerRef.current || !selection) return
    
    const rally = rallies.find(r => r.id === selection.rallyId)
    if (!rally) return

    if (selection.type === 'contact') {
      const contact = rally.contacts.find(c => c.id === selection.contactId)
      if (contact) {
        videoPlayerRef.current.seek(contact.time)
      }
    } else if (selection.type === 'endOfPoint' && rally.endOfPointTime !== undefined) {
      const lastContact = rally.contacts[rally.contacts.length - 1]
      if (lastContact) {
        videoPlayerRef.current.seek(lastContact.time)
      }
    }
    
    videoPlayerRef.current.play()
  }, [selection, rallies])

  const handleDeleteContact = useCallback(() => {
    if (selection?.type !== 'contact') return
    
    deleteContact(selection.rallyId, selection.contactId)
    
    if (currentIndex > 0) {
      setSelection(navItems[currentIndex - 1])
    } else if (navItems.length > 1) {
      setSelection(navItems[1])
    } else {
      setSelection(null)
    }
  }, [selection, deleteContact, currentIndex, navItems])

  const handleDeleteRally = useCallback(() => {
    if (!selection) return
    
    const rallyToDelete = selection.rallyId
    deleteRally(rallyToDelete)
    
    // Select previous rally or first item
    const currentRallyIndex = rallies.findIndex(r => r.id === rallyToDelete)
    if (currentRallyIndex > 0) {
      const prevRally = rallies[currentRallyIndex - 1]
      setSelection({ type: 'server', rallyId: prevRally.id })
    } else if (rallies.length > 1) {
      const nextRally = rallies[1]
      setSelection({ type: 'server', rallyId: nextRally.id })
    } else {
      setSelection(null)
    }
  }, [selection, deleteRally, rallies])

  const handleAddContact = useCallback((rallyId: string) => {
    const time = videoPlayerRef.current?.getCurrentTime() ?? 0
    addContactToRally(rallyId, time)
  }, [addContactToRally])

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
        case 'Delete':
        case 'Backspace':
          if (e.shiftKey && selection) {
            // Shift+Delete = Delete entire rally
            e.preventDefault()
            handleDeleteRally()
          } else if (selection?.type === 'contact') {
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
  }, [navigateSelection, handleLeftRight, playCurrentSelection, handleDeleteContact, handleDeleteRally, toggleRallyHighlight, selection])

  useEffect(() => {
    if (navItems.length > 0 && !selection) {
      setSelection(navItems[0])
    }
  }, [navItems.length])

  const totalContacts = rallies.reduce((sum, r) => sum + r.contacts.length, 0)
  const hasOpenRally = currentRallyContacts.length > 0
  const ralliesWithoutWinner = rallies.filter(r => r.isScoring && !r.winnerId).length
  const canComplete = rallies.length > 0 && !hasOpenRally && ralliesWithoutWinner === 0

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
              {ralliesWithoutWinner > 0 && (
                <span className="text-warning ml-2">• {ralliesWithoutWinner} need winner</span>
              )}
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

      {/* First Server Selection Prompt */}
      {(needsFirstServer || showFirstServerPrompt) && rallies.length > 0 && (
        <div className="bg-brand-primary-muted border-b border-brand-primary/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-brand-primary" />
              <span className="text-sm text-neutral-200">Who served first in this game?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={firstServerId === 'player1' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setFirstServerAndRecalculate('player1')
                  setShowFirstServerPrompt(false)
                }}
              >
                {player1Name}
              </Button>
              <Button
                variant={firstServerId === 'player2' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setFirstServerAndRecalculate('player2')
                  setShowFirstServerPrompt(false)
                }}
              >
                {player2Name}
              </Button>
              {!needsFirstServer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFirstServerPrompt(false)}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

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
          <span className="px-2">←→ Edit</span>
          <span className="px-2">Space Play</span>
          <span className="px-2">H Highlight</span>
          <span className="px-2">Del Shot</span>
          <span className="px-2">Shift+Del Rally</span>
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Timeline */}
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
                    onSelectEndOfPoint={() => {
                      setSelection({ type: 'endOfPoint', rallyId: rally.id })
                      if (rally.endOfPointTime !== undefined) {
                        videoPlayerRef.current?.seek(rally.endOfPointTime)
                        videoPlayerRef.current?.pause()
                      }
                    }}
                    onSelectWinner={() => {
                      setSelection({ type: 'winner', rallyId: rally.id })
                      // Winner selection doesn't change video position
                    }}
                    onSelectContact={(contactId) => {
                      setSelection({ type: 'contact', rallyId: rally.id, contactId })
                      const contact = rally.contacts.find(c => c.id === contactId)
                      if (contact) {
                        videoPlayerRef.current?.seek(contact.time)
                        videoPlayerRef.current?.play()
                      }
                    }}
                    onAddContact={() => handleAddContact(rally.id)}
                    onDeleteRally={() => {
                      deleteRally(rally.id)
                      setSelection(null)
                    }}
                    getShotLabel={getShotLabel}
                  />
                ))}
              </div>
            )}
          </div>
          
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
              
              {/* Server Name Overlay for Serve */}
              {serverNameOverlay && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-6xl font-black text-white/30 uppercase tracking-wider">
                    {serverNameOverlay}
                  </div>
                </div>
              )}
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
                  <span>{getShotLabel(selectedContactData?.shotIndex ? selectedContactData.shotIndex - 1 : 0)} • ←→ adjust time</span>
                )}
                {selection?.type === 'server' && `←→ toggle server`}
                {selection?.type === 'endOfPoint' && `←→ adjust end time`}
                {selection?.type === 'winner' && `← ${player1Name} wins | → ${player2Name} wins`}
              </div>
            </div>
          </Card>
        </main>

        {/* Right: Export Panel */}
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
  onSelectEndOfPoint: () => void
  onSelectWinner: () => void
  onSelectContact: (contactId: string) => void
  onAddContact: () => void
  onDeleteRally: () => void
  getShotLabel: (index: number) => string
}

function RallyPod({
  rally,
  index,
  player1Name,
  player2Name,
  selection,
  onSelectServer,
  onSelectEndOfPoint,
  onSelectWinner,
  onSelectContact,
  onAddContact,
  onDeleteRally,
  getShotLabel,
}: RallyPodProps) {
  const isServerSelected = selection?.type === 'server' && selection.rallyId === rally.id
  const isEndOfPointSelected = selection?.type === 'endOfPoint' && selection.rallyId === rally.id
  const isWinnerSelected = selection?.type === 'winner' && selection.rallyId === rally.id

  const serverName = rally.serverId === 'player1' ? player1Name : player2Name
  const winnerName = rally.winnerId === 'player1' ? player1Name : rally.winnerId === 'player2' ? player2Name : null
  const endOfPointTime = rally.endOfPointTime ?? rally.contacts[rally.contacts.length - 1]?.time

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
          <Badge variant={rally.isScoring ? (rally.winnerId ? 'success' : 'warning') : 'warning'} className="text-xs">
            {rally.player1ScoreAfter}-{rally.player2ScoreAfter}
          </Badge>
          {rally.isScoring && !rally.winnerId && (
            <span className="text-xs text-warning">needs winner</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddContact}
            className="p-1 rounded hover:bg-neutral-600 text-neutral-400 hover:text-neutral-200"
            title="Add shot at current video time"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onDeleteRally}
            className="p-1 rounded hover:bg-red-900/50 text-neutral-400 hover:text-red-400"
            title="Delete rally (Shift+Del)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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

      {/* Contacts (Serve, Receive, Shot 3, etc.) */}
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
            <span className={cn(
              "text-neutral-300",
              idx === 0 && "font-medium text-cyan-400", // Serve
              idx === 1 && "font-medium text-orange-400" // Receive
            )}>
              {getShotLabel(idx)}
            </span>
            <span className={`font-mono text-xs ${isSelected ? 'text-brand-primary' : 'text-neutral-500'}`}>
              {formatTime(contact.time)}
              {isSelected && <span className="ml-2 opacity-60">←→</span>}
            </span>
          </button>
        )
      })}

      {/* End of Point row (only for scoring rallies) */}
      {rally.isScoring && (
        <button
          data-rally-id={rally.id}
          data-type="endOfPoint"
          onClick={onSelectEndOfPoint}
          className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors border-t border-neutral-600 ${
            isEndOfPointSelected
              ? 'bg-purple-900/30 border-l-2 border-purple-400'
              : 'hover:bg-neutral-700/50 border-l-2 border-transparent'
          }`}
        >
          <span className="text-purple-400 font-medium">End of Point</span>
          <span className={`font-mono text-xs ${isEndOfPointSelected ? 'text-purple-400' : 'text-neutral-500'}`}>
            {endOfPointTime !== undefined ? formatTime(endOfPointTime) : '--:--'}
            {isEndOfPointSelected && <span className="ml-2 opacity-60">←→</span>}
          </span>
        </button>
      )}

      {/* Winner row (only for scoring rallies) */}
      {rally.isScoring ? (
        <button
          data-rally-id={rally.id}
          data-type="winner"
          onClick={onSelectWinner}
          className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors border-t border-neutral-700 ${
            isWinnerSelected
              ? 'bg-success-muted border-l-2 border-success'
              : 'hover:bg-neutral-700/50 border-l-2 border-transparent'
          }`}
        >
          <span className="text-success font-medium">Winner</span>
          <div className="flex items-center gap-2">
            {winnerName ? (
              <span className={`font-medium ${isWinnerSelected ? 'text-success' : 'text-success'}`}>
                {winnerName}
              </span>
            ) : (
              <span className="text-warning text-xs">← / → to select</span>
            )}
            {isWinnerSelected && <span className="text-xs opacity-60">←→</span>}
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
