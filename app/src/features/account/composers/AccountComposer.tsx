import { useState } from 'react'
import { APP_VERSION } from '@/version'
import { formatBytes, formatExportWhen } from '@/rules/format'
import { useMatchStore } from '@/stores/matchStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { StorageInfo } from '@/data/storage'
import { BackupSection } from '../sections/BackupSection'
import { DemoDataSection } from '../sections/DemoDataSection'
import { ProfileSection } from '../sections/ProfileSection'
import { ThemeSection } from '../sections/ThemeSection'

function storageLine(info: StorageInfo): string {
  const persisted = info.persisted === true ? 'yes' : info.persisted === false ? 'no' : 'unknown'
  if (info.usage === null || info.quota === null) return `Persisted: ${persisted}`
  const free = Math.max(0, info.quota - info.usage)
  return `Persisted: ${persisted}. Used ${formatBytes(info.usage)}. ${formatBytes(free)} free.`
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function AccountComposer() {
  const mode = useMatchStore((s) => s.mode)
  const setMode = useMatchStore((s) => s.setDemoMode)
  const storage = useMatchStore((s) => s.storage)
  const exportSavedMatches = useMatchStore((s) => s.exportSavedMatches)
  const importSavedMatch = useMatchStore((s) => s.importSavedMatch)
  const reloadDb = useMatchStore((s) => s.reloadDb)
  const askPersistent = useMatchStore((s) => s.askPersistent)
  const lastExportAt = useSettingsStore((s) => s.lastExportAt)
  const [report, setReport] = useState('')
  const empty = mode === 'empty'

  const onExport = async () => {
    const result = await exportSavedMatches()
    if (!result.ok) return
    if (result.files.length === 0) {
      setReport('Nothing to export')
      return
    }
    for (const file of result.files) download(file.name, file.text)
    setReport(`Exported ${result.files.length}`)
  }

  const onImport = async (files: File[]) => {
    let imported = 0
    let refused = 0
    for (const file of files) {
      const ok = await importSavedMatch(await file.text())
      if (ok) imported += 1
      else refused += 1
    }
    if (imported > 0) await reloadDb()
    setReport(refused > 0 ? `Imported ${imported}. Refused ${refused}.` : `Imported ${imported}`)
  }

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <ProfileSection empty={empty} />
        <ThemeSection />
        <BackupSection
          empty={empty}
          storageLine={storageLine(storage)}
          exportLine={lastExportAt === null ? 'Last export: never' : `Last export: ${formatExportWhen(lastExportAt)}`}
          showKeep={storage.persisted !== true}
          report={report}
          onExport={() => void onExport()}
          onImport={(files) => void onImport(files)}
          onKeep={() => void askPersistent()}
        />
        <DemoDataSection mode={mode} setMode={setMode} />
      </div>
      <p className="px-4 pb-6 text-center text-xs text-muted" data-account-version>
        {APP_VERSION}
      </p>
    </div>
  )
}
