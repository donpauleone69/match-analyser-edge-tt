import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'

export interface Pass1FormSectionProps {
  /** Optional — omit when progress pills already name the section */
  title?: string
  children: ReactNode
  className?: string
}

export function Pass1FormSection({ title, children, className }: Pass1FormSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          {title}
        </h3>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export interface Pass1QuestionProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Pass1Question({ label, hint, children, className }: Pass1QuestionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <div className="text-[13px] font-semibold text-neutral-100">{label}</div>
        {hint && <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
