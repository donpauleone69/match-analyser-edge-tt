import type { SVGProps } from 'react'
import type { icons } from './icons'

export type IconName = keyof typeof icons

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  label?: string
}
