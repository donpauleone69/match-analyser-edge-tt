/**
 * WinningShotButton — Green button for winning shots
 */

import { TableTennisButtonBase, type ButtonSize } from './TableTennisButtonBase'

export interface WinningShotButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize
  className?: string
}

export function WinningShotButton({ onClick, disabled, size = 'square', className }: WinningShotButtonProps) {
  return (
    <TableTennisButtonBase
      onClick={onClick}
      disabled={disabled}
      size={size}
      title="Winning Shot"
      className={className}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M10,4 L90,4 Q96,4 96,10 L96,50 L4,50 L4,10 Q4,4 10,4" fill="#16a34a"/>
        <path d="M4,50 L96,50 L96,90 Q96,96 90,96 L10,96 Q4,96 4,90 Z" fill="#16a34a"/>
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" strokeWidth="1.5" rx="8"/>
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fff" strokeWidth="0.75" opacity="0.5"/>
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="2" strokeDasharray="5,4"/>
        <text x="50" y="42" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700">SHOT</text>
        <text x="50" y="66" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700">WON</text>
      </svg>
    </TableTennisButtonBase>
  )
}

