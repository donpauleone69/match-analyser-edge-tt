// The rule reviewer's cases, kept with the repo. Source:
// internal/proto-tagging-suites/rules-review-cases.ts in the Project store, as written, with two changes:
// D1 is asked of the saved rally (strokes are kept in the draft and left out at Save), and `failed` is exported.
// Run: sh proto/scripts/rules-fixes.sh
import * as R from '@/features/tagging/rally'
import * as SC from '@/features/tagging/script'
import * as K from '@/features/tagging/shotKeys'

const r: any = R
const P3 = typeof r.switchOf === 'function'
const out: string[] = []
let fails = 0
const say = (s: string) => out.push(s)
const check = (name: string, ok: boolean, detail = '') => { if (!ok) fails++; say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const J = (x: unknown) => JSON.stringify(x)

/** A closed rally of n taps starting at 10s, 0.8s apart. */
function tapped(n: number, server: R.Side = 'me'): R.Draft {
  let d = R.emptyDraft('v', server)
  for (let i = 0; i < n; i++) d = R.addContact(d, Math.round((10 + i * 0.8) * 100) / 100)
  return { ...d, closed: true }
}
const ws = (d: R.Draft, shot: number, wing: 'BH' | 'FH', stroke: string) => R.patchShot(R.patchShot(d, shot, { wing }), shot, { stroke })
const strokes = (d: R.Draft) => d.shots.map((s) => s.stroke ?? '-').join(' ')
const state = (d: R.Draft) => `stage ${R.stageOf(d)} fa ${d.fa} noAttack ${d.noAttack} strokes [${strokes(d)}]`

say(`== reviewer's cases, ${P3 ? 'pass 3 rules' : 'pass 2 rules'} ==`)

// ---------- shared behaviours (same lines printed on both tags, compared by hand) ----------
say('A. Chosen behaviours')
{
  const d = tapped(5)
  check('rally starts 2s before the serve contact', R.rallyStart(d) === 8 && R.RALLY_LEAD_S === 2)
  check('rally ends 1s after the last contact', Math.abs(R.rallyEnd(d) - (10 + 4 * 0.8 + 1)) < 1e-9)
  check('tap time takes 0.3s off and never goes behind the floor', R.captureContactTime(12, 0) === 11.7 && R.captureContactTime(12, 11.9) === 11.9)
  const order: string[] = []
  let x = d
  order.push(R.stageOf(x)); x = R.setEnding(x, 'Winner')
  order.push(R.stageOf(x)); x = ws(x, 5, 'FH', 'Loop')
  order.push(R.stageOf(x)); x = R.markFa(x, 3)
  order.push(R.stageOf(x)); x = ws(x, 3, 'BH', 'Flick')
  order.push(R.stageOf(x))
  check('step order result, end shot, pick first attack, first attack shot, ready', order.join(' > ') === 'result > endShot > pickFa > faShot > ready', order.join(' > '))
  const saved = R.rallyFromDraft(x, 'r1')!
  say(`  saved: ${J({ server: saved.server, winner: saved.winner, fa: saved.fa, start: saved.start, end: saved.end, contacts: saved.contacts, shots: saved.shots, ending: saved.ending })}`)
  check('saved rally is what was tapped and answered', saved.winner === 'me' && saved.fa === 3 && J(saved.contacts) === J(d.contacts) && saved.shots[4].stroke === 'Loop' && saved.shots[2].stroke === 'Flick' && saved.shots[4].wing === 'FH' && saved.shots[2].wing === 'BH')
  const back = R.draftFromRally(saved)
  const again = R.rallyFromDraft(back, 'r1')!
  check('open and save again without a change gives the same rally', J(again) === J(saved), `${J(again)}`)
  check('winner: error on an even shot by the receiver gives the server the point', R.winnerOf({ server: 'me', contacts: [1, 2], ending: 'Long' }) === 'me')
  check('swap flips server and winner only', (() => { const s = R.swapPlayers(saved); const { server: a, winner: b, ...rest } = s as any; const { server: c, winner: e, ...rest0 } = saved as any; return a !== c && b !== e && J(rest) === J(rest0) })())
  check('lets: no Let ending exists', !(R.ENDINGS as readonly string[]).includes('Let'), R.ENDINGS.join(','))
}

say('B. Where the two versions may differ (read these lines against the other tag)')
{
  // three shots, No attack, then an attacking end stroke
  let d = R.setEnding(tapped(3), 'Winner')
  d = R.patchShot(d, 3, { wing: 'FH' })
  d = R.toggleNoAttack(d)
  d = R.patchShot(d, 3, { stroke: 'Loop' })
  say(`  B1 three shots, No attack then end shot Loop: ${state(d)}`)
  // a saved rally of that shape, opened and touched
  const old: R.RallyData = { id: 'x', videoId: 'v', server: 'me', contacts: [10, 10.8, 11.6], start: 8, end: 12.6, ending: 'Winner', fa: null, shots: [{}, {}, { wing: 'FH', stroke: 'Loop' }], winner: 'me', highlight: false }
  const opened = R.draftFromRally(old)
  const touched = R.patchShot(opened, 1, { high: true })
  say(`  B2 saved rally, no first attack, end shot Loop. Opened: ${state(opened)}. After marking the serve High: ${state(touched)} canSave ${R.canSave(touched)}`)
  // moving the first attack later over shots that carry strokes
  let m = R.setEnding(tapped(6), 'Winner')
  m = ws(m, 6, 'FH', 'Smash'); m = R.markFa(m, 2); m = ws(m, 2, 'BH', 'Flick'); m = ws(m, 3, 'BH', 'Block'); m = ws(m, 4, 'FH', 'Loop')
  const moved = R.markFa(R.markFa(m, 2), 5) // clear, then pick 5
  say(`  B3 first attack 2 with strokes on 2,3,4, then moved to 5: before [${strokes(m)}] after [${strokes(moved)}] fa ${moved.fa}`)
  const na = R.toggleNoAttack(R.toggleNoAttack({ ...m, fa: null }))
  say(`  B4 same rally, first attack cleared, No attack pressed then pressed again: [${strokes(na)}] noAttack ${na.noAttack}`)
  // pick a first attack on a shot tagged Push / Block
  let p = R.setEnding(tapped(4), 'Long'); p = ws(p, 4, 'BH', 'Push')
  say(`  B5 end shot 4 is Push, pick shot 4 as first attack: fa ${R.markFa(p, 4).fa}`)
  // two shots
  let t = R.setEnding(tapped(2), 'Long')
  say(`  B6 two shots, end Block: ${state(ws(t, 2, 'BH', 'Block'))} | end Loop: ${state(ws(t, 2, 'BH', 'Loop'))}`)
  const t2 = R.patchShot(ws(t, 2, 'BH', 'Loop'), 2, { stroke: 'Push' })
  say(`  B7 two shots, Loop then changed straight to Push (no flip): ${state(t2)}`)
  // delete last on a No attack rally
  let u = R.setEnding(tapped(4), 'Long'); u = ws(u, 4, 'BH', 'Push'); u = R.toggleNoAttack(u)
  say(`  B8 four shots No attack, Delete last: ${state(R.undoClosedContact(u))}`)
  say(`  B9 shot loop for shot 3 of 5 (contacts 10, 10.8, 11.6, 12.4, 13.2): ${J(R.shotWindow(tapped(5), 3))}`)
  say(`  B10 miss reasons: ${R.MISS_REASONS.join(', ')}`)
}

if (P3) {
  say('C. Stroke switch rule (pass 3 only)')
  const sides = (d: R.Draft) => d.contacts.map((_, i) => (i === 0 ? 'serve' : `${r.switchOf(d, i + 1).side[0].toUpperCase()}${r.switchOf(d, i + 1).fixed ? '!' : ''}`)).join(' ')
  let d = R.setEnding(tapped(7), 'Winner')
  d = R.markFa({ ...d }, 4)
  check('before the first attack Defensive fixed, first attack Offensive fixed, after it Offensive free', sides(d) === 'serve D! D! O! O O O', sides(d))
  const push5 = R.patchShot(d, 5, { stroke: 'Push' })
  check('Push on shot 5 turns 6 and 7 Defensive', sides(push5) === 'serve D! D! O! D D D', sides(push5))
  const block6 = R.patchShot(push5, 6, { stroke: 'Block' })
  check('Block on shot 6 changes nothing', sides(block6) === 'serve D! D! O! D D D', sides(block6))
  const loop6 = R.patchShot(push5, 6, { stroke: 'Loop' })
  check('Loop on shot 6 turns 7 back to Offensive', sides(loop6) === 'serve D! D! O! D O O', sides(loop6))
  const blockAfterFa = R.patchShot(d, 5, { stroke: 'Block' })
  check('Block straight after the first attack: later shots stay Offensive', sides(blockAfterFa) === 'serve D! D! O! O O O', sides(blockAfterFa))
  const na = R.toggleNoAttack(R.setEnding(tapped(5), 'Long'))
  check('No attack: every shot Defensive and fixed, end shot included', sides(na) === 'serve D! D! D! D!', sides(na))
  check('Block is in both lists, in the same cell', r.strokeCells('offensive', false)[0] === 'Block' && r.strokeCells('defensive', false)[0] === 'Block')
  check('first attack cells: no Block, four strokes, Block cell left empty', J(r.strokeCells('offensive', true)) === J([null, 'Flick', 'Loop', 'Drive', 'Smash']))
  check('defensive cells: Block, Lob, Push, Chop, empty', J(r.strokeCells('defensive', false)) === J(['Block', 'Lob', 'Push', 'Chop', null]))
  for (const s of ['Block', 'Lob', 'Push', 'Chop']) {
    const x = R.patchShot(R.setEnding(tapped(5), 'Long'), 3, { stroke: s })
    check(`a shot tagged ${s} cannot be picked as the first attack`, R.markFa(x, 3).fa === null)
  }
  // the rule itself, not the cells: can a first attack be given Block?
  const faBlock = R.toggleShotField(d, 4, 'stroke', 'Block')
  check('RULE GUARD: Block put on the first attack shot is refused by the rule', faBlock.shots[3].stroke !== 'Block' || faBlock.fa !== 4, `fa ${faBlock.fa}, shot 4 stroke ${faBlock.shots[3].stroke}, stage ${R.stageOf(R.patchShot(faBlock, 4, { wing: 'FH' }))}`)
  const viaKey = K.applyShotKey(d, 4, 'x')
  check('key X on the first attack does nothing', viaKey === null)
  // guess at the end shot step
  const g = (n: number, e: R.Ending) => r.switchOf(R.setEnding(tapped(n), e), n).side
  check('end shot before the first attack is known: Winner or 3+ shots Offensive, two shots not a winner Defensive', g(2, 'Winner') === 'offensive' && g(2, 'Long') === 'defensive' && g(3, 'Long') === 'offensive' && g(5, 'Wide') === 'offensive')
  // flip
  const withLoop = R.patchShot(d, 6, { stroke: 'Loop' })
  const fl = r.flipSwitch(withLoop, 6)
  check('flip clears the stroke on that shot only', fl.shots[5].stroke === undefined && J(fl.shots.filter((_: unknown, i: number) => i !== 5)) === J(withLoop.shots.filter((_, i) => i !== 5)))
  check('flip on Block leaves the draft as it is', r.flipSwitch(blockAfterFa, 5) === blockAfterFa)
  check('flip on a fixed switch does nothing', r.flipSwitch(d, 4) === d && r.flipSwitch(d, 3) === d)
  let two = ws(R.setEnding(tapped(2), 'Winner'), 2, 'FH', 'Loop')
  const twoFlip = r.flipSwitch(two, 2)
  check('two shots: flip clears the stroke and the first attack answer, Save goes dark', twoFlip.fa === null && !twoFlip.noAttack && !R.canSave(twoFlip) && R.stageOf(twoFlip) === 'endShot', state(twoFlip))
  check('two shots: Push after the flip means No attack', R.patchShot(twoFlip, 2, { stroke: 'Push' }).noAttack === true)
  check('two shots: Block means No attack on either side', ws(R.setEnding(tapped(2), 'Winner'), 2, 'FH', 'Block').noAttack === true)
  // flip on the end shot when the first attack is the end shot
  let endFa = ws(R.setEnding(tapped(4), 'Winner'), 4, 'FH', 'Loop'); endFa = R.markFa(endFa, 4)
  check('end shot that is the first attack: switch Offensive fixed, ready', J(r.switchOf(endFa, 4)) === J({ side: 'offensive', fixed: true }) && R.canSave(endFa), state(endFa))

  say('D. Saved data against what was answered (pass 3 only)')
  // hidden strokes after Add contact past the end of a No attack rally
  let h = R.setEnding(tapped(4), 'Long'); h = ws(h, 4, 'BH', 'Push'); h = R.toggleNoAttack(h)
  const ins = r.insertContact(h, 13).draft as R.Draft
  const insDone = ws(R.setEnding(ins, 'Long'), 5, 'FH', 'Chop')
  const insSaved = R.rallyFromDraft(insDone, 'd1')
  check('Add contact after the end shot of a No attack rally: the saved rally keeps no hidden stroke on the old end shot', insSaved !== null && (!insSaved.shots[3].stroke || r.showsStroke(insDone, 4)), `${state(insDone)}; shot 4 shows a stroke row: ${r.showsStroke(insDone, 4)}; saved shot 4: ${J(insSaved?.shots[3])}`)
  // Change first attack (screen sets fa null), then press on a shot with a defensive stroke
  let c = R.setEnding(tapped(6), 'Winner'); c = ws(c, 6, 'FH', 'Smash'); c = R.markFa(c, 3); c = ws(c, 3, 'FH', 'Loop'); c = ws(c, 4, 'BH', 'Block'); c = ws(c, 5, 'BH', 'Push')
  const changed: R.Draft = { ...c, fa: null, noAttack: false }
  say(`  D2 Change first attack on [${strokes(c)}]: press on shot 4 gives fa ${R.markFa(changed, 4).fa}, on shot 5 gives fa ${R.markFa(changed, 5).fa}, on shot 6 gives fa ${R.markFa(changed, 6).fa} strokes [${strokes(R.markFa(changed, 6))}]`)
  check('first attack moved from 3 to 6 and back to 3 keeps what was answered on 3, 4, 5', strokes(R.markFa({ ...R.markFa(changed, 6), fa: null }, 3)) === strokes(c), `[${strokes(R.markFa({ ...R.markFa(changed, 6), fa: null }, 3))}] was [${strokes(c)}]`)
  // pass 2 demo data through the pass 3 rule
  let total = 0, naAttackEnd = 0, faNotAttack = 0, strokeBeforeFa = 0, deadOnTouch = 0
  for (const seed of [11, 31, 47]) {
    const script = (SC as any).matchScript(seed)
    const rallies: R.RallyData[] = (SC as any).ralliesFromScript('v', script, 0, 40)
    for (const ra of rallies) {
      total++
      const n = ra.contacts.length
      const end = ra.shots[n - 1]?.stroke ?? ''
      if (ra.fa === null && n >= 2 && r.isAttackStroke(end)) naAttackEnd++
      if (ra.fa !== null && ra.shots[ra.fa - 1]?.stroke && !r.isAttackStroke(ra.shots[ra.fa - 1].stroke)) faNotAttack++
      if (ra.fa !== null && ra.shots.some((s, i) => i > 0 && i < ra.fa! - 1 && s.stroke)) strokeBeforeFa++
      const o = R.draftFromRally(ra)
      if (R.canSave(o) && !R.canSave(R.patchShot(o, 1, { high: true }))) deadOnTouch++
    }
  }
  say(`  D4 demo rallies read ${total}: no first attack but attacking end stroke ${naAttackEnd}; first attack with a non attacking stroke ${faNotAttack}; stroke before the first attack ${strokeBeforeFa}; Save goes dark after one unrelated edit ${deadOnTouch}`)
  check('no demo rally loses Save from an unrelated edit', deadOnTouch === 0)

  say('E. First attack pick (the formula is in TagSetScreen.tsx:1316, copied here because it cannot be imported)')
  const onScreen = (d: R.Draft, t: number, lag = R.TAP_LATENCY_S) => { const reached = d.contacts.filter((x) => x <= t - lag + 0.05).length; return reached >= 2 ? reached : null }
  const e = R.setEnding(tapped(5), 'Winner') // contacts 10, 10.8, 11.6, 12.4, 13.2
  const picks = [10.5, 11.0, 11.1, 11.89, 11.9, 12.69, 13.6].map((t) => `${t}s->${onScreen(e, t) ?? 'nothing'}`).join('  ')
  say(`  press at: ${picks}`)
  check('a press 0.3s after shot 3 picks shot 3', onScreen(e, 11.9) === 3)
  check('a press during the serve picks nothing', onScreen(e, 10.5) === null)
  const blocked = R.patchShot(e, 3, { stroke: 'Push' })
  check('press on a shot tagged Push leaves the draft as it is (silent)', R.markFa(blocked, 3) === blocked)

  say('F. Shot loop')
  let bad = 0, cases = 0
  for (let k = 0; k < 400; k++) {
    const n = 2 + (k % 8); let d2 = R.emptyDraft('v', 'me'); let t = 5
    for (let i = 0; i < n; i++) { t += 0.25 + ((k * 7 + i * 13) % 23) / 10; d2 = R.addContact(d2, Math.round(t * 100) / 100) }
    d2 = { ...d2, closed: true }
    for (let s = 1; s <= n; s++) { cases++; const w = R.shotWindow(d2, s); const cc = d2.contacts[s - 1]; if (!(w.a <= cc && cc <= w.b && w.a >= R.rallyStart(d2) - 1e-9 && w.b <= R.rallyEnd(d2) + 1e-9 && w.b - w.a <= 4 + 1e-9)) bad++ }
  }
  check(`shot loop holds its contact, stays in the rally, never over 4s (${cases} windows)`, bad === 0, `${bad} bad`)
  check('loop shot: result and end shot loop the end shot, pick step the whole rally, first attack step that shot', r.loopShotOf(e, 'result', null) === 5 && r.loopShotOf(e, 'endShot', null) === 5 && r.loopShotOf(e, 'pickFa', null) === null && r.loopShotOf({ ...e, fa: 3 }, 'faShot', null) === 3)

  say('G. shotKeys module state')
  const un = K.bindStrokeSide(5, 'defensive', () => undefined)
  const other = R.patchShot(R.markFa(R.setEnding(tapped(7), 'Winner'), 4), 5, { stroke: 'Block' })
  const viaStale = K.applyShotKey(other, 5, 'c') // no `shown` passed: reads the published side
  say(`  with shot 5 published as Defensive by another rally's panel, key C on this rally's shot 5 (rule side ${r.switchOf(other, 5).side}) gives ${viaStale?.shots[4].stroke}`)
  check('a key reads the rule, not a side left published by another rally', viaStale?.shots[4].stroke === 'Flick', `got ${viaStale?.shots[4].stroke}`)
  un()
}

export const report = () => out.join('\n') + `\n\n${fails} checks failed`
export const failed = () => fails
export const count = () => out.filter((l) => /^  (ok  |FAIL) /.test(l)).length
