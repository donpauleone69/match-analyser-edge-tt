import { Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { ThemeSwitcher } from '@/theme/ThemeSwitcher'
import { WfBadge } from '@/layout/Wireframe'

export function ThemeSection() {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="settings" size="sm" className="text-brand" />
          <CardTitle>Look & feel</CardTitle>
        </div>
        <WfBadge>proto</WfBadge>
      </div>
      <CardDescription>Theme packs for this proto.</CardDescription>
      <ThemeSwitcher />
    </Card>
  )
}
