/**
 * Side log for the two tagging modes. One line per rally, kept in this
 * browser (it outlives the tab), never on the rally itself. Both modes
 * write the same shape so the times can be compared.
 */

import { isError, type Draft, type RallyData, type Side } from './rally'

export type FlowName = 'current' | 'sequential'

export type TagLogLine = {
  mode: FlowName
  shots: number
  server: Side
  fa: number | null
  /** End of the taps to Save, in milliseconds. */
  answerMs: number
  /** First tap to Save, in milliseconds. */
  totalMs: number
  presses: number
  nexts: number
  loops: number
  reopened: number
  changed: number
  discards: number
  optional: number
  /** Set when the line is a later edit of a saved rally. */
  edit?: string
}

const KEY = 'proto-tag-timings'

export function readTagLog(): TagLogLine[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as TagLogLine[]) : []
  } catch {
    return []
  }
}

export function pushTagLog(line: TagLogLine) {
  const all = readTagLog()
  all.push(line)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* The log is for the comparison. A full tab must not block Save. */
  }
}

/** Optional answers Save does not require: depth, intent, initiative, marks, miss reason. */
export function countOptional(d: Draft): number {
  let n = 0
  for (const shot of d.shots) {
    if (shot.depth) n++
    if (shot.intent) n++
    if (shot.initiative) n++
    if (shot.high) n++
    if (shot.heavy) n++
    if (shot.review) n++
    if (shot.missReason) n++
  }
  return n
}

/** What an edit changed, in a few words. */
export function editNote(before: RallyData, after: RallyData): string {
  const bits: string[] = []
  if (before.fa !== after.fa) bits.push('first attack')
  if (before.ending !== after.ending) bits.push('result')
  if (before.winner !== after.winner) bits.push('winner')
  const n = Math.max(before.shots.length, after.shots.length)
  for (let i = 0; i < n; i++) {
    const a = before.shots[i]
    const b = after.shots[i]
    if (a?.stroke !== b?.stroke || a?.wing !== b?.wing) bits.push(`shot ${i + 1}`)
  }
  if (isError(before.ending) !== isError(after.ending) && !bits.includes('result')) bits.push('result')
  return bits.length ? bits.join(', ') : 'tags'
}

const HEAD = [
  'mode',
  'shots',
  'server',
  'first attack',
  'answer s',
  'total s',
  'presses',
  'next',
  'loops',
  'reopened',
  'changed',
  'discards',
  'optional',
  'edit',
] as const

/** A table Paul can paste. Times are seconds. */
export function tagLogTable(lines: TagLogLine[] = readTagLog()): string {
  const rows = lines.map((line) =>
    [
      line.mode,
      line.shots,
      line.server,
      line.fa ?? '',
      (line.answerMs / 1000).toFixed(1),
      (line.totalMs / 1000).toFixed(1),
      line.presses,
      line.nexts,
      line.loops,
      line.reopened,
      line.changed,
      line.discards,
      line.optional,
      line.edit ?? '',
    ].join('\t')
  )
  return [HEAD.join('\t'), ...rows].join('\n')
}

/**
 * Copies the log. The clipboard API is missing on a plain http address (a
 * phone on the dev server's network address), so a hidden text box is the
 * fallback there.
 */
export async function copyTagLog(text: string = tagLogTable()): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the text box */
  }
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  box.style.position = 'fixed'
  box.style.top = '0'
  box.style.opacity = '0'
  document.body.appendChild(box)
  box.select()
  box.setSelectionRange(0, text.length)
  let done = false
  try {
    done = document.execCommand('copy')
  } catch {
    done = false
  }
  box.remove()
  return done
}
