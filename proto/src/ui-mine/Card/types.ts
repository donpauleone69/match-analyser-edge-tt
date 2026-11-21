import type { HTMLAttributes, ReactNode } from 'react'
import type { IconName } from '../Icon/types'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive'
}

export type CardHeadProps = {
  title: string
  icon?: IconName
  badge?: ReactNode
}
