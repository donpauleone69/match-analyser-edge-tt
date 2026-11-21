import { APP_VERSION } from '@/version'
import { useMatchStore } from '@/stores/matchStore'
import { BackupSection } from '../sections/BackupSection'
import { DemoDataSection } from '../sections/DemoDataSection'
import { ProfileSection } from '../sections/ProfileSection'
import { ThemeSection } from '../sections/ThemeSection'

export function AccountComposer() {
  const mode = useMatchStore((s) => s.mode)
  const setMode = useMatchStore((s) => s.setDemoMode)
  const empty = mode === 'empty'

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <ProfileSection empty={empty} />
        <ThemeSection />
        <BackupSection empty={empty} />
        <DemoDataSection mode={mode} setMode={setMode} />
      </div>
      <p className="px-4 pb-6 text-center text-xs text-muted" data-account-version>
        {APP_VERSION}
      </p>
    </div>
  )
}
