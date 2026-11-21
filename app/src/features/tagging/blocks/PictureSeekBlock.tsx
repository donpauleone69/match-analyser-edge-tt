import type { PictureSeekProps } from '../models'

/** Seek bar along the bottom of the picture. Rally spans, one knob, no played fill. */
export function PictureSeekBlock({
  span,
  time,
  spans,
  band,
  onSeek,
  onPick,
}: PictureSeekProps) {
  const width = Math.max(0.001, span.b - span.a)
  const pct = (g: number) => `${Math.min(100, Math.max(0, ((g - span.a) / width) * 100))}%`
  const fromX = (clientX: number, box: DOMRect) => span.a + ((clientX - box.left) / Math.max(1, box.width)) * width
  return (
    <div
      className="tag-seek"
      data-seek=""
      aria-label="Seek"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        const node = e.currentTarget
        const box = node.getBoundingClientRect()
        const g = fromX(e.clientX, box)
        if (onPick) {
          onPick(g)
          return
        }
        node.setPointerCapture(e.pointerId)
        onSeek(g)
        const move = (ev: PointerEvent) => onSeek(fromX(ev.clientX, box))
        const end = () => {
          node.removeEventListener('pointermove', move)
          node.removeEventListener('pointerup', end)
          node.removeEventListener('pointercancel', end)
          node.removeEventListener('lostpointercapture', end)
          if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId)
        }
        node.addEventListener('pointermove', move)
        node.addEventListener('pointerup', end)
        node.addEventListener('pointercancel', end)
        node.addEventListener('lostpointercapture', end)
      }}
    >
      <span className="tag-seek-track">
        {spans.map((block, i) => (
          <span
            key={i}
            className="tag-seek-span"
            data-seek-span=""
            data-on={block.on ? '' : undefined}
            data-likely={block.likely ? '' : undefined}
            style={{ left: pct(block.a), width: `max(2px, ${((Math.max(block.a, block.b) - block.a) / width) * 100}%)` }}
          />
        ))}
        {band ? (
          <span
            className="tag-seek-band"
            data-seek-band=""
            style={{ left: pct(band.a), width: `max(3px, ${((Math.max(band.a, band.b) - band.a) / width) * 100}%)` }}
          />
        ) : null}
        <span className="tag-seek-head" style={{ left: pct(time) }} />
      </span>
    </div>
  )
}
