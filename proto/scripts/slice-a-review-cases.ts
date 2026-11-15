import {
  breakIndexes, serveBands, bandLine, openReview, pressReview, breakForReview, leaveIds, walkServes, expectedServer, checkSet, gapMarks,
  type ServeRally, type ReviewPress,
} from '@/features/tagging/continuity'
import { deleteRally, restoreRally, confirmServe, insertRallyAt, leaveMark, saveRally } from '@/features/tagging/matchOps'
import { pointRally, type RallyData, type Side } from '@/features/tagging/rally'

const Y: Side = 'me', S: Side = 'them'
const L = (s: Side) => (s === Y ? 'Y' : 'S')
const out: string[] = []
const say = (s: string) => out.push(s)
let fails = 0
let own = false
let reviewerChecks = 0
let reviewerFails = 0
let ownChecks = 0
let ownFails = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) fails++
  if (own) { ownChecks++; if (!ok) ownFails++ } else { reviewerChecks++; if (!ok) reviewerFails++ }
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}

const tag = (servers: string, checked: number[] = []): ServeRally[] =>
  servers.split(' ').map((c, i) => ({ id: `r${i + 1}`, server: c === 'Y' ? Y : S, winner: Y, ...(checked.includes(i + 1) ? { serveChecked: true } : {}) }))
const word = (rs: ServeRally[]) => rs.map((r) => L(r.server)).join(' ')
const br = (rs: ServeRally[], f: Side = Y) => breakIndexes(rs, f).map((i) => i + 1)
const bands = (rs: ServeRally[], f: Side = Y) => serveBands(rs, f).map((b) => `${b.from + 1}-${b.to + 1}`).join(', ') || 'none'

/** Drive a review with the truth: press "same" when the tagged server is the true one. truth is keyed by rally id. */
function review(rs: ServeRally[], from: number, truth: Record<string, Side>, f: Side = Y) {
  let st = openReview(rs, f, from - 1)
  const presses: string[] = []
  while (st.cursor !== null && !st.stopped) {
    const r = st.rallies[st.cursor]
    const p: ReviewPress = truth[r.id] === r.server ? 'same' : 'other'
    presses.push(`${r.id}:${p}`)
    st = pressReview(st, p)
  }
  return { st, presses: presses.join(' '), gaps: st.gaps.map((g) => `before r${g + 1}`).join(', ') || 'none' }
}
const truthOf = (rs: ServeRally[], t: string) => Object.fromEntries(rs.map((r, i) => [r.id, t.split(' ')[i] === 'Y' ? Y : S]))
const show = (title: string, rs: ServeRally[], f: Side = Y) => say(`${title}\n  tagged ${word(rs)} | breaks r${br(rs, f).join(',r') || '-'} | bands ${bands(rs, f)}`)
const rep = (x: ReturnType<typeof review>, f: Side = Y) =>
  say(`  presses ${x.presses} | stop ${x.st.stopped} | now ${word(x.st.rallies)} | breaks r${br(x.st.rallies, f).join(',r') || '-'} | gaps ${x.gaps}`)

// ---- C1 wrong first server, noticed at r3 by Switch
{
  const rs = tag('Y Y Y Y S S', [3]) // truth S S Y Y S S; r1 r2 taken on the app's word, Switch on r3
  show('C1 wrong server at set start (truth S S Y Y S S, first server set Y, Switch at r3)', rs)
  const x = review(rs, 3, truthOf(rs, 'S S Y Y S S')); rep(x, x.st.firstServer)
  check('servers end as the truth', word(x.st.rallies) === 'S S Y Y S S')
  // The reviewer's check walked with the old first server, which still breaks
  // at rally 1 after that rally is confirmed. Point 4 sets the first server,
  // so this copy reads the first server the review stored.
  const leftAt = br(x.st.rallies, x.st.firstServer)
  check('no break is left', leftAt.length === 0, leftAt.length ? `break left r${leftAt} under first ${L(x.st.firstServer)}` : '')
  // C1b: user Switched r1 itself
  const rb = tag('S S Y Y', [1])
  show('C1b first server wrong, Switch on r1, all rallies right', rb)
  const xb = review(rb, 1, truthOf(rb, 'S S Y Y')); rep(xb, xb.st.firstServer)
  check('band reads as one rally', bandLine(serveBands(rb, Y)[0]) === 'Serve order changed at rally 1')
}

