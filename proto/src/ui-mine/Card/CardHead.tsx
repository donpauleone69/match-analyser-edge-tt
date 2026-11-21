import { Icon } from '../Icon'
import { CardTitle } from './Card'
import type { CardHeadProps } from './types'

/**
 * The three card-head shapes already on screen. Each branch is the DOM from
 * today: icon and badge, icon only, or title and badge. No extra wrapper.
 */
export function CardHead({ title, icon, badge }: CardHeadProps) {
  if (icon && badge != null) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name={icon} size="sm" className="text-brand" />
          <CardTitle>{title}</CardTitle>
        </div>
        {badge}
      </div>
    )
  }
  if (icon) {
    return (
      <div className="flex items-center gap-2">
        <Icon name={icon} size="sm" className="text-brand" />
        <CardTitle>{title}</CardTitle>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <CardTitle>{title}</CardTitle>
      {badge}
    </div>
  )
}
