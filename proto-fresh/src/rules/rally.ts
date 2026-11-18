export type Side = 'me' | 'them'
export type Code = 'FHA' | 'BHA' | 'FHC' | 'BHC'
export type EndKind = 'Winner' | 'Net' | 'Long' | 'Wide'
export type Depth = 'Short' | 'Long'
export type Part = 'Opening' | 'Attack' | 'Rally' | 'End'
export type Who = Side | 'none'
export type Mark = 'now' | 'done' | 'todo' | 'off'
export type Span = { part: Part; from: number; to: number }
export type Contact = { id: number; t: number }
/** 'end' is the last cell, 'serve' cell 1, a number is the stroke cell k. */
export type Question = 'end' | 'serve' | number

export type Draft = {
  set: number
  no: number
  one: boolean
  server: Side
  contacts: Contact[]
  tags: Record<number, Code>
  depth: Record<number, Depth>
  end: EndKind | null
  point: Side | null
  kept: boolean
  first: Who | null
  review: Part[]
  star: boolean
  q: Question | null
  check: boolean
  add: boolean
  more: boolean
  cut: Contact | null
  note: string | null
  saved: boolean
  score: [number, number]
}

export const NAMES: Record<Side, string> = { me: 'You', them: 'Kim' }
export const ENDS: EndKind[] = ['Winner', 'Net', 'Long', 'Wide']
export const PARTS: Part[] = ['Opening', 'Attack', 'Rally', 'End']

export const other = (s: Side): Side => (s === 'me' ? 'them' : 'me')
export const isAtt = (c?: Code) => c === 'FHA' || c === 'BHA'
export const isWin = (e: EndKind | null) => e === 'Winner'
export const nOf = (d: Draft) => d.contacts.length
export const idAt = (d: Draft, k: number) => d.contacts[k - 1]?.id
export const tagAt = (d: Draft, k: number): Code | undefined => d.tags[idAt(d, k)]
export const depthOf = (d: Draft): Depth | undefined => d.depth[idAt(d, 1)]
export const hit = (d: Draft, k: number): Side => (k % 2 === 1 ? d.server : other(d.server))
export const possOf = (s: Side) => (s === 'me' ? 'yours' : `${NAMES[s]}'s`)

/** Shots 1 to 4 and the last 3 are asked. Shots 5 to n-3 never are. */
export const asked = (k: number, n: number) => k <= 4 || k >= n - 2
export const afterAttack = (d: Draft, k: number) => k >= 3 && isAtt(tagAt(d, k - 1))

export function roleOf(d: Draft, k: number, c: Code): 'Attack' | 'Counter' | 'Control' {
  if (!isAtt(c)) return 'Control'
  return afterAttack(d, k) ? 'Counter' : 'Attack'
}

export function hintOf(d: Draft): Side | null {
  const n = nOf(d)
  if (d.one || !d.end || n === 0) return null
  return isWin(d.end) ? hit(d, n) : other(hit(d, n))
}

export const isMis = (d: Draft) => !d.one && d.point !== null && d.end !== null && !d.kept && d.point !== hintOf(d)

export function mismatchText(d: Draft): string {
  const n = nOf(d)
  if (!d.point || !d.end) return ''
  const shot = isWin(d.end) ? `shot ${n}, the winner,` : `shot ${n}, the ${d.end.toLowerCase()} error,`
  return `Point to ${NAMES[d.point]}, but ${shot} is ${possOf(hit(d, n))}.`
}

/** Stroke cells asked after End and Serve, in rally order. */
export function strokeCells(d: Draft): number[] {
  const n = nOf(d)
  const out: number[] = []
  for (let k = 2; k <= n - 1; k++) if (asked(k, n)) out.push(k)
  return out
}

export function questionsOf(d: Draft): Question[] {
  const out: Question[] = ['end']
  if (nOf(d) >= 2) out.push('serve')
  return [...out, ...strokeCells(d)]
}

export const unasked = (d: Draft) => {
  const n = nOf(d)
  const out: number[] = []
  for (let k = 5; k <= n - 3; k++) out.push(k)
  return out
}

export const asksRally = (d: Draft) => unasked(d).length > 0 && !isAtt(tagAt(d, 2)) && !isAtt(tagAt(d, 3)) && !isAtt(tagAt(d, 4))
export const rallyPage = (d: Draft, q: Question | null) => asksRally(d) && q === nOf(d) - 2
export function nobodyHidden(d: Draft) {
  const n = nOf(d)
  for (let k = Math.max(2, n - 2); k <= n; k++) if (isAtt(tagAt(d, k))) return true
  return false
}

