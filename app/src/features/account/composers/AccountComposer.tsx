/**
 * AccountComposer — sign in, sync matches, see device storage, move a match by file.
 *
 * Tagging works without an account. Signing in backs matches up and makes them
 * (and any backed-up videos) available on your other devices.
 */

import { useEffect, useRef, useState } from 'react'
import { Button, Card, Icon } from '@/ui-mine'
import { useCloudStore } from '@/stores/cloudStore'
import { useMatchStore } from '@/data'
import { cloudUrl, importMatchBundleFile } from '@/data/cloud'
import { getStorageEstimate, requestPersistentStorage } from '@/helpers/videoStorage'
import { formatFileSize } from '@/helpers/videoFileHelpers'
import { SignInFormBlock } from '../blocks/SignInFormBlock'

export function AccountComposer() {
  const { configured, ready, user, busy, error, lastSync, signIn, signUp, signOut, syncNow } = useCloudStore()
  const loadMatches = useMatchStore((s) => s.load)
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null)
  const [fileNotice, setFileNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStorageEstimate().then(setStorage)
  }, [])

  const handleSync = async () => {
    const result = await syncNow()
    if (result) await loadMatches()
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    setFileNotice(null)
    try {
      const { title } = await importMatchBundleFile(file)
      await loadMatches()
      setFileNotice({ tone: 'good', text: `Imported ${title}.` })
    } catch (err) {
      setFileNotice({ tone: 'bad', text: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const keepStorage = async () => {
    await requestPersistentStorage()
    setStorage(await getStorageEstimate())
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Icon name="cloud" size="lg" className="text-brand-primary" />
          <div>
            <h2 className="text-xl font-semibold text-neutral-50">Account & cloud backup</h2>
            <p className="text-sm text-neutral-400">
              Back up your matches and open them on any device. Tagging always works offline.
            </p>
          </div>
        </div>

        {!configured ? (
          <p className="text-sm text-amber-300">
            Cloud isn’t set up for this copy of the app (no Supabase URL configured). Everything stays on this device.
          </p>
        ) : !ready ? (
          <p className="text-sm text-neutral-400">Checking sign-in…</p>
        ) : !user ? (
          <SignInFormBlock busy={busy} error={error} onSignIn={signIn} onSignUp={signUp} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-300">
                <Icon name="user" size="sm" /> {user.email}
              </span>
              <Button onClick={handleSync} disabled={busy}>
                <Icon name={busy ? 'loader' : 'refresh'} size="sm" className={busy ? 'animate-spin' : undefined} />
                Sync now
              </Button>
              <Button variant="secondary" onClick={signOut} disabled={busy}>
                <Icon name="log-out" size="sm" /> Sign out
              </Button>
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {lastSync && (
              <p className="text-sm text-neutral-400">
                Last sync {new Date(lastSync.at).toLocaleTimeString()}: {lastSync.pushed.length} backed up,{' '}
                {lastSync.pulled.length} downloaded
                {lastSync.conflicts.length > 0 && (
                  <span className="text-amber-300">
                    , {lastSync.conflicts.length} changed on another device too (open the match to choose a copy)
                  </span>
                )}
                {lastSync.failed.length > 0 && (
                  <span className="text-rose-400">, {lastSync.failed.length} failed ({lastSync.failed[0].message})</span>
                )}
                .
              </p>
            )}
            <p className="text-xs text-neutral-500">
              Matches sync as one record each. Videos are only uploaded when you choose “Back up” on a video or reel.
              {cloudUrl && <> Server: {cloudUrl}</>}
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Icon name="hard-drive" size="lg" className="text-neutral-400" />
          <div>
            <h2 className="text-xl font-semibold text-neutral-50">This device</h2>
            <p className="text-sm text-neutral-400">Videos you load are kept in the app’s own storage on this device.</p>
          </div>
        </div>
        {storage ? (
          <p className="text-sm text-neutral-300">
            Using {formatFileSize(storage.usage)} of {formatFileSize(storage.quota)} available.{' '}
            {storage.persisted ? (
              <span className="text-emerald-400">Protected from automatic clean-up.</span>
            ) : (
              <button type="button" onClick={keepStorage} className="text-brand-primary hover:underline">
                Protect from automatic clean-up
              </button>
            )}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Storage details aren’t available in this browser.</p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="file-up" size="sm" /> Import a match file
          </Button>
          <span className="text-xs text-neutral-500">Restore a match saved with “Save match file” — no account needed.</span>
        </div>
        {fileNotice && (
          <p className={fileNotice.tone === 'good' ? 'text-sm text-emerald-400' : 'text-sm text-rose-400'}>{fileNotice.text}</p>
        )}
      </Card>
    </div>
  )
}
