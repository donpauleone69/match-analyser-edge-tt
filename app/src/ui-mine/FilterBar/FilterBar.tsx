/**
 * FilterBar — Analytics Filter Component
 * 
 * Composite filter UI for analytics with multiple selectors.
 * Mobile-first with collapsible layout.
 */

import { useState } from 'react'
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { Button } from '@/ui-mine/Button'
import { Label } from '@/ui-mine/Label'
import { Input } from '@/ui-mine/Input'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { cn } from '@/helpers/utils'

export interface FilterBarProps {
  filter: AnalyticsFilterModel
  onChange: (filter: AnalyticsFilterModel) => void
  players: Array<{ id: string; name: string }>
  matches: Array<{ id: string; label: string }>
}

export function FilterBar({ filter, onChange, players, matches }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Count active filters (non-default values)
  const activeFiltersCount = [
    filter.playerId ? 1 : 0,
    filter.opponentId !== 'all' ? 1 : 0,
    filter.scopeType !== 'recent_n_matches' ? 1 : 0,
    filter.setFilter !== 'all' ? 1 : 0,
    filter.contextFilter !== 'all_points' ? 1 : 0,
  ].reduce((sum, val) => sum + val, 0)
  
  return (
    <div className="bg-bg-card rounded-lg border border-neutral-700 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/50 transition-colors md:cursor-default md:pointer-events-none"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-neutral-50">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-brand-primary/20 text-brand-primary rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <span className="md:hidden">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </span>
      </button>
      
      {/* Filter Content - Collapsible on mobile, always visible on desktop */}
      <div className={cn(
        "transition-all duration-200 md:block",
        isExpanded ? "block" : "hidden"
      )}>
        <div className="p-4 pt-0 space-y-4">
          {/* Player Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="player-select">Player</Label>
              <select
                id="player-select"
                value={filter.playerId || ''}
                onChange={(e) => onChange({ ...filter, playerId: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
              >
                <option value="">Select player...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="opponent-select">Opponent</Label>
              <select
                id="opponent-select"
                value={filter.opponentId || 'all'}
                onChange={(e) => onChange({ ...filter, opponentId: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
              >
                <option value="all">All Opponents</option>
                {players
                  .filter((p) => p.id !== filter.playerId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          
          {/* Scope Selection */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filter.scopeType === 'single_match' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, scopeType: 'single_match' })}
              >
                Single Match
              </Button>
              <Button
                size="sm"
                variant={filter.scopeType === 'recent_n_matches' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, scopeType: 'recent_n_matches' })}
              >
                Recent Matches
              </Button>
              <Button
                size="sm"
                variant={filter.scopeType === 'date_range' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, scopeType: 'date_range' })}
              >
                Date Range
              </Button>
            </div>
          </div>
          
          {/* Scope Details - Conditional */}
          <div className="space-y-2">
            {filter.scopeType === 'single_match' && (
              <div className="space-y-2">
                <Label htmlFor="match-select">Match</Label>
                <select
                  id="match-select"
                  value={filter.matchId || ''}
                  onChange={(e) => onChange({ ...filter, matchId: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                >
                  <option value="">Select match...</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {filter.scopeType === 'recent_n_matches' && (
              <div className="space-y-2">
                <Label htmlFor="recent-count">Number of Matches</Label>
                <div className="flex gap-2">
                  {[5, 10, 20, 50].map((count) => (
                    <Button
                      key={count}
                      size="sm"
                      variant={filter.recentMatchCount === count ? 'default' : 'outline'}
                      onClick={() => onChange({ ...filter, recentMatchCount: count })}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {filter.scopeType === 'date_range' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-from">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filter.dateFrom || ''}
                    onChange={(e) => onChange({ ...filter, dateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filter.dateTo || ''}
                    onChange={(e) => onChange({ ...filter, dateTo: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Set Filter */}
          <div className="space-y-2">
            <Label>Set</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filter.setFilter === 'all' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, setFilter: 'all' })}
              >
                All
              </Button>
              {([1, 2, 3, 4, 5] as const).map((set) => (
                <Button
                  key={set}
                  size="sm"
                  variant={filter.setFilter === set ? 'default' : 'outline'}
                  onClick={() => onChange({ ...filter, setFilter: set })}
                >
                  Set {set}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Context Filter */}
          <div className="space-y-2">
            <Label>Context</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filter.contextFilter === 'all_points' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, contextFilter: 'all_points' })}
              >
                All Points
              </Button>
              <Button
                size="sm"
                variant={filter.contextFilter === 'serve_only' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, contextFilter: 'serve_only' })}
              >
                Serve Only
              </Button>
              <Button
                size="sm"
                variant={filter.contextFilter === 'receive_only' ? 'default' : 'outline'}
                onClick={() => onChange({ ...filter, contextFilter: 'receive_only' })}
              >
                Receive Only
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

