/**
 * Part2CompletionBlock — Completion screen for Part 2
 * 
 * Shown when all rallies have been tagged.
 * Primary action: View Match Stats
 */

import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'

export interface Part2CompletionBlockProps {
  matchId: string
  player1Name: string
  player2Name: string
  ralliesTagged: number
  onViewStats: () => void
  onBackToMatches: () => void
  className?: string
}

export function Part2CompletionBlock({
  player1Name,
  player2Name,
  ralliesTagged,
  onViewStats,
  onBackToMatches,
  className,
}: Part2CompletionBlockProps) {
  return (
    <Card className={cn('w-full max-w-md text-center', className)}>
      <CardHeader className="pb-4">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <Icon name="check-circle" size="xl" className="text-success" />
        </div>
        <CardTitle className="text-2xl">Tagging Complete!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-neutral-300">
          <p className="text-lg font-medium mb-2">
            {player1Name} vs {player2Name}
          </p>
          <p className="text-sm text-neutral-400">
            All {ralliesTagged} rallies have been tagged.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={onViewStats}
            className="w-full"
          >
            <Icon name="bar-chart-2" size="sm" />
            View Match Stats
          </Button>
          
          <Button 
            variant="secondary" 
            size="md" 
            onClick={onBackToMatches}
            className="w-full"
          >
            Back to Matches
          </Button>
        </div>
        
        <p className="text-xs text-neutral-500">
          Your tagging data has been saved locally.
        </p>
      </CardContent>
    </Card>
  )
}

