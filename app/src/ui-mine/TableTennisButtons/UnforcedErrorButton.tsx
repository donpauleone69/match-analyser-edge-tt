/**
 * UnforcedErrorButton — Error type: Unforced Error (red, frown icon)
 */

import { TableTennisButtonBase, type ButtonSize } from './TableTennisButtonBase'

export interface UnforcedErrorButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize
  className?: string
}

export function UnforcedErrorButton({ onClick, disabled, size = 'square', className }: UnforcedErrorButtonProps) {
  return (
    <TableTennisButtonBase
      onClick={onClick}
      disabled={disabled}
      size={size}
      title="Unforced Error"
      className={className}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M10,4 L90,4 Q96,4 96,10 L96,50 L4,50 L4,10 Q4,4 10,4" fill="#dc2626"/>
        <path d="M4,50 L96,50 L96,90 Q96,96 90,96 L10,96 Q4,96 4,90 Z" fill="#dc2626"/>
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" strokeWidth="1.5" rx="8"/>
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fff" strokeWidth="0.75" opacity="0.5"/>
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="2" strokeDasharray="5,4"/>
        {/* Frown face icon */}
        <circle cx="50" cy="27" r="14" fill="none" stroke="#FFD700" strokeWidth="2.5"/>
        <circle cx="44" cy="24" r="2" fill="#FFD700"/>
        <circle cx="56" cy="24" r="2" fill="#FFD700"/>
        <path d="M43,34 Q50,29 57,34" stroke="#FFD700" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* Text */}
        <text x="50" y="68" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">UNFORCED</text>
        <text x="50" y="82" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">ERROR</text>
      </svg>
    </TableTennisButtonBase>
  )
}





