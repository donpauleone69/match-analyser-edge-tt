import { useRef, useState, type ChangeEvent } from 'react'
import { Button, Icon } from '@/ui-mine'
import { useDemo } from '@/data/demoStore'
import { cn } from '@/helpers/utils'

/** Reads a local file's length without uploading or storing it. */
function probeDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.muted = true
    el.onloadedmetadata = () =>
      Number.isFinite(el.duration) && el.duration > 0 ? resolve(el.duration) : reject(new Error('length'))
    el.onerror = () => reject(new Error('read'))
    el.src = src
  })
}

/**
 * Add video offers two sources: the scripted demo video, or a file from this
 * device. A chosen file plays through a blob URL held in memory only.
 */
export function AddVideoChoice({
  matchId,
  align = 'start',
  disabled = false,
}: {
  matchId: string
  align?: 'start' | 'center'
  disabled?: boolean
}) {
  const { addVideo } = useDemo()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'reading' | 'failed'>('idle')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setState('reading')
    const src = URL.createObjectURL(file)
    try {
      const durationS = await probeDuration(src)
      addVideo(matchId, {
        fileName: file.name,
        sizeMb: Math.max(1, Math.round(file.size / 1_000_000)),
        durationS,
        src,
      })
      setState('idle')
    } catch {
      URL.revokeObjectURL(src)
      setState('failed')
    }
  }

  return (
    <div className={cn('space-y-1', align === 'center' && 'flex flex-col items-center')}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Add video">
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => addVideo(matchId)}>
          <Icon name="plus" size="xs" />
          Demo video
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || state === 'reading'}
          onClick={() => input.current?.click()}
        >
          <Icon name="upload" size="xs" />
          {state === 'reading' ? 'Reading' : 'Choose file'}
        </Button>
        <input
          ref={input}
          type="file"
          accept="video/*"
          className="hidden"
          aria-label="Choose a video file"
          onChange={onFile}
        />
      </div>
      {state === 'failed' ? (
        <p className="text-xs text-muted" role="status">
          That file could not be played here.
        </p>
      ) : (
        <p className="text-xs text-muted">A chosen file stays on this device.</p>
      )}
    </div>
  )
}
