/**
 * ContactButtonBlock — Large CONTACT button for tagging
 * 
 * Presentational component — props in, JSX out.
 */

import { cn } from '@/lib/utils'
import { Button, Icon } from '@/ui-mine'

export interface ShotButtonBlockProps {
  onClick: () => void
  disabled?: boolean
  contactCount: number
  className?: string
}

export function ShotButtonBlock({
  onClick,
  disabled = false,
  contactCount,
  className,
}: ShotButtonBlockProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Button
        variant="primary"
        size="xl"
        onClick={onClick}
        disabled={disabled}
        shortcut="Space"
        className="min-w-[200px]"
      >
        <Icon name="target" size="lg" />
        CONTACT
      </Button>
      
      {contactCount > 0 && (
        <span className="text-sm text-neutral-400">
          {contactCount} shot{contactCount !== 1 ? 's' : ''} in rally
        </span>
      )}
    </div>
  )
}


