import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/helpers/utils'
import { buttonKindClass, type ButtonKind } from '@/ui-mine/buttonKinds'

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-1.5 font-semibold
   transition-all duration-[var(--animate-micro)]
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
   focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface
   disabled:pointer-events-none disabled:active:scale-100 disabled:shadow-none disabled:opacity-100
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-on-accent hover:bg-brand-primary-hover border border-transparent',
        secondary:
          'bg-pill-idle border border-pill-idle-border text-primary hover:bg-bg-elevated',
        ghost: 'bg-transparent text-primary hover:bg-pill-idle border border-transparent',
      },
      size: {
        sm: `${buttonKindClass.control} px-[var(--control-px)] text-[length:var(--control-text)] rounded-[var(--control-radius)]`,
        default: `${buttonKindClass.control} px-3 text-sm rounded-md`,
        lg: `${buttonKindClass.main} px-5 text-base rounded-md`,
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

/** Applied after variants so disabled colors beat text-on-accent / text-primary. */
const disabledSurface =
  'disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  fullWidth?: boolean
  /** Item 14 height — tapPad, main, or control (device decides finger vs mouse). */
  kind?: ButtonKind
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, kind, fullWidth, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant, size: kind ? null : size }),
        !kind && size === undefined && `${buttonKindClass.control} px-3 text-sm rounded-md`,
        kind && buttonKindClass[kind],
        kind && 'px-3 text-sm rounded-md',
        disabledSurface,
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = 'Button'

export { Button, buttonVariants }
