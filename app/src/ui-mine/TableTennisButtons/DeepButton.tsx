/**
 * DeepButton — Serve depth: Deep (yellow highlighted)
 */

import { TableTennisButtonBase, type ButtonSize } from './TableTennisButtonBase'

export interface DeepButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize
  className?: string
}

export function DeepButton({ onClick, disabled, size = 'square', className }: DeepButtonProps) {
  return (
    <TableTennisButtonBase
      onClick={onClick}
      disabled={disabled}
      size={size}
      title="Deep"
      className={className}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M4,50 L96,50 L96,90 Q96,96 90,96 L10,96 Q4,96 4,90 Z" fill="#2563eb"/>
        <path d="M10,4 L90,4 Q96,4 96,10 L96,19.3 L4,19.3 L4,10 Q4,4 10,4" fill="#FFD700"/>
        <rect x="4" y="19.3" width="92" height="15.7" fill="#2563eb"/>
        <rect x="4" y="35" width="92" height="15" fill="#2563eb"/>
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" strokeWidth="1.5" rx="8"/>
        <line x1="50" y1="4" x2="50" y2="96" stroke="#fff" strokeWidth="0.75" opacity="0.5"/>
        <line x1="4" y1="50" x2="96" y2="50" stroke="#fff" strokeWidth="2" strokeDasharray="5,4"/>
        <line x1="4" y1="19.3" x2="96" y2="19.3" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
        <line x1="4" y1="35" x2="96" y2="35" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
        <text x="50" y="77" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">DEEP</text>
      </svg>
    </TableTennisButtonBase>
  )
}

