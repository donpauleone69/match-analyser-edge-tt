/**
 * HighQualityButton — Shot quality: High (flame icon)
 */

import { TableTennisButtonBase, type ButtonSize } from './TableTennisButtonBase'

export interface HighQualityButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize
  className?: string
}

export function HighQualityButton({ onClick, disabled, size = 'square', className }: HighQualityButtonProps) {
  return (
    <TableTennisButtonBase
      onClick={onClick}
      disabled={disabled}
      size={size}
      title="High Quality"
      className={className}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M10,4 L90,4 Q96,4 96,10 L96,50 L4,50 L4,10 Q4,4 10,4" fill="#eab308"/>
        <path d="M4,50 L96,50 L96,90 Q96,96 90,96 L10,96 Q4,96 4,90 Z" fill="#eab308"/>
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" strokeWidth="1.5" rx="8"/>
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fff" strokeWidth="0.75" opacity="0.5"/>
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="2" strokeDasharray="5,4"/>
        {/* Flame outline icon (Lucide style) in red */}
        <g transform="translate(50,27) scale(1.2)">
          <path d="M0,-12 C-2,-8 -6,-4 -6,2 C-6,6 -4,9 0,12 C4,9 6,6 6,2 C6,-4 2,-8 0,-12 Z M-2,4 C-3,2 -2,0 0,-2 C2,0 3,2 2,4 C1,6 -1,6 -2,4 Z" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        </g>
        {/* Text */}
        <text x="50" y="68" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">HIGH</text>
        <text x="50" y="82" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">QUALITY</text>
      </svg>
    </TableTennisButtonBase>
  )
}





