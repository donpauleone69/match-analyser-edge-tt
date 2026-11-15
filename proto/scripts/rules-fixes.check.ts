// Rule fixes after the pass 3 rule review: faults 1, 2, 3, 6 and 7. No browser.
// Then the reviewer's own cases (rules-review-cases.ts). Run: sh proto/scripts/rules-fixes.sh
import {
  ATTACK_STROKES,
  addContact,
  canSave,
  draftFromRally,
  emptyDraft,
  faRefusal,
  faRefusalText,
  faStrokeRefused,
  insertContact,
  markFa,
  patchShot,
  rallyFromDraft,
  savedShots,
  setEnding,
  showsStroke,
  stageOf,
  switchOf,
  toggleNoAttack,
  toggleShotField,
  undoClosedContact,
  type Draft,
  type Ending,
  type StrokeSide,
} from '@/features/tagging/rally'
import {
  applyPanelKey,
  applyShotKey,
  bindStrokeSide,
  shownStrokeSide,
  sideAfterShotKey,
} from '@/features/tagging/shotKeys'
import { count as reviewCount, failed as reviewFailed, report as reviewReport } from './rules-review-cases'

let pass = 0
let fail = 0
const check = (name: string, ok: boolean, detail: unknown = '') => {
  if (ok) pass++
  else fail++
  const shown = ok || detail === '' ? '' : ` | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${shown}`)
}
const J = (x: unknown) => JSON.stringify(x)
const DEFENSIVE = ['Block', 'Lob', 'Push', 'Chop']

/** A closed rally of n taps from 10s, 0.8s apart. */
function tapped(n: number, ending: Ending | null = null): Draft {
  let d = emptyDraft('v', 'me')
  for (let i = 0; i < n; i++) d = addContact(d, Math.round((10 + i * 0.8) * 100) / 100)
  d = { ...d, closed: true }
  return ending ? setEnding(d, ending) : d
}
const ws = (d: Draft, shot: number, wing: 'BH' | 'FH', stroke: string) =>
  patchShot(patchShot(d, shot, { wing }), shot, { stroke })
const strokes = (d: { shots: { stroke?: string }[] }) => d.shots.map((s) => s.stroke ?? '-').join(' ')

// ---------- Fault 1: answers are kept when the first attack moves or No attack is pressed
console.log('\nFault 1: strokes already answered are kept')
{
  // Six shots, first attack 3 Loop, then Block, Push, end shot Smash.
  let d = ws(tapped(6, 'Winner'), 6, 'FH', 'Smash')
  d = ws(markFa(d, 3), 3, 'FH', 'Loop')
  d = ws(ws(d, 4, 'BH', 'Block'), 5, 'BH', 'Push')
  const snapshot = J(d)
  check('going in: ready, strokes on 3, 4, 5, 6', canSave(d) && strokes(d) === '- - Loop Block Push Smash', strokes(d))

  const later = markFa(d, 6)
  check('first attack moved to 6: every stroke is still in the draft', later.fa === 6 && J(later.shots) === J(d.shots), strokes(later))
  check('first attack moved to 6: shots 3, 4, 5 have no stroke row', [3, 4, 5].every((s) => !showsStroke(later, s)) && showsStroke(later, 6))
  const back = markFa(later, 3)
  check('moved back to 3: the draft is what it was', J(back) === snapshot, strokes(back))
  check('the draft that went in is not touched', J(d) === snapshot)

  const savedLater = rallyFromDraft(later, 'r')
  check('saved with first attack 6: no stroke on 3, 4, 5, wings kept, Smash kept', savedLater !== null && strokes(savedLater) === '- - - - - Smash' && savedLater.shots[2].wing === 'FH' && savedLater.shots[3].wing === 'BH' && savedLater.shots[4].wing === 'BH', savedLater ? strokes(savedLater) : 'not saved')
  check('saved with first attack 6: no stroke key is left behind', savedLater !== null && [2, 3, 4].every((i) => !('stroke' in savedLater.shots[i])))
  check('Save does not change the draft', J(later.shots) === J(d.shots))

  // Change first attack on the screen clears it, then a press picks another shot.
  const cleared: Draft = { ...d, fa: null, noAttack: false }
  const via6 = markFa({ ...markFa(cleared, 6), fa: null }, 3)
  check('Change, pick 6, Change, pick 3: answers on 3, 4, 5 are as they were', strokes(via6) === strokes(d) && via6.fa === 3, strokes(via6))

  // No attack on three shots or more. The end shot must not be an attacking stroke for it to be offered.
  let n = ws(tapped(5, 'Long'), 5, 'BH', 'Chop')
  n = ws(markFa(n, 3), 3, 'FH', 'Loop')
  n = ws(n, 4, 'BH', 'Block')
  const nSnap = J(n)
  const none = toggleNoAttack(n)
  check('No attack: on, first attack cleared, every stroke still in the draft', none.noAttack && none.fa === null && J(none.shots) === J(n.shots), strokes(none))
  const noneSaved = rallyFromDraft(none, 'r')
  check('No attack saved: only the end shot keeps a stroke', noneSaved !== null && strokes(noneSaved) === '- - - - Chop' && noneSaved.fa === null, noneSaved ? strokes(noneSaved) : 'not saved')
  const again = markFa(toggleNoAttack(none), 3)
  check('No attack off, shot 3 picked again: the draft is what it was', J(again) === nSnap, strokes(again))

  // Nothing hidden: Save hands back the very same shots, so open and save is byte for byte the same.
  check('nothing hidden: Save keeps the same shots array', savedShots(d) === d.shots)
  const saved = rallyFromDraft(d, 'r')!
  check('open and save again gives the same rally', J(rallyFromDraft(draftFromRally(saved), 'r')) === J(saved))
  check('other tags on a shot that loses its stroke are kept', (() => {
    const tagged = patchShot(patchShot(d, 4, { initiative: 'Counter' }), 4, { review: true })
    const out = rallyFromDraft(markFa(tagged, 6), 'r')!
    return out.shots[3].initiative === 'Counter' && out.shots[3].review === true && out.shots[3].wing === 'BH' && !('stroke' in out.shots[3])
  })())
}

