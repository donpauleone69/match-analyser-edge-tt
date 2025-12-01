import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  // Base styles
  `inline-flex items-center justify-center gap-2 font-semibold 
   transition-all duration-[var(--animate-micro)] 
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface
   disabled:opacity-50 disabled:pointer-events-none
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: 
          'bg-brand-primary text-neutral-50 hover:bg-brand-primary-hover',
        secondary: 
          'bg-neutral-700 border border-neutral-600 text-neutral-100 hover:bg-neutral-600',
        ghost: 
          'bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100',
        destructive: 
          'bg-danger text-neutral-50 hover:bg-danger/90',
        success:
          'bg-success text-neutral-50 hover:bg-success/90',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-md',
        default: 'h-11 px-5 text-base rounded-md',
        lg: 'h-12 px-6 text-base rounded-md',
        xl: 'h-14 px-8 text-lg rounded-md', // For CONTACT button
        icon: 'h-10 w-10 rounded-md',
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

