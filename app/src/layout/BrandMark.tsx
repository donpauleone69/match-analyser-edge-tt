/** EdgeTT mark. The Gate is the only page that shows it. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`shrink-0 text-sm font-bold tracking-tight text-brand ${className}`.trim()}
      aria-label="EdgeTT"
    >
      EdgeTT
    </span>
  )
}
