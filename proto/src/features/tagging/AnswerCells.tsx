import type { CSSProperties, ReactNode } from 'react'

export function restStyle(): CSSProperties {
  return { backgroundColor: 'var(--tag-cell-rest)', borderColor: 'var(--tag-cell-rest-line)' }
}

export function Name({ children }: { children: ReactNode }) {
  return <p className="h-3 truncate text-[10px] font-bold uppercase leading-3 tracking-[0.025em] text-muted">{children}</p>
}
