/**
 * UnderspinButton — Spin type: Underspin (downward arrow)
 */

import { TableTennisButtonBase, type ButtonSize } from './TableTennisButtonBase'

export interface UnderspinButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize
  className?: string
}

export function UnderspinButton({ onClick, disabled, size = 'square', className }: UnderspinButtonProps) {
  return (
    <TableTennisButtonBase
      onClick={onClick}
      disabled={disabled}
      size={size}
      title="Underspin"
      className={className}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M10,4 L90,4 Q96,4 96,10 L96,50 L4,50 L4,10 Q4,4 10,4" fill="#2563eb"/>
        <path d="M4,50 L96,50 L96,90 Q96,96 90,96 L10,96 Q4,96 4,90 Z" fill="#2563eb"/>
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" strokeWidth="1.5" rx="8"/>
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fff" strokeWidth="0.75" opacity="0.5"/>
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="2" strokeDasharray="5,4"/>
        <circle cx="50" cy="27" r="14" fill="none" stroke="#FFD700" strokeWidth="2.5"/>
        <line x1="50" y1="18" x2="50" y2="34" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round"/>
        <polyline points="44,29 50,35 56,29" stroke="#FFD700" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="50" y="77" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">UNDERSPIN</text>
      </svg>
    </TableTennisButtonBase>
  )
}