export function openerOf(d: Draft): number | 'none' | 'unknown' {
  const n = nOf(d)
  for (let k = 2; k <= n; k++) {
    if (!asked(k, n)) {
      if (d.first === 'none') continue
      return 'unknown'
    }
    const c = tagAt(d, k)
    if (!c) return 'unknown'
    if (isAtt(c)) return k
  }
  return 'none'
}

export function partsOf(d: Draft): Span[] {
  const n = nOf(d)
  if (n <= 0) return []
  if (n === 1) return [{ part: 'Opening', from: 1, to: 1 }]
  const out: Span[] = []
  const add = (part: Part, from: number, to: number) => {
    if (to >= from && from >= 1) out.push({ part, from, to })
  }
  const o = openerOf(d)
  if (typeof o === 'number') {
    add('Opening', 1, o - 1)
    if (n < o + 5) {
      add('Attack', o, n)
      return out
    }
    add('Attack', o, o + 2)
    add('Rally', o + 3, n - 3)
    add('End', n - 2, n)
    return out
  }
  const endFrom = Math.max(2, n - 2)
  if (o === 'none') {
    add('Opening', 1, endFrom - 1)
    add('End', endFrom, n)
    return out
  }
  const openTo = Math.max(1, Math.min(4, n - 3, endFrom - 1))
  add('Opening', 1, openTo)
  add('Rally', openTo + 1, endFrom - 1)
  add('End', endFrom, n)
  return out
}

export function faSide(d: Draft): Who | null {
  const o = openerOf(d)
  if (typeof o === 'number') return hit(d, o)
  if (o === 'none') return 'none'
  return d.first
}

export const pointDone = (d: Draft) => d.end !== null && d.point !== null && !isMis(d)
export const endDone = (d: Draft) => pointDone(d) && (nOf(d) < 2 || Boolean(tagAt(d, nOf(d))))

export function isDone(d: Draft, q: Question): boolean {
  if (q === 'end') return endDone(d)
  if (q === 'serve') return Boolean(depthOf(d))
  return Boolean(tagAt(d, q))
}

export const routeOf = (d: Draft): Question | null => questionsOf(d).find((q) => !isDone(d, q)) ?? null
export const cellOf = (d: Draft, q: Question) => (q === 'end' ? nOf(d) : q === 'serve' ? 1 : q)

export function questionFor(d: Draft, k: number): Question | null {
  const n = nOf(d)
  if (k === n) return 'end'
  if (k === 1) return 'serve'
  if (asked(k, n)) return k
  if (asksRally(d)) return n - 2
  return null
}

export function canOpen(d: Draft, k: number): boolean {
  const q = questionFor(d, k)
  if (q === null) return false
  if (isMis(d)) return q === 'end'
  return q === 'end' || pointDone(d)
}

export function markOf(d: Draft, k: number): Mark {
  const q = questionFor(d, k)
  if (q === null) return 'off'
  const rallyCell = !asked(k, nOf(d))
  if (!d.saved && d.q !== null && q === d.q) return 'now'
  if (rallyCell) {
    if (d.first !== null) return 'done'
    return d.saved || tagAt(d, nOf(d) - 2) ? 'off' : 'todo'
  }
  if (isDone(d, q)) return 'done'
  return d.saved ? 'off' : 'todo'
}

export function tidy(d: Draft): Draft {
  const alive = partsOf(d).map((p) => p.part)
  return { ...d, first: asksRally(d) ? d.first : null, review: d.review.filter((p) => alive.includes(p)) }
}

export const finish = (d: Draft): Draft => ({ ...d, saved: true, q: null, check: false, add: false, more: false, cut: null, note: null })

/** After an answer: stay while the open question is not done, else open the first question not done, else save. */
export function settle(d: Draft, advance: boolean): Draft {
  let x = tidy(d)
  if (isMis(x)) return { ...x, q: 'end' }
  x = { ...x, more: false }
  if (x.q === null || !questionsOf(x).includes(x.q)) x = { ...x, q: routeOf(x) ?? 'end' }
  if (!advance) return x
  if (x.q !== null && !isDone(x, x.q)) return x
  const r = routeOf(x)
  return r !== null ? { ...x, q: r } : finish(x)
}

export function deleteContact(d: Draft, k: number): Draft {
  const n = nOf(d)
  if (n < 2) return d
  const c = d.contacts[k - 1]
  const serveLost = k === 1 && Boolean(d.depth[c.id])
  const tags = { ...d.tags }
  delete tags[c.id]
  const depth = { ...d.depth }
  delete depth[c.id]
  const y: Draft = {
    ...d,
    contacts: d.contacts.filter((x) => x.id !== c.id),
    tags,
    depth,
    kept: false,
    cut: k === n && !depthOf(d) ? c : k === 1 ? null : d.cut,
    note: serveLost ? 'Serve length went with that contact.' : d.note,
  }
  return settle(y, false)
}