// ---------- Fault 2: Add contact cannot leave a hidden stroke in a saved rally
console.log('\nFault 2: Add contact and hidden strokes')
{
  let h = ws(tapped(4, 'Long'), 4, 'BH', 'Push')
  h = toggleNoAttack(h)
  const { draft: ins, shot } = insertContact(h, 13)
  check('No attack rally, contact added after the end: it is shot 5 and the result is asked again', shot === 5 && stageOf(ins) === 'result' && ins.noAttack)
  check('the old end shot keeps Push in the draft and has no stroke row', ins.shots[3].stroke === 'Push' && !showsStroke(ins, 4))
  const done = ws(setEnding(ins, 'Long'), 5, 'FH', 'Chop')
  const saved = rallyFromDraft(done, 'r')
  check('saved: the old end shot has no stroke, its wing is kept, the new end shot is Chop', saved !== null && strokes(saved) === '- - - - Chop' && saved.shots[3].wing === 'BH' && !('stroke' in saved.shots[3]), saved ? strokes(saved) : 'not saved')
  check('a saved rally never holds a stroke on a shot with no stroke row', saved !== null && saved.shots.every((s, i) => !s.stroke || showsStroke(done, i + 1)))
  const undone = undoClosedContact(ins)
  check('Delete last after that: shot 4 is the end shot again with Push still on it', undone.contacts.length === 4 && undone.shots[3].stroke === 'Push' && showsStroke(undone, 4))

  // In front of a first attack: the first attack moves up with its stroke, nothing is hidden.
  let f = ws(tapped(4, 'Winner'), 4, 'FH', 'Smash')
  f = ws(markFa(f, 3), 3, 'FH', 'Loop')
  const front = insertContact(f, 9.2).draft
  const frontSaved = rallyFromDraft(front, 'r')
  check('contact added in front: first attack 4 keeps Loop, end shot keeps Smash, both saved', front.fa === 4 && frontSaved !== null && strokes(frontSaved) === '- - - Loop Smash', frontSaved ? strokes(frontSaved) : stageOf(front))

  // Every way of losing a row, swept: what is saved never has a stroke the screen cannot show.
  let bad = 0
  let swept = 0
  for (let n = 3; n <= 7; n++) {
    for (let fa = 2; fa <= n; fa++) {
      let d = ws(tapped(n, 'Winner'), n, 'FH', 'Smash')
      d = ws(markFa(d, fa), fa, 'FH', 'Loop')
      for (let s = fa + 1; s < n; s++) d = ws(d, s, 'BH', s % 2 ? 'Push' : 'Drive')
      for (let to = 2; to <= n; to++) {
        const moved = markFa(d, to)
        const out = rallyFromDraft(moved, 'r')
        swept++
        if (out && out.shots.some((s, i) => s.stroke && !showsStroke(moved, i + 1))) bad++
        if (J(markFa(moved, fa).shots) !== J(d.shots) && moved !== d) bad++
      }
    }
  }
  check(`sweep of ${swept} first attack moves: nothing hidden is saved, and moving back restores every answer`, bad === 0, `${bad} bad`)
}

