const PATHS = {
  star: 'M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9L3.4 9.5l6-.8z',
  flag: 'M6 21V4M6 4h10.5l-2 4 2 4H6',
  check: 'M5 12.5l4.2 4.2L19 7',
  minus: 'M6 12h12',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8 5h3v14H8zM13.5 5h3v14h-3z',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  close: 'M6 6l12 12M18 6L6 18',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, fill = false, className = '' }: { name: IconName; size?: number; fill?: boolean; className?: string }) {
  const solid = fill || name === 'play' || name === 'pause' || name === 'grid'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid && name !== 'star' ? 'none' : 'currentColor'}
      strokeWidth={name === 'dots' ? 4 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