// ---- C2 two separate mistakes in one set
{
  // truth Y Y S [S] Y Y S S Y [Y] S S Y ; tagged with Switch where noticed at once
  const rs = tag('Y Y S Y Y S S Y S S Y', [4, 9])
  const t = truthOf(rs, 'Y Y S Y Y S S Y S S Y')
  show('C2 two missing rallies (holes before r4 and before r9), each seen at once', rs)
  const late = review(rs, 9, t); rep(late)
  check('review of the later band offers gaps by r9', late.st.gaps.includes(8), `offered ${late.gaps}`)
  const early = review(rs, 4, t); rep(early)
  check('review of the earlier band offers gaps by r4', early.st.gaps.includes(3), `offered ${early.gaps}`)
  // same without the checked flags (as if both were taken... not reachable by tagging, but restore/add can do it)
  const rn = tag('Y Y S Y Y S S Y S S Y')
  const ln = review(rn, 9, t); say('  (no checked flags)'); rep(ln)
  check('later band, no flags: gaps by r9', ln.st.gaps.includes(8), `offered ${ln.gaps}`)
}

// ---- C3 mistake in the last rally
{
  const rs = tag('Y Y S S Y S', [6]) // Switch pressed by mistake on last rally: truth Y
  show('C3a Switch by mistake on the last rally', rs)
  const x = review(rs, 6, truthOf(rs, 'Y Y S S Y Y')); rep(x)
  check('one press, no break', x.st.shown.length === 1 && br(x.st.rallies).length === 0)
  const r2 = tag('Y Y S S Y Y Y', [7]) // real: last rally wrong server tagged by Switch (truth S) -> other fixes
  show('C3b last rally tagged with the wrong server and no Switch possible: Y Y S S Y Y [S tagged Y by Switch]', r2)
  const x2 = review(r2, 7, truthOf(r2, 'Y Y S S Y Y S')); rep(x2)
  check('one press, no break', x2.st.shown.length === 1 && br(x2.st.rallies).length === 0)
}

// ---- C4 deuce
{
  const pre: ServeRally[] = []
  for (let i = 0; i < 20; i++) pre.push({ id: `r${i + 1}`, server: expectedServer(pre, Y), winner: i % 2 ? S : Y })
  // from 10-10: truth Y S [Y] S Y S ; hole seen three rallies late. Tagged on app's word: r21 Y, r22 S, r23 (true S) app says Y -> tagged Y wrong,
  // r24 (true Y) app says S -> tagged S wrong, r25 (true S) app says Y -> Switch to S
  const mk = (n: number, s: Side, w: Side, c = false): ServeRally => ({ id: `r${n}`, server: s, winner: w, ...(c ? { serveChecked: true } : {}) })
  const rs = [...pre, mk(21, Y, Y), mk(22, S, S), mk(23, Y, Y), mk(24, S, S), mk(25, S, Y, true)]
  const t: Record<string, Side> = { ...Object.fromEntries(pre.map((r) => [r.id, r.server])), r21: Y, r22: S, r23: S, r24: Y, r25: S }
  say(`C4 deuce, hole before r23, seen two rallies late\n  tail ${word(rs.slice(20))} | breaks r${br(rs)} | bands ${bands(rs)}`)
  const x = review(rs, 25, t)
  say(`  presses ${x.presses} | stop ${x.st.stopped} | tail ${word(x.st.rallies.slice(20))} | breaks r${br(x.st.rallies).join(',r') || '-'} | gaps ${x.gaps}`)
  check('tail servers end as the truth S Y S after r22', word(x.st.rallies.slice(22)) === 'S Y S')
  check('one break left', br(x.st.rallies).length === 1, `breaks r${br(x.st.rallies)}`)
  check('the hole (gap before r23) is offered', x.st.gaps.includes(22), `offered ${x.gaps}`)
  check('winners moved only on swapped rallies', x.st.rallies.every((r, i) => (r.server !== rs[i].server) === (r.winner !== rs[i].winner)))
  // deuce, Switch by mistake mid deuce
  const r2 = [...pre, mk(21, Y, Y), mk(22, Y, S, true), mk(23, Y, Y), mk(24, S, S)]
  const t2: Record<string, Side> = { ...Object.fromEntries(pre.map((r) => [r.id, r.server])), r21: Y, r22: S, r23: Y, r24: S }
  say(`C4b deuce, Switch by mistake on r22, tagged on\n  tail ${word(r2.slice(20))} | breaks r${br(r2)} | bands ${bands(r2)}`)
  const lastBand = serveBands(r2, Y).slice(-1)[0]
  const x2 = review(r2, lastBand.to + 1, t2)
  say(`  from last band: presses ${x2.presses} | stop ${x2.st.stopped} | tail ${word(x2.st.rallies.slice(20))} | breaks r${br(x2.st.rallies).join(',r') || '-'} | gaps ${x2.gaps}`)
  check('review from the last band reaches and fixes r22', br(x2.st.rallies).length === 0)
}

