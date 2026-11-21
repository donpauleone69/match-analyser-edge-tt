import type { ButtonHTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { ButtonKind } from '@/ui-mine/buttonKinds'
import { type buttonVariants } from './Button'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  fullWidth?: boolean
  /** Item 14 height — tapPad, main, or control (device decides finger vs mouse). */
  kind?: ButtonKind
}