/** Puts the contact Delete last took back, and deletes contact 1 instead. */
export function tossInstead(d: Draft): Draft {
  if (!d.cut) return d
  const lastId = d.contacts[d.contacts.length - 1].id
  const tags = { ...d.tags }
  if (tags[lastId]) {
    tags[d.cut.id] = tags[lastId]
    delete tags[lastId]
  }
  delete tags[d.contacts[0].id]
  return settle({ ...d, contacts: [...d.contacts.slice(1), d.cut], tags, cut: null, note: null, q: 'serve' }, false)
}

export function addContact(d: Draft, t: number, id: number): Draft {
  const contacts = [...d.contacts, { id, t }].sort((a, b) => a.t - b.t)
  const afterEnd = contacts[contacts.length - 1].id === id
  return settle({ ...d, contacts, add: false, kept: false, end: afterEnd ? null : d.end, note: afterEnd ? 'New last shot. End again.' : d.note }, true)
}

export function setPoint(d: Draft, s: Side): Draft {
  if (!d.end) return d
  let server = d.server
  if (d.one) {
    const last = isWin(d.end) ? s : other(s)
    server = nOf(d) % 2 === 1 ? last : other(last)
  }
  return settle({ ...d, point: s, server }, true)
}

export function togglePart(d: Draft, p: Part): Draft {
  const have = d.review.includes(p)
  const review = partsOf(d)
    .map((x) => x.part)
    .filter((x) => (x === p ? !have : d.review.includes(x)))
  return { ...d, review }
}

export function blankDraft(base: Pick<Draft, 'set' | 'no' | 'one' | 'server' | 'contacts' | 'score'>): Draft {
  return {
    ...base,
    tags: {},
    depth: {},
    end: null,
    point: null,
    kept: false,
    first: null,
    review: [],
    star: false,
    q: 'end',
    check: false,
    add: false,
    more: false,
    cut: null,
    note: null,
    saved: false,
  }
}

export const endText = (e: EndKind) => (isWin(e) ? 'Winner' : `${e} error`)

export function strokeName(d: Draft, k: number): string | null {
  const c = tagAt(d, k)
  if (!c) return null
  return `${c.slice(0, 2)} ${roleOf(d, k, c)}`
}

export function counters(d: Draft): number[] {
  const out: number[] = []
  for (let k = 3; k <= nOf(d); k++) {
    const c = tagAt(d, k)
    if (c && roleOf(d, k, c) === 'Counter') out.push(k)
  }
  return out
}

export function summaryBits(d: Draft): string[] {
  const n = nOf(d)
  const bits: string[] = []
  if (d.point) bits.push(`${NAMES[d.point]} won`)
  if (d.end) bits.push(endText(d.end))
  bits.push(`${n} ${n === 1 ? 'shot' : 'shots'}`)
  const o = openerOf(d)
  if (typeof o === 'number') bits.push(`First attack ${o}, ${NAMES[hit(d, o)]}`)
  else if (d.first === 'none' || o === 'none') bits.push(n > 1 ? 'No attack' : '')
  else if (d.first) bits.push(`First attack ${NAMES[d.first]}`)
  const cs = counters(d)
  if (cs.length) bits.push(`Counter ${cs.join(', ')}`)
  if (d.kept) bits.push('Check the point')
  return bits.filter(Boolean)
}

export function answersOf(d: Draft): { k: number; text: string }[] {
  const n = nOf(d)
  const out: { k: number; text: string }[] = []
  if (n >= 2 && depthOf(d)) out.push({ k: 1, text: `${depthOf(d)} serve` })
  if (n === 1) out.push({ k: 1, text: 'Serve' })
  for (let k = 2; k <= n; k++) {
    const s = strokeName(d, k)
    if (s) out.push({ k, text: s })
  }
  return out
}

/** Table tennis order: two serves each, one each from 10 all. */
export function serverFor(first: Side, points: number): Side {
  const block = points < 20 ? Math.floor(points / 2) : points - 10
  return block % 2 === 0 ? first : other(first)
}

export function scoreOf(rallies: Draft[]): [number, number] {
  let a = 0
  let b = 0
  rallies.forEach((r) => (r.point === 'me' ? a++ : r.point === 'them' ? b++ : null))
  return [a, b]
}

export const setOver = ([a, b]: [number, number]) => (a >= 11 || b >= 11) && Math.abs(a - b) >= 2