// ---- C5 delete then restore, add: no other rally rewritten (through matchOps, the code the app calls)
{
  const mkR = (n: number, server: Side, t: number, extra: Partial<RallyData> = {}): RallyData => ({
    id: `r${n}`, videoId: 'v', server, winner: n % 2 ? Y : S, contacts: [t, t + 1], start: Math.max(0, t - 2), end: t + 1,
    ending: 'Winner', fa: null, shots: [{}, {}], highlight: false, ...extra,
  } as RallyData)
  const servers: Side[] = [Y, Y, S, S, Y, Y, S, S]
  const rallies = servers.map((s, i) => mkR(i + 1, s, 5 + i * 6, i === 2 ? { serveChecked: true } : {}))
  const m: any = { id: 'm', videos: [{ id: 'v', durationS: 200 }], sets: [{ setId: 1, firstServer: Y, rallies, draft: null }] }
  const snap = (mm: any) => JSON.stringify(mm.sets[0].rallies)
  const others = (mm: any, skip: string) => JSON.stringify(mm.sets[0].rallies.filter((r: RallyData) => r.id !== skip))
  const base = snap(m)
  say('C5 delete r4 then restore it (matchOps), then add a point, then confirmServe')
  const d = deleteRally(m, 1, 'r4')
  check('delete leaves every other rally byte for byte', others(d, 'r4') === others(m, 'r4'))
  say(`  after delete: ${word(d.sets[0].rallies)} | breaks r${br(d.sets[0].rallies)} | bands ${bands(d.sets[0].rallies)}`)
  const r = restoreRally(d, 1, 'r4')
  check('restore puts the set back byte for byte, same place', snap(r) === base)
  check('no band after restore', serveBands(r.sets[0].rallies, Y).length === 0)
  const pt = pointRally('p1', 'v', 22.01, expectedServer(d.sets[0].rallies, Y, 3), S)
  const a = insertRallyAt(d, 1, pt, 3)
  check('add point writes no other rally', others(a, 'p1') === snap(d))
  check('add point in the hole clears the break', br(a.sets[0].rallies).length === 0)
  const c = confirmServe(m, 1, 'r5', true)
  check('swap in review changes r5 only', others(c, 'r5') === others(m, 'r5'))
  const c5 = c.sets[0].rallies[4], o5 = m.sets[0].rallies[4]
  const { server: _s, winner: _w, serveChecked: _c, ...restC } = c5 as any; const { server: _s2, winner: _w2, ...restO } = o5 as any
  check('swap flips server and winner, sets checked, nothing else on r5', c5.server !== o5.server && c5.winner !== o5.winner && c5.serveChecked === true && JSON.stringify(restC) === JSON.stringify(restO))
  const k = confirmServe(m, 1, 'r5', false)
  check('same as tagged writes only the flag', k.sets[0].rallies[4].server === o5.server && k.sets[0].rallies[4].winner === o5.winner && others(k, 'r5') === others(m, 'r5'))
  const lv = leaveMark(d, 1, d.sets[0].rallies[br(d.sets[0].rallies)[0] - 1].id, 'serve')
  check('Leave it clears the band and writes one rally', serveBands(lv.sets[0].rallies, Y).length === 0)
  // delete a rally that was a deliberate (checked) server, restore
  const d3 = deleteRally(m, 1, 'r3'); const r3 = restoreRally(d3, 1, 'r3')
  check('checked flag survives delete and restore', r3.sets[0].rallies[2].serveChecked === true && snap(r3) === base)
  // hint not in count
  const far = servers.slice(0, 4).map((s, i) => mkR(i + 1, s, i === 3 ? 60 : 5 + i * 6))
  const cs = checkSet(far, Y, [{ id: 'v', index: 0, offset: 0, duration: 200 }], null, false)
  check('long gap is a mark of kind gap, count 0, no band', cs.marks.length === 1 && cs.marks[0].kind === 'gap' && cs.checkCount === 0 && cs.bands.length === 0)
}

