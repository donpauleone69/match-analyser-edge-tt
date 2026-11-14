/**
 * Training library — shot-type and combination posts compared across months.
 * Not a match. Videos use video_assets (Slice D).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
import { trainingPostDb, type DBTrainingPost, type TrainingPostKind } from '@/data'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'
import {
  comparePostsOfSameSeries,
  postsForPlayer,
} from '@/rules/training'
import { useCloudStore } from '@/stores/cloudStore'
import { resolveAssetVideo, storeTrainingClip } from '@/data/services/videoAssetService'
import { videoAssetDb } from '@/data'

const PROVE_SHOT = 'forehand_loop'
const PROVE_COMBO = 'serve-open-drive'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function TrainingLibraryComposer() {
  const navigate = useNavigate()
  const profile = useCloudStore((s) => s.profile)
  const focalId = deriveAccountScope(profile, []).focalPlayerId
  const [posts, setPosts] = useState<DBTrainingPost[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [compareLabel, setCompareLabel] = useState<{ kind: TrainingPostKind; label: string } | null>(
    null,
  )
  const [playUrl, setPlayUrl] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!focalId) {
      setPosts([])
      return
    }
    setPosts(await trainingPostDb.getByPlayer(focalId))
  }, [focalId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const mine = useMemo(() => (focalId ? postsForPlayer(posts, focalId) : []), [posts, focalId])
  const shotPosts = mine.filter((p) => p.kind === 'shot_type')
  const comboPosts = mine.filter((p) => p.kind === 'combination')
  const series = compareLabel
    ? comparePostsOfSameSeries(mine, focalId ?? '', compareLabel.kind, compareLabel.label)
    : []

  const createPost = async (kind: TrainingPostKind, label: string, files: FileList | null) => {
    if (!focalId) {
      setNotice('Choose who you are reviewing as first.')
      return
    }
    if (!files || files.length === 0) {
      setNotice('Add about ten short clips for this post.')
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const clipIds: string[] = []
      const list = Array.from(files).slice(0, 12)
      for (let i = 0; i < list.length; i++) {
        const asset = await storeTrainingClip({
          playerId: focalId,
          file: list[i],
          label: `${label} · ${i + 1}`,
        })
        clipIds.push(asset.id)
      }
      await trainingPostDb.create({
        player_id: focalId,
        kind,
        label,
        month: currentMonth(),
        clip_asset_ids: clipIds,
      })
      setNotice(
        kind === 'combination'
          ? `Saved combination “${label}” for ${currentMonth()}.`
          : `Saved shot-type “${label}” for ${currentMonth()}.`,
      )
      await refresh()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save training post')
    } finally {
      setBusy(false)
    }
  }

  const playClip = async (assetId: string) => {
    const asset = await videoAssetDb.getById(assetId)
    if (!asset) return
    const resolved = await resolveAssetVideo(asset)
    if (resolved?.url) {
      if (playUrl?.startsWith('blob:')) URL.revokeObjectURL(playUrl)
      setPlayUrl(resolved.url)
    }
  }

  if (!focalId) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4 md:p-5">
        <h1 className="text-xl font-bold text-neutral-50">Training</h1>
        <p className="text-sm text-neutral-500">Choose who you’re reviewing as in Account.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-neutral-50 md:text-2xl">Training</h1>
          <p className="text-sm text-neutral-500">Practice posts — not match tagging.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
          <Icon name="home" size="sm" /> Home
        </Button>
      </header>

      {notice && (
        <p className="rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-xs text-neutral-200">{notice}</p>
      )}

      <Card className="space-y-2.5 p-4 border border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Shot-type post</h2>
        <p className="text-sm text-neutral-500">
          <span className="text-neutral-200">{PROVE_SHOT}</span> — ~10 clips this month.
        </p>
        <label className="block text-sm text-neutral-300">
          Clips
          <input
            type="file"
            accept="video/*"
            multiple
            disabled={busy}
            className="mt-1 block w-full text-sm text-neutral-400"
            onChange={(e) => createPost('shot_type', PROVE_SHOT, e.target.files)}
          />
        </label>
      </Card>

      <Card className="space-y-2.5 p-4 border border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Combination post</h2>
        <p className="text-sm text-neutral-500">
          <span className="text-neutral-200">{PROVE_COMBO}</span> (serve → open → drive).
        </p>
        <label className="block text-sm text-neutral-300">
          Clips
          <input
            type="file"
            accept="video/*"
            multiple
            disabled={busy}
            className="mt-1 block w-full text-sm text-neutral-400"
            onChange={(e) => createPost('combination', PROVE_COMBO, e.target.files)}
          />
        </label>
      </Card>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-neutral-50">Shot-type posts</h2>
        {shotPosts.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {shotPosts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-neutral-200">
                  {p.label} · {p.month} · {p.clip_asset_ids.length} clips
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCompareLabel({ kind: 'shot_type', label: p.label })}
                >
                  Compare months
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-neutral-50">Combinations</h2>
        {comboPosts.length === 0 ? (
          <p className="text-sm text-neutral-500">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {comboPosts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-neutral-200">
                  {p.label} · {p.month} · {p.clip_asset_ids.length} clips
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCompareLabel({ kind: 'combination', label: p.label })}
                >
                  Compare months
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {compareLabel && (
        <Card className="space-y-2.5 p-4 border border-border">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-50">
              Compare · {compareLabel.label}
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setCompareLabel(null)}>
              Close
            </Button>
          </div>
          <p className="text-xs text-neutral-500">Each month is its own post.</p>
          {series.map((p) => (
            <div key={p.id} className="space-y-2 border-t border-border pt-2.5">
              <p className="text-sm font-medium text-neutral-200">{p.month}</p>
              <div className="flex flex-wrap gap-2">
                {p.clip_asset_ids.map((id, i) => (
                  <Button key={id} size="sm" variant="secondary" onClick={() => playClip(id)}>
                    Play {i + 1}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {playUrl && (
            <video src={playUrl} controls className="mt-2 w-full rounded-lg bg-black" />
          )}
        </Card>
      )}

      <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
        <Icon name="home" size="sm" /> Home
      </Button>
    </div>
  )
}