// ---------- Fault 3: the keys are pure
console.log('\nFault 3: keys are pure')
{
  // Seven shots, first attack 4, shot 5 Block (no side of its own), so shot 5 follows the first attack: Offensive.
  const d = patchShot(markFa(tapped(7, 'Winner'), 4), 5, { stroke: 'Block' })
  check('rule side of shot 5 is Offensive, free', J(switchOf(d, 5)) === J({ side: 'offensive', fixed: false }))
  const plain = applyShotKey(d, 5, 'c')
  const undo = bindStrokeSide(5, 'defensive', () => undefined)
  const bound = applyShotKey(d, 5, 'c')
  check('key C with no side passed reads the rule: Flick, whatever a panel has published', plain?.shots[4].stroke === 'Flick' && J(bound) === J(plain), `${plain?.shots[4].stroke} then ${bound?.shots[4].stroke}`)
  undo()
  check('the same key on the same draft with the same side gives the same draft, 50 times over', (() => {
    const first = J(applyShotKey(d, 5, 'c', 'defensive'))
    for (let i = 0; i < 50; i++) {
      const u = bindStrokeSide(5, i % 2 ? 'offensive' : 'defensive', () => undefined)
      const same = J(applyShotKey(d, 5, 'c', 'defensive')) === first
      u()
      if (!same) return false
    }
    return true
  })())
  check('the side comes in as an argument: Defensive gives Lob, Offensive gives Flick', applyShotKey(d, 5, 'c', 'defensive')?.shots[4].stroke === 'Lob' && applyShotKey(d, 5, 'c', 'offensive')?.shots[4].stroke === 'Flick')
  check('a side passed in never beats a fixed switch: first attack stays Offensive cells', applyShotKey(d, 4, 'c', 'defensive')?.shots[3].stroke === 'Flick' && shownStrokeSide(d, 4, 'defensive') === 'offensive')
  check('a side passed in never beats a fixed switch: before the first attack there is no stroke row at all', applyShotKey(d, 3, 'c', 'offensive') === null)
  const none = toggleNoAttack(ws(tapped(4, 'Long'), 4, 'BH', 'Block'))
  check('No attack rally: a held Offensive side is ignored, key C gives Lob', shownStrokeSide(none, 4, 'offensive') === 'defensive' && applyShotKey(none, 4, 'c', 'offensive')?.shots[3].stroke === 'Lob')
  const pushed = patchShot(d, 6, { stroke: 'Push' })
  check('a stroke with a side outranks a held side', shownStrokeSide(pushed, 6, 'offensive') === 'defensive' && shownStrokeSide(patchShot(d, 6, { stroke: 'Loop' }), 6, 'defensive') === 'offensive')
  check('no side held: the rule side', shownStrokeSide(d, 6) === 'offensive' && shownStrokeSide(d, 6, null) === 'offensive')

  check('key Z: the side after it is the other one', sideAfterShotKey(d, 5, 'z') === 'defensive' && sideAfterShotKey(d, 5, 'Z', 'defensive') === 'offensive')
  check('key Z on a fixed switch, on a shot with no stroke row, or any other key: no new side', sideAfterShotKey(d, 4, 'z') === null && sideAfterShotKey(d, 3, 'z') === null && sideAfterShotKey(d, 5, 'c') === null)
  check('key Z while the result is asked: nothing', sideAfterShotKey(tapped(4), 4, 'z') === null && applyShotKey(tapped(4), 4, 'z') === null)
  check('key Z on Block leaves the draft alone', applyShotKey(d, 5, 'z') === null)
  const loop6 = patchShot(d, 6, { stroke: 'Loop' })
  check('key Z on Loop clears that stroke only', applyShotKey(loop6, 6, 'z')?.shots[5].stroke === undefined && J(applyShotKey(loop6, 6, 'z')?.shots.slice(0, 5)) === J(loop6.shots.slice(0, 5)))

  // The screen bridge: the panel publishes its side, and is told of a flip.
  const told: StrokeSide[] = []
  const unbind = bindStrokeSide(5, 'defensive', (s) => told.push(s))
  check('bridge: a key on the open panel uses the side that panel shows', applyPanelKey(d, 5, 'c')?.shots[4].stroke === 'Lob')
  check('bridge: a key on another shot does not', applyPanelKey(d, 6, 'c')?.shots[5].stroke === 'Flick')
  applyPanelKey(d, 5, 'z')
  check('bridge: Z tells the panel the new side, once', J(told) === J(['offensive']), J(told))
  applyPanelKey(d, 4, 'z')
  applyPanelKey(d, 6, 'z')
  check('bridge: Z on a fixed switch or on a shot that is not open tells it nothing', told.length === 1, J(told))
  unbind()
  check('bridge: once the panel is gone the rule side is used', applyPanelKey(d, 5, 'c')?.shots[4].stroke === 'Flick')
  const a = bindStrokeSide(5, 'defensive', () => undefined)
  const b = bindStrokeSide(6, 'defensive', () => undefined)
  a()
  check('bridge: an old panel letting go does not unbind the new one', applyPanelKey(d, 6, 'c')?.shots[5].stroke === 'Lob')
  b()
}

