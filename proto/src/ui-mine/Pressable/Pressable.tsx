import { forwardRef } from 'react'
import type { PressableProps } from './types'

/** Bare `<button>` passthrough — no extra classes or default `type`. */
const Pressable = forwardRef<HTMLButtonElement, PressableProps>(({ ...props }, ref) => (
  <button ref={ref} {...props} />
))

Pressable.displayName = 'Pressable'

export { Pressable }