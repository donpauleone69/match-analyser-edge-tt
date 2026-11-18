import type { ReactNode } from 'react'

export type Tone = 'chalk' | 'ball' | 'alert' | 'you' | 'kim' | 'flag'

const ON: Record<Tone, string> = {
  chalk: 'bg-chalk text-ink-0 border-chalk',
  ball: 'bg-ball text-ball-ink border-ball',
  alert: 'bg-alert text-alert-ink border-alert',
  you: 'bg-you text-you-ink border-you',
  kim: 'bg-kim text-kim-ink border-kim',
  flag: 'bg-flag text-flag-ink border-flag',
}

const HINT: Record<Tone, string> = {
  chalk: 'border-chalk/70 bg-chalk/10',
  ball: 'border-ball bg-ball/10',
  alert: 'border-alert bg-alert/10',
  you: 'border-you bg-you/15',
  kim: 'border-kim bg-kim/15',
  flag: 'border-flag bg-flag/10',
}

const SIZE = {
  lg: 'h-12 px-3 text-base',
  md: 'h-11 px-3 text-sm',
  sm: 'h-9 px-2.5 text-xs',
}

type Props = {
  children: ReactNode
  onClick?: () => void
  on?: boolean
  tone?: Tone
  hint?: boolean
  disabled?: boolean
  size?: keyof typeof SIZE
  grow?: boolean
  className?: string
  label?: string
}

export function Btn({ children, onClick, on, tone = 'chalk', hint, disabled, size = 'md', grow, className = '', label }: Props) {
  const look = on ? ON[tone] : hint ? `${HINT[tone]} text-chalk` : 'bg-ink-2 text-chalk border-transparent active:bg-ink-3'
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`${SIZE[size]} ${grow ? 'flex-1 min-w-0' : 'shrink-0'} inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-btn border-[1.5px] font-semibold transition-colors disabled:opacity-35 ${look} ${className}`}
    >
      {children}
    </button>
  )
}

export function Cap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cap ${className}`}>{children}</div>
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Cap>{label}</Cap>
      <div className="flex gap-1.5">{children}</div>
    </div>
  )
}