// ---- C6 Switch on a live rally, then tagging on
{
  // truth Y Y S S Y Y S S. At r3 the tagger hits Switch by mistake (tagged Y, checked). Then follows the app until it looks wrong.
  // app after r3(Y, break, turn1) proposes Y for r4: truth S -> tagger Switches (S, checked). r5: app proposes S (turn 2 of S)?:
  const rs: ServeRally[] = []
  const truth: Side[] = [Y, Y, S, S, Y, Y, S, S]
  truth.forEach((t, i) => {
    const prop = expectedServer(rs, Y)
    if (i === 2) rs.push({ id: `r${i + 1}`, server: Y, winner: Y, serveChecked: true }) // the mistake
    else if (prop === t) rs.push({ id: `r${i + 1}`, server: t, winner: Y })
    else rs.push({ id: `r${i + 1}`, server: t, winner: Y, serveChecked: true }) // corrected by Switch
  })
  show('C6 Switch by mistake on live r3, then every later rally tagged with its true server (Switch where the app was wrong)', rs)
  say(`  checked: ${rs.filter((r) => r.serveChecked).map((r) => r.id).join(' ')}`)
  const t = Object.fromEntries(rs.map((r, i) => [r.id, truth[i]]))
  for (const b of serveBands(rs, Y)) {
    const x = review(rs, b.to + 1, t)
    say(`  Review from band ${b.from + 1}-${b.to + 1}:`); rep(x)
    check(`band ${b.from + 1}-${b.to + 1}: review ends with no break`, br(x.st.rallies).length === 0, `r3 ${x.st.shown.includes(2) ? 'was' : 'was never'} shown`)
  }
}

// ---- C7 builder's doubt: one rally switched in the middle of a correct set
{
  const rs = tag('Y Y S Y Y Y S S', [4]) // r4 edited with Switch, truth S
  show('C7 one rally switched mid set (edit r4 S -> Y), truth Y Y S S Y Y S S', rs)
  const t = truthOf(rs, 'Y Y S S Y Y S S')
  for (const b of serveBands(rs, Y)) {
    const x = review(rs, b.to + 1, t)
    say(`  Review from band ${b.from + 1}-${b.to + 1}:`); rep(x)
    check(`band ${b.from + 1}-${b.to + 1}: review ends with no break`, br(x.st.rallies).length === 0, `r4 ${x.st.shown.includes(3) ? 'was' : 'was never'} shown`)
  }
  const nf = tag('Y Y S Y Y Y S S') // same without the flag (e.g. a swap made before this build)
  say('  same, r4 not flagged:'); say(`  bands ${bands(nf)}`)
  const x = review(nf, 7, t); rep(x)
  check('unflagged: review from the last band fixes it', br(x.st.rallies).length === 0)
}

