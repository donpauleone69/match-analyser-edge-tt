import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/helpers/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg bg-bg-surface border border-border p-4 shadow-sm',
        variant === 'interactive' &&
          'cursor-pointer transition-all duration-[var(--animate-micro)] hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-semibold text-primary', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted mt-1', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

export { Card, CardTitle, CardDescription }
