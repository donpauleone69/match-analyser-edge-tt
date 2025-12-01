import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-400"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            `h-11 w-full rounded-md border border-neutral-600 bg-neutral-700 
             px-3.5 text-base text-neutral-100 placeholder:text-neutral-500
             transition-all duration-[var(--animate-micro)]
             focus:border-brand-primary focus:outline-none focus:shadow-glow
             disabled:opacity-50 disabled:cursor-not-allowed`,
            error && 'border-danger focus:border-danger focus:shadow-none',
            type === 'number' && 'font-mono',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-danger">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

