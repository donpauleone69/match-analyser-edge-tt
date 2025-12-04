/**
 * DefensiveButton — Shot intent: Defensive (shield icon, light blue)
 */

import { TableTennisButtonBase, type ButtonSize } from './TableTennisButtonBase'

export interface DefensiveButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize
  className?: string
}

export function DefensiveButton({ onClick, disabled, size = 'square', className }: DefensiveButtonProps) {
  return (
    <TableTennisButtonBase
      onClick={onClick}
      disabled={disabled}
      size={size}
      title="Defensive"
      className={className}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M10,4 L90,4 Q96,4 96,10 L96,50 L4,50 L4,10 Q4,4 10,4" fill="#60a5fa"/>
        <path d="M4,50 L96,50 L96,90 Q96,96 90,96 L10,96 Q4,96 4,90 Z" fill="#60a5fa"/>
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" strokeWidth="1.5" rx="8"/>
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fff" strokeWidth="0.75" opacity="0.5"/>
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="2" strokeDasharray="5,4"/>
        <path d="M50,11 L63,17 L63,29 Q63,39 50,43 Q37,39 37,29 L37,17 Z" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinejoin="round"/>
        <text x="50" y="77" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">DEFENSIVE</text>
      </svg>
    </TableTennisButtonBase>
  )
}

