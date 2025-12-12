/**
 * RallyCard - Standard rally display card
 * 
 * Used across all phases with different detail levels:
 * - Phase 1: Basic rally info (server, winner, end condition)
 * - Phase 2: Rally info + shot detail indicators
 * - Phase 3: Rally info + inferred data
 * 
 * The shot list is passed as children for flexibility.
 */

import { type ReactNode } from 'react'
import { cn } from '@/helpers/utils'

export type EndCondition = 'winner' | 'innet' | 'long' | 'forcederror' | 'let'

export interface RallyCardProps {
  rallyNumber: number
  serverName: string
  winnerName: string
  endCondition: EndCondition
  isError?: boolean
  isCurrent?: boolean  // Rally in progress (Phase 1)
  isTagging?: boolean  // Currently being tagged (Phase 2)
  serverColor?: 'player1' | 'player2'  // Server player color
  winnerColor?: 'player1' | 'player2'  // Winner player color
  children: ReactNode  // Shot list items
  className?: string
}

export function RallyCard({
  rallyNumber,
  serverName,
  winnerName,
  endCondition,
  isError,
  isCurrent,
  isTagging,
  serverColor,
  winnerColor,
  children,
  className
}: RallyCardProps) {
  const endConditionLabel = 
    endCondition === 'winner' ? 'Winner' :
    endCondition === 'innet' ? 'In-Net' :
    endCondition === 'long' ? 'Long' :
    endCondition === 'forcederror' ? 'Forced Error' :
    'Let'
    
  const endConditionColor = 
    endCondition === 'winner' ? 'text-success' :
    endCondition === 'let' ? 'text-warning' :
    'text-danger'

  const isHighlighted = isCurrent || isTagging

  return (
    <div className={cn(
      'p-3 rounded-lg mb-3',
      isHighlighted ? 'bg-brand-primary/10 border border-brand-primary/30' : 'bg-neutral-800',
      className
    )}>
      {/* Rally header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs">
          <span className={cn('font-medium', isHighlighted ? 'text-brand-primary' : 'text-neutral-400')}>
            Rally {rallyNumber}
            {isCurrent && ' (In Progress)'}
            {isTagging && ' (Tagging)'}
          </span>
          <span className="ml-2 text-neutral-500">
            Server: <span className={cn(
              'font-medium',
              serverColor === 'player1' && 'text-blue-400',
              serverColor === 'player2' && 'text-orange-400',
              !serverColor && 'text-neutral-300'
            )}>{serverName}</span>
          </span>
        </div>
        {/* Only show winner/end condition for completed rallies */}
        {!isCurrent && (
          <div className="text-xs">
            <span className={cn(
              'font-medium mr-2',
              winnerColor === 'player1' && 'text-blue-400',
              winnerColor === 'player2' && 'text-orange-400',
              !winnerColor && 'text-success'
            )}>{winnerName} won</span>
            <span className={cn('font-medium', endConditionColor)}>
              {endConditionLabel}
              {isError && ' (Error)'}
            </span>
          </div>
        )}
      </div>
      
      {/* Shot list */}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

