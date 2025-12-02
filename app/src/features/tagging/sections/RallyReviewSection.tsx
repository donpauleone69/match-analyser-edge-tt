/**
 * RallyReviewSection — End-of-rally review with video sync
 * 
 * Displayed after all shots in a rally are tagged.
 * Shows rally summary with shot list that highlights in sync with video.
 * Video loops the rally while this section is displayed.
 */

import { cn } from '@/lib/utils'
import { Button, Card, Icon } from '@/ui-mine'
import { formatTime } from '@/lib/utils'
import type { PlayerId, Contact, PointEndType } from '@/rules/types'

export interface RallyReviewSectionProps {
  rallyNumber: number
  serverName: string
  serverId: PlayerId
  receiverName: string
  contacts: Contact[]
  endOfPointTime: number
  winnerId?: PlayerId
  winnerName?: string
  pointEndType?: PointEndType
  currentVideoTime: number // For highlighting current shot
  player1Name: string
  player2Name: string
  onEndTimeNudge: (direction: 'earlier' | 'later') => void
  onConfirm: () => void
  className?: string
}

// Get which shot index should be highlighted based on video time
function getHighlightedShotIndex(currentTime: number, contacts: Contact[]): number {
  if (contacts.length === 0) return -1
  
  // Find the last contact whose time is <= current time
  for (let i = contacts.length - 1; i >= 0; i--) {
    if (currentTime >= contacts[i].time) {
      return i
    }
  }
  return 0
}

// Format shot description for display
function getShotDescription(contact: Contact, isServe: boolean): string {
  const parts: string[] = []
  
  if (isServe) {
    if (contact.serveType) parts.push(contact.serveType)
    if (contact.serveSpin) parts.push(contact.serveSpin)
  } else {
    if (contact.wing) parts.push(contact.wing)
    if (contact.shotType) parts.push(contact.shotType)
  }
  
  if (contact.shotQuality) parts.push(contact.shotQuality)
  if (contact.landingZone) parts.push(contact.landingZone)
  
  return parts.length > 0 ? parts.join(' • ') : '...'
}

function getShotLabel(index: number): string {
  if (index === 0) return 'Serve'
  if (index === 1) return 'Return'
  return `Shot ${index + 1}`
}

function getPointEndTypeLabel(type: PointEndType | undefined): string {
  switch (type) {
    case 'winnerShot': return 'Winner'
    case 'forcedError': return 'Forced Error'
    case 'unforcedError': return 'Unforced Error'
    case 'serviceFault': return 'Service Fault'
    case 'receiveError': return 'Receive Error'
    case 'letReplay': return 'Let'
    default: return ''
  }
}

export function RallyReviewSection({
  rallyNumber,
  serverName,
  serverId,
  contacts,
  endOfPointTime,
  winnerId,
  winnerName,
  pointEndType,
  currentVideoTime,
  player1Name,
  player2Name,
  onEndTimeNudge,
  onConfirm,
  className,
}: RallyReviewSectionProps) {
  const highlightedIndex = getHighlightedShotIndex(currentVideoTime, contacts)
  
  // Color coding for players
  const getPlayerColor = (id: PlayerId) => 
    id === 'player1' ? 'text-cyan-400' : 'text-amber-400'
  
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Rally {rallyNumber} Complete
          </h2>
          <span className="text-xs text-neutral-400">
            Video looping rally
          </span>
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Server:</span>
            <span className={cn('font-medium', getPlayerColor(serverId))}>
              {serverName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Shots:</span>
            <span className="font-medium text-neutral-200">{contacts.length}</span>
          </div>
          {winnerId && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Winner:</span>
                <span className={cn('font-medium', getPlayerColor(winnerId))}>
                  {winnerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">End:</span>
                <span className="font-medium text-neutral-200">
                  {getPointEndTypeLabel(pointEndType)}
                </span>
              </div>
            </>
          )}
        </div>
        
        {/* Shot List with Sync Highlights */}
        <div className="bg-neutral-800/50 rounded-lg overflow-hidden">
          {contacts.map((contact, index) => {
            const isHighlighted = index === highlightedIndex
            const isServe = index === 0
            const playerId = isServe || index % 2 === 0 
              ? serverId 
              : (serverId === 'player1' ? 'player2' : 'player1')
            const playerName = playerId === 'player1' ? player1Name : player2Name
            
            return (
              <div
                key={contact.id}
                className={cn(
                  'px-3 py-2 flex items-center gap-3 text-sm transition-all duration-200',
                  isHighlighted 
                    ? 'bg-brand-primary/20 border-l-2 border-brand-primary' 
                    : 'border-l-2 border-transparent hover:bg-neutral-700/30'
                )}
              >
                {/* Shot number */}
                <span className={cn(
                  'w-16 font-medium',
                  isHighlighted ? 'text-brand-primary' : 'text-neutral-400'
                )}>
                  {getShotLabel(index)}
                </span>
                
                {/* Player indicator */}
                <span className={cn('w-8', getPlayerColor(playerId))}>
                  {playerName.slice(0, 2).toUpperCase()}
                </span>
                
                {/* Shot description */}
                <span className={cn(
                  'flex-1',
                  isHighlighted ? 'text-white' : 'text-neutral-300'
                )}>
                  {getShotDescription(contact, isServe)}
                </span>
                
                {/* Time */}
                <span className="font-mono text-xs text-neutral-500">
                  {formatTime(contact.time)}
                </span>
              </div>
            )
          })}
        </div>
        
        {/* End of Point Time Control */}
        <div className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">End of Point:</span>
            <span className="font-mono text-sm text-neutral-200">
              {formatTime(endOfPointTime)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEndTimeNudge('earlier')}
              className="p-1.5 hover:bg-neutral-700 rounded transition-colors"
              title="Move earlier (1 frame)"
            >
              <Icon name="chevron-left" size="sm" className="text-neutral-400" />
            </button>
            <button
              onClick={() => onEndTimeNudge('later')}
              className="p-1.5 hover:bg-neutral-700 rounded transition-colors"
              title="Move later (1 frame)"
            >
              <Icon name="chevron-right" size="sm" className="text-neutral-400" />
            </button>
          </div>
        </div>
        
        {/* Confirm Button */}
        <Button
          variant="success"
          size="lg"
          onClick={onConfirm}
          className="w-full gap-2"
        >
          <Icon name="check" size="sm" />
          Confirm → Next Rally
          <span className="text-green-200 text-xs ml-1">(Enter)</span>
        </Button>
      </div>
    </Card>
  )
}



