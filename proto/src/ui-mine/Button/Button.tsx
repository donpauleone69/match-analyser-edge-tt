import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/helpers/utils'

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-1.5 font-semibold
   transition-all duration-[var(--animate-micro)]
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
   focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface
   disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-on-accent hover:bg-brand-primary-hover',
        secondary:
          'bg-pill-idle border border-pill-idle-border text-primary hover:bg-bg-elevated',
        ghost: 'bg-transparent text-primary hover:bg-pill-idle',
      },
      size: {
        sm: 'h-[var(--control-height)] px-[var(--control-px)] text-[length:var(--control-text)] rounded-[var(--control-radius)]',
        default: 'h-9 px-3 text-sm rounded-md',
        lg: 'h-11 px-5 text-base rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = 'Button'

export { Button, buttonVariants }