// ---- C8 a true missing rally mid set is one break (control for C7)
{
  const rs = tag('Y Y S Y Y S S Y Y') // truth Y Y S [S] Y Y S S Y Y, all on the app's word after a Switch at r4
  show('C8 control: one missing rally mid set, tagged on', rs)
  check('exactly one break', br(rs).length === 1)
}

// ---- C9 purity: pressReview does not write the rallies passed in
{
  const rs = tag('Y Y S S Y S'); const before = JSON.stringify(rs)
  let st = openReview(rs, Y, 5); st = pressReview(st, 'other'); st = pressReview(st, 'same')
  say('C9 pressReview leaves its input alone'); check('input unchanged', JSON.stringify(rs) === before)
}

// ---- P3 two bands: a review stays on the band it opened, and Leave it leaves only that one
{
  own = true
  const rs = tag('Y Y S Y Y S S Y S S Y', [4, 9])
  const found = serveBands(rs, Y)
  say(`P3 two bands, review each one\n  bands ${bands(rs)}`)
  check('two bands', found.length === 2, bands(rs))
  const later = review(rs, found[1].to + 1, truthOf(rs, 'Y Y S Y Y S S Y S S Y'))
  rep(later)
  const earlierBreak = found[0].to
  check('later review offers the gap at its own break', later.st.gaps.includes(found[1].to), later.gaps)
  check('later review does not offer the earlier break', !later.st.gaps.includes(earlierBreak), later.gaps)
  const at = breakForReview(breakIndexes(later.st.rallies, later.st.firstServer), later.st.openedAt)
  const left = later.st.rallies.map((r, i) => (i === at ? { ...r, left: ['serve' as const] } : r))
  const after = serveBands(left, Y)
  check('Leave it clears the later band only', after.length === 1 && after[0].to === earlierBreak, bands(left))
  const early = review(rs, found[0].to + 1, truthOf(rs, 'Y Y S Y Y S S Y S S Y'))
  check('earlier review offers the gap at its own break', early.st.gaps.includes(found[0].to), early.gaps)
  const joined = tag('Y Y S Y Y Y S S', [4])
  const jb = serveBands(joined, Y)
  const ids = leaveIds(joined, Y, jb[0].breakId)
  const marked = joined.map((r) => (ids.includes(r.id) ? { ...r, left: ['serve' as const] } : r))
  check('one switched rally is one band', jb.length === 1, bands(joined))
  check(
    'Leave it on that band clears it and writes only its breaks',
    serveBands(marked, Y).length === 0 && ids.length === breakIndexes(joined, Y).length && ids.length > 1
  )
}

// ---- P4 wrong first server: confirming rally 1 sets the first server, and rally 1 is not a band
{
  const rs = tag('Y Y Y Y S S', [3])
  const x = review(rs, 3, truthOf(rs, 'S S Y Y S S'))
  say(`P4 swap rally 1\n  presses ${x.presses} | first ${L(x.st.firstServer)} | bands ${bands(x.st.rallies, x.st.firstServer)}`)
  check('rally 1 swap sets the first server', x.st.firstServer === S && x.st.rallies[0].server === S)
  check('no band is left at rally 1', serveBands(x.st.rallies, x.st.firstServer).every((b) => b.to !== 0 && b.from !== 0) && serveBands(x.st.rallies, x.st.firstServer).length === 0)
  const rb = tag('S S Y Y', [1])
  const xb = review(rb, 1, truthOf(rb, 'S S Y Y'))
  say(`P4 confirm rally 1\n  presses ${xb.presses} | first ${L(xb.st.firstServer)} | bands ${bands(xb.st.rallies, xb.st.firstServer)}`)
  check('confirming rally 1 sets the first server', xb.st.firstServer === S)
  check('confirming rally 1 leaves no band', serveBands(xb.st.rallies, xb.st.firstServer).length === 0)
}

export const report = () => ({ text: out.join('\n'), fails, reviewerChecks, reviewerFails, ownChecks, ownFails })
