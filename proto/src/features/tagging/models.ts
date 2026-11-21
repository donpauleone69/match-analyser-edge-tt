/** One control in the Input Area. Empty cells are space, so a missing region draws nothing. */
export type AreaRegion = {
  key: string
  label: string
  column: 1 | 2
  row: number
  /** Portrait: both columns. Landscape: the same control in each wing. */
  span?: boolean
  /** The row stays at control height. The other rows share what is left. */
  short?: boolean
  bg: string
  fg: string
  pressed?: boolean
  /** Shown, and a press does nothing. */
  dim?: boolean
  outline?: boolean
  onClick: () => void
  data?: Record<string, string | undefined>
}

export type RallyState = 'before' | 'gap' | 'insert' | 'tapping' | 'answering' | 'saved' | 'editing' | 'review'

/** One rally on the seek bar, first contact to last. `on` is the rally being reviewed. */
export type SeekSpan = { a: number; b: number; on?: boolean; likely?: boolean }
