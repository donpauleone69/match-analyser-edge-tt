/**
 * AccountComposer — sign in, choose whose library is in scope, and manage sync.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
import { useCloudStore } from '@/stores/cloudStore'
import { useMatchStore, usePlayerStore } from '@/data'
import { cloudUrl, importMatchBundleFile } from '@/data/cloud'
import { getStorageEstimate, requestPersistentStorage } from '@/helpers/videoStorage'
import { formatFileSize } from '@/helpers/videoFileHelpers'
import { SignInFormBlock } from '../blocks/SignInFormBlock'

export function AccountComposer() {
  const navigate = useNavigate()
  const {
    configured,
    ready,
    user,
    sessionKind,
    profile,
    busy,
    error,
    lastSync,
    signIn,
    signUp,
    continueOnThisDevice,
    signOut,
    setAccountRole,
    setLinkedPlayer,
    setFocalPlayer,
    syncNow,
  } = useCloudStore()
  const loadMatches = useMatchStore((s) => s.load)
  const { players, load: loadPlayers } = usePlayerStore()
  const createPlayer = usePlayerStore((s) => s.create)
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null)
  const [fileNotice, setFileNotice] = useState<{
    tone: 'good' | 'bad'
    text: string
    matchId?: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStorageEstimate().then(setStorage)
    loadPlayers()
  }, [loadPlayers])

  const ensurePlayerList = async () => {
    await loadPlayers()
    const list = usePlayerStore.getState().players
    if (list.length > 0) return list
    const created = await createPlayer({
      first_name: 'Hero',
      last_name: 'Player',
      handedness: 'right',
      playstyle: null,
      club_id: null,
      is_archived: false,
    })
    await loadPlayers()
    return created ? usePlayerStore.getState().players : usePlayerStore.getState().players
  }

  const focalPlayerId =
    profile?.role === 'player' ? profile.linkedPlayerId : profile?.selectedFocalPlayerId
  const focalPlayer = players.find((player) => player.id === focalPlayerId)

  const handleSync = async () => {
    const result = await syncNow()
    if (result) await loadMatches()
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    setFileNotice(null)
    try {
      const { title, bundle } = await importMatchBundleFile(file)
      await loadMatches()
      const matchId = bundle.match.id
      setFileNotice({
        tone: 'good',
        text: `Imported ${title}. Videos are not in the file — attach or restore them on Details if missing.`,
        matchId,
      })
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
              Sign in to use your library, tagging and review. Your data remains local-first and can be backed up.
            </p>
          </div>
        </div>

        {!ready ? (
          <p className="text-sm text-neutral-400">Checking sign-in…</p>
        ) : !user ? (
          <SignInFormBlock
            busy={busy}
            error={error}
            cloudAvailable={configured}
            onSignIn={signIn}
            onSignUp={signUp}
            onContinueOnThisDevice={() => {
              void continueOnThisDevice().then((ok) => {
                if (ok) void loadPlayers()
              })
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-300">
                <Icon name="user" size="sm" />{' '}
                {sessionKind === 'local' ? 'Local device session' : user.email}
              </span>
              {sessionKind === 'cloud' && (
                <Button onClick={handleSync} disabled={busy}>
                  <Icon name={busy ? 'loader' : 'refresh'} size="sm" className={busy ? 'animate-spin' : undefined} />
                  Sync now
                </Button>
              )}
              <Button variant="secondary" onClick={signOut} disabled={busy}>
                <Icon name="log-out" size="sm" /> {sessionKind === 'local' ? 'Leave device session' : 'Sign out'}
              </Button>
            </div>
            {sessionKind === 'local' && (
              <p className="text-sm text-neutral-400">
                This browser keeps your library locally. Cloud backup stays available when you sign in with Supabase.
              </p>
            )}
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
            <div className="rounded-lg border border-neutral-700 bg-bg-surface p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-neutral-100">Whose matches are you reviewing?</h3>
                <p className="text-sm text-neutral-400">
                  Your account is separate from the player in the point. Review speaks as the selected player.
                </p>
              </div>

              {!profile?.role ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void ensurePlayerList().then(() => setAccountRole('player'))
                    }}
                  >
                    I am the player
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void ensurePlayerList().then(() => setAccountRole('coach'))
                    }}
                  >
                    I am a coach
                  </Button>
                </div>
              ) : (
                <>
                  <label className="block text-sm text-neutral-300">
                    {profile.role === 'player' ? 'Your player record' : 'Reviewing as'}
                    <select
                      value={focalPlayerId ?? ''}
                      onChange={(event) =>
                        profile.role === 'player'
                          ? setLinkedPlayer(event.target.value)
                          : setFocalPlayer(event.target.value)
                      }
                      className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-50"
                    >
                      <option value="">Select player…</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.first_name} {player.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {players.length === 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void ensurePlayerList()
                      }}
                    >
                      Create Hero Player
                    </Button>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-neutral-400">
                      {focalPlayer
                        ? `The library and “you” now mean ${focalPlayer.first_name} ${focalPlayer.last_name}.`
                        : 'Choose a player to unlock the library.'}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAccountRole(profile.role === 'player' ? 'coach' : 'player')}
                    >
                      Switch to {profile.role === 'player' ? 'coach' : 'player'}
                    </Button>
                  </div>
                </>
              )}
            </div>
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
          <span className="text-xs text-neutral-500">
            Zero-infra backup: restore a JSON saved from Match Review → Details → Save match file.
            Works without cloud; videos re-link by asset id when present on this device.
          </span>
        </div>
        {fileNotice && (
          <div className="flex flex-wrap items-center gap-2">
            <p className={fileNotice.tone === 'good' ? 'text-sm text-emerald-400' : 'text-sm text-rose-400'}>
              {fileNotice.text}
            </p>
            {fileNotice.tone === 'good' && fileNotice.matchId && (
              <Button size="sm" onClick={() => navigate(`/matches/${fileNotice.matchId}`)}>
                Open match
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
