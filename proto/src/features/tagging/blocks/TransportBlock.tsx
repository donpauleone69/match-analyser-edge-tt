import { Pressable } from '@/ui-mine'
import type { ReactNode } from 'react'

export function TransportBlock({
  onClick,
  label,
  disabled = false,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md bg-black/60 text-white text-xs font-semibold hover:bg-black/80 disabled:opacity-40 disabled:hover:bg-black/60"
    >
      {children}
    </Pressable>
  )
}
