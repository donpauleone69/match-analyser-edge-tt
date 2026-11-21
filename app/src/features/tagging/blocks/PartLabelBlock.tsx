import { useLayoutEffect, useRef, useState } from 'react'
import { PART_LABEL } from '@/rules/bestFa'
import type { BestPart } from '@/types/rally'

const PART_SHORT: Record<BestPart, string> = { opening: 'Open', rally: 'Rally', attack: 'Att', end: 'End' }

/** Longest label that fits its chip, then smaller type, then shorter words. Never spills. */
export function PartLabel({ part }: { part: BestPart }) {
  const ref = useRef<HTMLSpanElement>(null)
  const tries: { text: string; size: number }[] = [
    { text: PART_LABEL[part], size: 10 },
    { text: PART_LABEL[part], size: 9 },
    { text: PART_LABEL[part], size: 8 },
    { text: PART_SHORT[part], size: 9 },
    { text: PART_SHORT[part], size: 8 },
    { text: PART_SHORT[part].slice(0, 1), size: 9 },
  ]
  const [pick, setPick] = useState(0)
  const key = part
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    const fit = () => {
      const room = box.clientWidth - 4
      let i = 0
      for (; i < tries.length - 1; i++) {
        el.textContent = tries[i].text
        el.style.fontSize = `${tries[i].size}px`
        if (el.scrollWidth <= room) break
      }
      el.textContent = tries[i].text
      el.style.fontSize = `${tries[i].size}px`
      setPick(i)
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(box)
    return () => watch.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const shown = tries[Math.min(pick, tries.length - 1)]
  return (
    <span ref={ref} className="inline-block whitespace-nowrap" style={{ fontSize: shown.size }}>
      {shown.text}
    </span>
  )
}