// ---------- Fault 6: the rule refuses Block, Lob, Push and Chop on the first attack
console.log('\nFault 6: the first attack is never a defensive stroke')
{
  const d = patchShot(markFa(tapped(7, 'Winner'), 4), 4, { wing: 'FH' })
  for (const stroke of DEFENSIVE) {
    const next = toggleShotField(d, 4, 'stroke', stroke)
    check(`${stroke} on the first attack is refused: the same draft comes back`, next === d && faStrokeRefused(d, 4, stroke))
    check(`${stroke} over Loop on the first attack is refused and Loop stays`, (() => {
      const loop = patchShot(d, 4, { stroke: 'Loop' })
      const out = patchShot(loop, 4, { stroke })
      return out === loop && out.shots[3].stroke === 'Loop' && out.fa === 4
    })())
  }
  for (const stroke of ATTACK_STROKES) {
    const next = toggleShotField(d, 4, 'stroke', stroke)
    check(`${stroke} on the first attack is taken`, next.shots[3].stroke === stroke && next.fa === 4 && !faStrokeRefused(d, 4, stroke))
  }
  check('the refusal is for the first attack only: Block on the shot after it is taken', toggleShotField(d, 5, 'stroke', 'Block').shots[4].stroke === 'Block')
  check('other tags on the first attack are still taken', patchShot(d, 4, { intent: 'Safe' }).shots[3].intent === 'Safe')
  check('key X on the first attack does nothing', applyShotKey(d, 4, 'x') === null && applyShotKey(d, 4, 'x', 'defensive') === null)
  const loop = patchShot(d, 4, { stroke: 'Loop' })
  check('pressing the lit stroke again still clears it', toggleShotField(loop, 4, 'stroke', 'Loop').shots[3].stroke === undefined)
  // The end shot that is the first attack.
  const endFa = markFa(ws(tapped(4, 'Winner'), 4, 'FH', 'Loop'), 4)
  check('end shot that is the first attack: Push is refused, still ready', patchShot(endFa, 4, { stroke: 'Push' }) === endFa && canSave(endFa))

  // Two shots: the stroke is the answer, so it is decided again.
  const two = ws(tapped(2, 'Long'), 2, 'BH', 'Loop')
  check('two shots, Loop: first attack 2', two.fa === 2 && !two.noAttack && canSave(two))
  for (const stroke of DEFENSIVE) {
    const t = patchShot(two, 2, { stroke })
    check(`two shots, Loop changed straight to ${stroke}: No attack, no first attack, ready`, t.fa === null && t.noAttack && t.shots[1].stroke === stroke && canSave(t), `fa ${t.fa} noAttack ${t.noAttack} ${stageOf(t)}`)
    check(`two shots, ${stroke} changed back to Loop: first attack 2 again`, patchShot(t, 2, { stroke: 'Loop' }).fa === 2 && !patchShot(t, 2, { stroke: 'Loop' }).noAttack)
  }
  check('no rally of any length ends up with a defensive stroke on its first attack', (() => {
    for (let n = 2; n <= 6; n++) {
      for (let fa = 2; fa <= n; fa++) {
        for (const stroke of DEFENSIVE) {
          let x = ws(tapped(n, 'Winner'), n, 'FH', 'Smash')
          x = markFa(x, fa)
          x = patchShot(x, fa, { stroke })
          if (x.fa !== null && DEFENSIVE.includes(x.shots[x.fa - 1].stroke ?? '')) return false
        }
      }
    }
    return true
  })())
}

