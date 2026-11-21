import { Card, CardDescription, CardHead } from '@/ui-mine'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'
import { WfBadge } from '@/ui-mine'

export function ThemeSection() {
  return (
    <Card className="space-y-2">
      <CardHead icon="settings" title="Look & feel" badge={<WfBadge>proto</WfBadge>} />
      <CardDescription>Theme packs for this proto.</CardDescription>
      <ThemeSwitcher />
    </Card>
  )
}
