/**
 * Button — ui-mine wrapper
 * 
 * Wraps shadcn Button with project-specific variants and theming.
 * Features NEVER import lucide-react directly — use Icon component.
 */

import { forwardRef } from 'react'
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ShadcnButtonProps {
  /** Full width button */
  fullWidth?: boolean
  /** Keyboard shortcut hint */
  shortcut?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, fullWidth, shortcut, children, ...props }, ref) => {
    return (
      <ShadcnButton
        ref={ref}
        className={cn(fullWidth && 'w-full', className)}
        {...props}
      >
        {children}
        {shortcut && (
          <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-neutral-800 rounded border border-neutral-600 font-mono">
            {shortcut}
          </kbd>
        )}
      </ShadcnButton>
    )
  }
)

Button.displayName = 'Button'

export { Button }