// ---------- Fault 7: a refused First attack press has a reason
console.log('\nFault 7: a refusal says why')
{
  const base = ws(tapped(6, 'Winner'), 6, 'FH', 'Smash')
  for (const stroke of DEFENSIVE) {
    const d = patchShot(base, 4, { stroke })
    const why = faRefusal(d, 4)
    check(`shot tagged ${stroke}: refused, and the reason names the shot and the stroke`, markFa(d, 4) === d && J(why) === J({ kind: 'stroke', shot: 4, stroke }), J(why))
    check(`shot tagged ${stroke}: the line to show names both`, why !== null && faRefusalText(why).includes('Shot 4') && faRefusalText(why).includes(stroke), why ? faRefusalText(why) : '')
  }
  check('the serve: refused with its own reason', markFa(base, 1) === base && faRefusal(base, 1)?.kind === 'serve')
  check('no such shot: refused with its own reason', markFa(base, 7) === base && markFa(base, 0) === base && faRefusal(base, 7)?.kind === 'noShot' && faRefusal(base, 0)?.kind === 'noShot')
  check('a shot with an attacking stroke, a wing only, or nothing: no reason, and it is picked', faRefusal(ws(base, 3, 'FH', 'Loop'), 3) === null && faRefusal(patchShot(base, 3, { wing: 'BH' }), 3) === null && faRefusal(base, 3) === null && markFa(base, 3).fa === 3)
  check('the first attack itself: no reason, a press clears it', faRefusal(markFa(base, 3), 3) === null && markFa(markFa(base, 3), 3).fa === null)
  check('a stroke kept from before the first attack moved still refuses, with the reason', (() => {
    let d = ws(markFa(base, 3), 3, 'FH', 'Loop')
    d = ws(d, 5, 'BH', 'Push')
    const moved = markFa(d, 6)
    return !showsStroke(moved, 5) && faRefusal(moved, 5)?.kind === 'stroke' && markFa(moved, 5) === moved
  })())
  check('markFa refuses exactly when faRefusal gives a reason', (() => {
    for (let n = 2; n <= 6; n++) {
      for (let shot = 0; shot <= n + 1; shot++) {
        for (const stroke of ['', 'Block', 'Push', 'Loop', 'Smash']) {
          let d = tapped(n, 'Winner')
          if (stroke && shot >= 1 && shot <= n) d = patchShot(d, shot, { stroke })
          if ((markFa(d, shot) === d) !== (faRefusal(d, shot) !== null)) return false
        }
      }
    }
    return true
  })())
  const lines = [faRefusalText({ kind: 'serve' }), faRefusalText({ kind: 'noShot' }), faRefusalText({ kind: 'stroke', shot: 4, stroke: 'Push' })]
  check('the lines have no long dash, no arrow and not the word clip', lines.every((l) => !/[\u2013\u2014\u2192]|->|clip/i.test(l)), lines.join(' / '))
}

// ---------- The reviewer's cases
console.log('\n' + reviewReport())
const review = reviewCount()

console.log(`\nfixes: ${pass} passed, ${fail} failed`)
console.log(`reviewer's cases: ${review - reviewFailed()} of ${review} checks passed`)
if (fail > 0 || reviewFailed() > 0) process.exit(1)
