import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/helpers/utils'

const buttonVariants = cva(
  // Base styles — match Pass 1 tag-control density and ink
  `inline-flex items-center justify-center gap-1.5 font-semibold
   transition-all duration-[var(--animate-micro)]
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface
   disabled:opacity-50 disabled:pointer-events-none
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary:
          'bg-brand-primary text-on-accent hover:bg-brand-primary-hover',
        secondary:
          'bg-pill-idle border border-pill-idle-border text-primary hover:bg-bg-elevated',
        ghost:
          'bg-transparent text-primary hover:bg-pill-idle',
        destructive:
          'bg-danger text-on-accent hover:bg-danger/90',
        success:
          'bg-success text-on-accent hover:bg-success/90',
      },
      size: {
        // sm matches .tag-control (tagging pills)
        sm: 'h-[var(--control-height)] px-[var(--control-px)] text-[length:var(--control-text)] rounded-[var(--control-radius)]',
        default: 'h-9 px-3 text-sm rounded-md',
        lg: 'h-11 px-5 text-base rounded-md',
        xl: 'h-14 px-8 text-lg rounded-md',
        icon: 'h-9 w-9 rounded-md',
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
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }

