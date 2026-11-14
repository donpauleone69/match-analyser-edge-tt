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
        text: `Imported ${title}. Re-link videos on Details if needed.`,
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

  const fieldClass =
    'mt-1 w-full rounded-md border border-border bg-bg-surface px-2.5 py-1.5 text-sm text-primary'

  return (
    <div className="space-y-3">
      <Card className="p-2.5 md:p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Icon name="cloud" size="md" className="text-brand-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary">Account & backup</h2>
            <p className="text-xs text-muted">Local-first library; optional cloud sync.</p>
          </div>
        </div>

        {!ready ? (
          <p className="text-xs text-muted">Checking sign-in…</p>
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-bg-elevated px-2.5 py-1 text-sm text-primary">
                <Icon name="user" size="sm" />{' '}
                {sessionKind === 'local' ? 'This device' : user.email}
              </span>
              {sessionKind === 'cloud' && (
                <Button size="sm" onClick={handleSync} disabled={busy}>
                  <Icon name={busy ? 'loader' : 'refresh'} size="sm" className={busy ? 'animate-spin' : undefined} />
                  Sync
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={signOut} disabled={busy}>
                <Icon name="log-out" size="sm" /> {sessionKind === 'local' ? 'Leave' : 'Sign out'}
              </Button>
            </div>
            {sessionKind === 'local' && (
              <p className="text-xs text-muted">Library stays on this browser until you sign in.</p>
            )}
            {error && (
              <p className="rounded-md bg-callout-danger-bg px-2.5 py-1.5 text-xs text-callout-danger">
                {error}
              </p>
            )}
            {lastSync && (
              <p className="text-xs text-muted">
                Last sync {new Date(lastSync.at).toLocaleTimeString()}: {lastSync.pushed.length} up,{' '}
                {lastSync.pulled.length} down
                {lastSync.conflicts.length > 0 && (
                  <span className="text-callout-warning">
                    , {lastSync.conflicts.length} conflict
                    {lastSync.conflicts.length === 1 ? '' : 's'}
                  </span>
                )}
                {lastSync.failed.length > 0 && (
                  <span className="text-callout-danger">
                    , {lastSync.failed.length} failed ({lastSync.failed[0].message})
                  </span>
                )}
                .
              </p>
            )}
            {sessionKind === 'cloud' && (
              <p className="text-[11px] text-muted">
                Sync pushes match tags. Videos stay opt-in from Details.
              </p>
            )}
            <div className="rounded-md bg-bg-elevated/50 p-2.5 space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-primary">Reviewing as</h3>
                <p className="text-xs text-muted">Library and “you” follow this player.</p>
              </div>

              {!profile?.role ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void ensurePlayerList().then(() => setAccountRole('player'))
                    }}
                  >
                    I am the player
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void ensurePlayerList().then(() => setAccountRole('coach'))
                    }}
                  >
                    I am a coach
                  </Button>
                </div>
              ) : (
                <>
                  <label className="block text-xs text-muted">
                    {profile.role === 'player' ? 'Your player record' : 'Reviewing as'}
                    <select
                      value={focalPlayerId ?? ''}
                      onChange={(event) =>
                        profile.role === 'player'
                          ? setLinkedPlayer(event.target.value)
                          : setFocalPlayer(event.target.value)
                      }
                      className={fieldClass}
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
                    <p className="text-xs text-muted">
                      {focalPlayer
                        ? `${focalPlayer.first_name} ${focalPlayer.last_name}`
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
            <p className="text-[11px] text-muted">
              Matches sync as one record each. Videos only when you choose Back up.
              {cloudUrl && <> · {cloudUrl}</>}
            </p>
          </div>
        )}
      </Card>

      <Card className="p-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Icon name="target" size="md" className="text-muted shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-primary">Training</h2>
            <p className="text-xs text-muted">Practice posts — not match tagging.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/training')}>
            Open
          </Button>
        </div>
      </Card>

      <Card className="p-2.5 space-y-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Icon name="hard-drive" size="md" className="text-muted shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-primary">This device</h2>
            <p className="text-xs text-muted">Videos stay in on-device app storage.</p>
          </div>
        </div>
        {storage ? (
          <p className="text-xs text-muted">
            {formatFileSize(storage.usage)} of {formatFileSize(storage.quota)}{' '}
            {storage.persisted ? (
              <span className="text-result-winner">· Protected</span>
            ) : (
              <button type="button" onClick={keepStorage} className="text-brand-primary hover:underline">
                · Protect from clean-up
              </button>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted">Storage details unavailable.</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Icon name="file-up" size="sm" /> Import match file
          </Button>
          <span className="text-[11px] text-muted">JSON from Match Review → Details.</span>
        </div>
        {fileNotice && (
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={
                fileNotice.tone === 'good'
                  ? 'text-xs text-result-winner'
                  : 'rounded-md bg-callout-danger-bg px-2.5 py-1.5 text-xs text-callout-danger'
              }
            >
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
