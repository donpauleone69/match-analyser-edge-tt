// Rule fixes after the pass 3 rule review: faults 1, 2, 3, 6 and 7, the rule side of fault 5,
// the pick on a shot whose kept stroke has no row, the minimum gap between live taps, and Pivot dropped. No browser.
// Then the reviewer's own cases (rules-review-cases.ts). Run: sh proto/scripts/rules-fixes.sh
import {
  ATTACK_STROKES,
  CAPTURE_SPEED,
  MIN_TAP_GAP_S,
  SHOT_REACHED_SLACK_S,
  TAP_LATENCY_S,
  addContact,
  canSave,
  draftFromRally,
  emptyDraft,
  faRefusal,
  faRefusalText,
  faStrokeRefused,
  fieldsFor,
  insertContact,
  markFa,
  patchShot,
  rallyFromDraft,
  reopenFaPick,
  savedShots,
  setEnding,
  shotAtTime,
  shotSummary,
  showsStroke,
  stageOf,
  switchOf,
  tapIgnored,
  toggleNoAttack,
  toggleShotField,
  undoClosedContact,
  type Draft,
  type Ending,
  type RallyData,
  type StrokeSide,
} from '@/features/tagging/rally'
import { buildScripts, ralliesFromScript } from '@/features/tagging/script'
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
    // First attack 3, so shot 4 has a stroke row and the stroke is on screen.
    const d = patchShot(ws(markFa(base, 3), 3, 'FH', 'Loop'), 4, { stroke })
    const why = faRefusal(d, 4)
    check(`shot tagged ${stroke}: refused, and the reason names the shot and the stroke`, markFa(d, 4) === d && J(why) === J({ kind: 'stroke', shot: 4, stroke }), J(why))
    check(`shot tagged ${stroke}: the line to show names both`, why !== null && faRefusalText(why).includes('Shot 4') && faRefusalText(why).includes(stroke), why ? faRefusalText(why) : '')
  }
  check('the serve: refused with its own reason', markFa(base, 1) === base && faRefusal(base, 1)?.kind === 'serve')
  check('no such shot: refused with its own reason', markFa(base, 7) === base && markFa(base, 0) === base && faRefusal(base, 7)?.kind === 'noShot' && faRefusal(base, 0)?.kind === 'noShot')
  check('a shot with an attacking stroke, a wing only, or nothing: no reason, and it is picked', faRefusal(ws(base, 3, 'FH', 'Loop'), 3) === null && faRefusal(patchShot(base, 3, { wing: 'BH' }), 3) === null && faRefusal(base, 3) === null && markFa(base, 3).fa === 3)
  check('the first attack itself: no reason, a press clears it', faRefusal(markFa(base, 3), 3) === null && markFa(markFa(base, 3), 3).fa === null)
  for (const stroke of DEFENSIVE) {
    const end = patchShot(tapped(5, 'Long'), 5, { stroke })
    check(`end shot shows ${stroke}: refused with the reason, before any first attack is picked`, showsStroke(end, 5) && faRefusal(end, 5)?.kind === 'stroke' && markFa(end, 5) === end)
  }
  check('markFa refuses exactly when faRefusal gives a reason', (() => {
    for (let n = 2; n <= 6; n++) {
      for (let shot = 0; shot <= n + 1; shot++) {
        for (const stroke of ['', 'Block', 'Push', 'Loop', 'Smash']) {
          for (const fa of [null, 2, n]) {
            let d = tapped(n, 'Winner')
            if (fa !== null && fa !== shot) d = markFa(d, fa)
            if (stroke && shot >= 1 && shot <= n && d.fa !== shot) d = patchShot(d, shot, { stroke })
            if ((markFa(d, shot) === d) !== (faRefusal(d, shot) !== null)) return false
          }
        }
      }
    }
    return true
  })())
  const lines = [faRefusalText({ kind: 'serve' }), faRefusalText({ kind: 'noShot' }), faRefusalText({ kind: 'stroke', shot: 4, stroke: 'Push' })]
  check('the lines have no long dash, no arrow and not the word clip', lines.every((l) => !/[\u2013\u2014\u2192]|->|clip/i.test(l)), lines.join(' / '))
}

// ---------- A kept stroke nobody can see does not refuse the pick
console.log('\nHidden stroke: the pick goes through and that one stroke is cleared')
{
  // Six shots, first attack 3 Loop, 4 Block, 5 Push, end shot Smash. Then the first attack goes to 6.
  let d = ws(tapped(6, 'Winner'), 6, 'FH', 'Smash')
  d = ws(markFa(d, 3), 3, 'FH', 'Loop')
  d = ws(ws(d, 4, 'BH', 'Block'), 5, 'BH', 'Push')
  d = patchShot(patchShot(d, 5, { initiative: 'Counter' }), 5, { review: true })
  const moved = markFa(d, 6)
  const movedSnap = J(moved)
  check('going in: first attack 6, shot 5 keeps Push and has no stroke row', moved.fa === 6 && moved.shots[4].stroke === 'Push' && !showsStroke(moved, 5))
  check('no reason is given for shot 5', faRefusal(moved, 5) === null)

  const picked = markFa(moved, 5)
  check('pick shot 5: it is the first attack', picked.fa === 5 && !picked.noAttack)
  check('pick shot 5: its Push is cleared, no stroke key left, the row opens empty', !('stroke' in picked.shots[4]) && showsStroke(picked, 5) && stageOf(picked) === 'faShot')
  check('pick shot 5: its wing and other tags stay', picked.shots[4].wing === 'BH' && picked.shots[4].initiative === 'Counter' && picked.shots[4].review === true)
  check('pick shot 5: no other shot is touched', picked.shots.every((s, i) => i === 4 || s === moved.shots[i]), strokes(picked))
  check('pick shot 5: the draft that went in is not touched', J(moved) === movedSnap)
  check('the empty row then takes an attacking stroke and the rally is ready', canSave(ws(picked, 5, 'BH', 'Flick')))

  const away = markFa(picked, 3)
  check('pick moved away to 3: shot 5 stays empty with a stroke row, Loop and Block are back', away.fa === 3 && strokes(away) === '- - Loop Block - Smash' && showsStroke(away, 5), strokes(away))
  check('pick moved away to 6: shot 5 has no row and nothing on it to hide', (() => {
    const to6 = markFa(picked, 6)
    return to6.fa === 6 && !showsStroke(to6, 5) && to6.shots[4].stroke === undefined && strokes(to6) === '- - Loop Block - Smash'
  })())
  check('pick pressed again on 5 clears the first attack only', (() => {
    const off = markFa(picked, 5)
    return off.fa === null && J(off.shots) === J(picked.shots)
  })())

  // Through Change first attack, as the screen does it.
  const reopened = reopenFaPick(moved)
  for (const stroke of DEFENSIVE) {
    const kept = reopenFaPick(patchShot(markFa(reopened, 3), 4, { stroke }))
    const got = markFa(kept, 4)
    check(`Change first attack, then pick shot 4 that keeps ${stroke}: picked, that stroke cleared, others kept`, kept.shots[3].stroke === stroke && faRefusal(kept, 4) === null && got.fa === 4 && got.shots[3].stroke === undefined && got.shots[2].stroke === 'Loop' && got.shots[4].stroke === 'Push' && got.shots[5].stroke === 'Smash', strokes(got))
  }
  check('a kept attacking stroke with no row is not cleared: it is a stroke a first attack can have', (() => {
    const got = markFa(reopened, 3)
    return got.fa === 3 && got.shots[2].stroke === 'Loop'
  })())

  // No attack hides every stroke but the end shot's.
  let n = ws(tapped(5, 'Long'), 5, 'BH', 'Chop')
  n = ws(markFa(n, 3), 3, 'FH', 'Loop')
  n = ws(n, 4, 'BH', 'Block')
  const none = toggleNoAttack(n)
  const from = markFa(none, 4)
  check('No attack rally, pick shot 4 that keeps Block: picked, Block cleared, No attack off, Loop and Chop kept', faRefusal(none, 4) === null && from.fa === 4 && !from.noAttack && strokes(from) === '- - Loop - Chop', strokes(from))
  check('No attack rally: the end shot shows Chop, so a pick there is still refused with the reason', faRefusal(none, 5)?.kind === 'stroke' && markFa(none, 5) === none)

  // On screen it is still refused.
  check('a stroke on screen still refuses: shot 5 shows Push while the first attack is 3', showsStroke(d, 5) && faRefusal(d, 5)?.kind === 'stroke' && markFa(d, 5) === d)
  check('`stroke` is only ever given for a stroke on screen', (() => {
    for (let len = 2; len <= 6; len++) {
      for (const fa of [null, ...Array.from({ length: len - 1 }, (_, i) => i + 2)]) {
        for (const noAttack of [false, true]) {
          for (let shot = 2; shot <= len; shot++) {
            let x = tapped(len, 'Long')
            if (fa !== null) x = markFa(x, fa)
            x = { ...x, shots: x.shots.map((s, i) => (i === shot - 1 ? { ...s, stroke: 'Push' } : s)) }
            if (noAttack) x = { ...x, fa: null, noAttack: true }
            const why = faRefusal(x, shot)
            if (why?.kind === 'stroke' && !showsStroke(x, shot)) return false
            if (!why && x.fa !== shot && showsStroke(x, shot)) return false
            const got = markFa(x, shot)
            if (!why && x.fa !== shot && (got.fa !== shot || got.shots[shot - 1].stroke !== undefined)) return false
            if (!why && got.shots.some((s, i) => i !== shot - 1 && s !== x.shots[i])) return false
          }
        }
      }
    }
    return true
  })())
  check('a saved rally still never has a defensive stroke on its first attack', (() => {
    const out = rallyFromDraft(ws(picked, 5, 'BH', 'Flick'), 'r')
    return out !== null && out.fa === 5 && out.shots[4].stroke === 'Flick'
  })())
}

// ---------- Fault 5: the shot under the playhead, and Change first attack
console.log('\nFault 5: shotAtTime and reopenFaPick')
{
  const e = tapped(5, 'Winner') // contacts 10, 10.8, 11.6, 12.4, 13.2
  // The screen's own formula, as it stands in TagSetScreen.tsx (shotOnScreen).
  const screen = (d: Draft, local: number, lag = 0) => {
    const at = local - lag
    const reached = d.contacts.filter((c) => c <= at + 0.05).length
    return reached >= 2 ? reached : null
  }
  check('before the serve and during the serve: nothing', shotAtTime(e, 9) === null && shotAtTime(e, 10) === null && shotAtTime(e, 10.7) === null)
  check('never the serve, on a rally of one contact at any time', shotAtTime(tapped(1), 10) === null && shotAtTime(tapped(1), 99) === null)
  check('no contacts: nothing', shotAtTime(emptyDraft('v', 'me'), 50) === null)
  check('on a contact: that shot', shotAtTime(e, 10.8) === 2 && shotAtTime(e, 11.6) === 3 && shotAtTime(e, 13.2) === 5)
  check('up to 0.05s early still counts: 10.76 is shot 2, 10.74 is not', shotAtTime(e, 10.76) === 2 && shotAtTime(e, 10.74) === null && SHOT_REACHED_SLACK_S === 0.05)
  check('between contacts: the one last reached', shotAtTime(e, 11.5) === 2 && shotAtTime(e, 12.39) === 4 && shotAtTime(e, 12.3) === 3)
  check('after the end shot: the end shot', shotAtTime(e, 60) === 5)
  check('lag is taken off first: a press 0.3s after shot 3 picks shot 3, not shot 4', shotAtTime(e, 11.9, TAP_LATENCY_S) === 3 && shotAtTime(e, 12.4, TAP_LATENCY_S) === 3 && shotAtTime(e, 12.4) === 4)
  check('a press inside the lag of shot 2 picks nothing', shotAtTime(e, 11.0, TAP_LATENCY_S) === null && shotAtTime(e, 11.05, TAP_LATENCY_S) === 2)
  check('no lag given means none', shotAtTime(e, 12.4) === shotAtTime(e, 12.4, 0))
  check('same answer as the screen formula at every hundredth from 9s to 15s, with and without lag', (() => {
    for (let i = 900; i <= 1500; i++) {
      const t = i / 100
      if (shotAtTime(e, t) !== screen(e, t) || shotAtTime(e, t, TAP_LATENCY_S) !== screen(e, t, TAP_LATENCY_S)) return false
    }
    return true
  })())
  check('the draft is only read', (() => {
    const snap = J(e)
    shotAtTime(e, 12, TAP_LATENCY_S)
    return J(e) === snap
  })())
  check('a contact added out of order is counted by time', shotAtTime(insertContact(e, 11.2).draft, 11.3) === 3)

  // reopenFaPick
  let d = ws(tapped(6, 'Winner'), 6, 'FH', 'Smash')
  d = ws(markFa(d, 3), 3, 'FH', 'Loop')
  d = ws(d, 4, 'BH', 'Block')
  const open = reopenFaPick(d)
  check('Change first attack: back at the pick step, first attack cleared', open.fa === null && !open.noAttack && stageOf(open) === 'pickFa')
  check('Change first attack: every answer stays, the same shots array', open.shots === d.shots && open.ending === d.ending && J(open.contacts) === J(d.contacts))
  check('Change first attack then the same shot again: the draft is what it was', J(markFa(open, 3)) === J(d))
  check('Change first attack is what the screen wrote by hand', J(open) === J({ ...d, fa: null, noAttack: false }))
  const n = toggleNoAttack(ws(tapped(4, 'Long'), 4, 'BH', 'Push'))
  check('Change first attack on a No attack rally: No attack off, back at the pick step, Push kept', (() => {
    const o = reopenFaPick(n)
    return !o.noAttack && o.fa === null && stageOf(o) === 'pickFa' && o.shots[3].stroke === 'Push'
  })())
  const two = ws(tapped(2, 'Long'), 2, 'BH', 'Loop')
  check('serve and return, or one contact: nothing to reopen, the same draft comes back', (() => {
    const one = tapped(1)
    return reopenFaPick(two) === two && two.fa === 2 && reopenFaPick(one) === one
  })())
  check('the draft that went in is not touched', d.fa === 3 && n.noAttack)
}

// ---------- A second live tap inside 0.11s of video (150 ms on the clock at 0.75x) is ignored
console.log('\nLive taps: the minimum gap')
{
  const one = addContact(emptyDraft('v', 'me'), 10)
  check('the constant is 0.11s of video, no more than 150 ms on the clock at the tapping speed', MIN_TAP_GAP_S === 0.11 && MIN_TAP_GAP_S / CAPTURE_SPEED <= 0.15)
  check('the first tap always counts', one.contacts.length === 1 && !tapIgnored(emptyDraft('v', 'me'), 0))
  for (const ms of [60, 100, 109]) {
    const t = 10 + ms / 1000
    const got = addContact(one, t)
    check(`a second tap ${ms} ms of video after the first is ignored: the same draft comes back`, got === one && tapIgnored(one, t) && J(got.contacts) === J([10]) && got.shots.length === 1)
  }
  for (const ms of [110, 120, 150, 200]) {
    const t = 10 + ms / 1000
    const got = addContact(one, t)
    check(`a second tap ${ms} ms of video after the first counts`, !tapIgnored(one, t) && J(got.contacts) === J([10, t]) && got.shots.length === 2 && one.contacts.length === 1)
  }
  check('a tap at the very time of the last contact is ignored', addContact(one, 10) === one)
  check('two real contacts 0.3s apart both count', (() => {
    const two = addContact(one, 10.3)
    const three = addContact(two, 10.6)
    return J(three.contacts) === J([10, 10.3, 10.6]) && three.shots.length === 3
  })())
  check('the gap is from the last contact, not the first: 10, 10.3, then 10.4 is ignored and 10.41 counts', (() => {
    const two = addContact(one, 10.3)
    return addContact(two, 10.4) === two && addContact(two, 10.41).contacts.length === 3
  })())
  check('exactly 0.11s counts and 0.10s is ignored wherever the last contact sits, at every hundredth from 0 to 200s', (() => {
    for (let i = 0; i < 20000; i++) {
      const last = i / 100
      const d = addContact(emptyDraft('v', 'me'), last)
      const at = Math.round((last + 0.11) * 100) / 100
      const before = Math.round((last + 0.1) * 100) / 100
      if (addContact(d, at).contacts.length !== 2 || addContact(d, before) !== d) return false
    }
    return true
  })())
  check('a burst of taps 60 ms apart leaves one contact every 120 ms', (() => {
    let d = emptyDraft('v', 'me')
    for (let i = 0; i < 10; i++) d = addContact(d, Math.round((10 + i * 0.06) * 100) / 100)
    return J(d.contacts) === J([10, 10.12, 10.24, 10.36, 10.48])
  })())
  check('an ignored tap leaves a rally with tags as it was', (() => {
    const d = ws(tapped(3), 3, 'FH', 'Loop')
    const live = { ...d, closed: false }
    return addContact(live, 11.7) === live
  })())
  check('Add contact is not held to it: a missed contact 0.1s after a tap still goes in', (() => {
    const d = tapped(4, 'Long')
    const { draft, shot } = insertContact(d, 10.9)
    return draft.contacts.length === 5 && shot === 3
  })())
}

// ---------- Pivot is not asked
console.log('\nPivot is dropped')
{
  for (const wing of ['FH', 'BH'] as const) {
    const two = ws(tapped(2, 'Winner'), 2, wing, 'Loop')
    check(`serve and return: Winner, ${wing} and a stroke can Save`, canSave(two) && rallyFromDraft(two, 'r') !== null)
    let four = ws(tapped(4, 'Winner'), 4, wing, 'Smash')
    four = ws(markFa(four, 3), 3, wing, 'Loop')
    check(`four shots: Winner, ${wing} and a stroke on the end shot and the first attack can Save`, canSave(four) && rallyFromDraft(four, 'r') !== null)
  }
  check('the wing is still needed: a stroke alone does not Save', !canSave(patchShot(tapped(2, 'Winner'), 2, { stroke: 'Loop' })))

  // No row, no key, no patch.
  let d = ws(tapped(6, 'Winner'), 6, 'FH', 'Smash')
  d = ws(markFa(d, 3), 3, 'FH', 'Loop')
  const drafts = [tapped(1), tapped(2), tapped(2, 'Winner'), tapped(5, 'Long'), toggleNoAttack(ws(tapped(4, 'Long'), 4, 'BH', 'Push')), d, markFa(d, 6)]
  check('no shot of any rally shows a Pivot cell', drafts.every((x) => x.contacts.every((_, i) => fieldsFor(x, i + 1).pivot === false)))
  check('a patch that sets pivot changes nothing: the same draft comes back', patchShot(d, 3, { pivot: true }) === d && toggleShotField(d, 3, 'pivot', true) === d)
  check('pivot beside another tag: the other tag is taken, pivot is not', (() => {
    const got = patchShot(d, 4, { pivot: true, wing: 'BH' })
    return got.shots[3].wing === 'BH' && !('pivot' in got.shots[3])
  })())
  check('key D does nothing on any shot at any step, with or without an open panel', (() => {
    for (const x of drafts) {
      for (let shot = 1; shot <= x.contacts.length; shot++) {
        if (applyShotKey(x, shot, 'd') !== null || applyShotKey(x, shot, 'D', 'defensive') !== null || applyPanelKey(x, shot, 'd') !== null) return false
      }
    }
    return true
  })())
  check('no key and no rule sets pivot: every key on every shot, twice over', (() => {
    const keys = 'abcdefghijklmnopqrstuvwxyz0123456789[]-=,. '.split('')
    for (let x of drafts) {
      for (let round = 0; round < 2; round++) {
        for (let shot = 1; shot <= x.contacts.length; shot++) {
          for (const key of keys) x = applyShotKey(x, shot, key) ?? x
          x = markFa(x, shot)
          x = toggleNoAttack(x)
        }
      }
      if (x.shots.some((t) => 'pivot' in t)) return false
      const out = rallyFromDraft(x, 'r')
      if (out && out.shots.some((t) => 'pivot' in t)) return false
    }
    return true
  })())
  check('the summary of a shot says the wing, never pivot', shotSummary({ wing: 'FH', pivot: true, stroke: 'Loop' }) === 'FH · Loop')

  // A rally saved when Pivot was still asked.
  const old: RallyData = {
    id: 'old',
    videoId: 'v',
    server: 'me',
    contacts: [10, 10.8, 11.6, 12.4],
    start: 8,
    end: 13.4,
    ending: 'Winner',
    fa: 3,
    shots: [{ spin: 'Back' }, { wing: 'BH', pivot: true }, { wing: 'FH', pivot: true, stroke: 'Loop' }, { wing: 'FH', pivot: false, stroke: 'Smash', review: true }],
    winner: 'them',
    highlight: true,
  }
  const oldSnap = J(old)
  const opened = draftFromRally(old)
  check('an old rally with pivot opens ready to save', canSave(opened) && stageOf(opened) === 'ready')
  check('it shows no Pivot cell', opened.contacts.every((_, i) => !fieldsFor(opened, i + 1).pivot))
  const resaved = rallyFromDraft(opened, 'old')
  check('it saves, and no shot of the saved rally has pivot', resaved !== null && resaved.shots.every((t) => !('pivot' in t)))
  check('everything else is saved as it was', resaved !== null && J(resaved) === J({ ...old, shots: [{ spin: 'Back' }, { wing: 'BH' }, { wing: 'FH', stroke: 'Loop' }, { wing: 'FH', stroke: 'Smash', review: true }] }), J(resaved))
  check('the old rally itself is not touched', J(old) === oldSnap)
  check('it can be edited and saved: a new stroke on the end shot', (() => {
    const out = rallyFromDraft(ws(opened, 4, 'BH', 'Drive'), 'old')
    return out !== null && J(out.shots[3]) === J({ wing: 'BH', stroke: 'Drive', review: true })
  })())
  check('old data with pivot lit and no wing: the wing is what is asked for, then it saves', (() => {
    const odd = draftFromRally({ ...old, shots: [{}, {}, { wing: 'FH', stroke: 'Loop' }, { pivot: true, stroke: 'Smash' }] })
    const fixed = patchShot(odd, 4, { wing: 'FH' })
    const out = rallyFromDraft(fixed, 'old')
    return stageOf(odd) === 'endShot' && canSave(fixed) && out !== null && !('pivot' in out.shots[3])
  })())
  check('a rally with nothing to drop still saves the very same shots array', savedShots(d) === d.shots)
}

// ---------- Seeded rallies hold nothing that Save would drop
console.log('\nSeeded rallies')
{
  const videos = buildScripts(7, [
    { firstServer: 'me', winners: Array.from({ length: 21 }, (_, i) => (i % 3 ? 'me' : 'them')) },
    { firstServer: 'them', winners: Array.from({ length: 20 }, (_, i) => (i % 2 ? 'me' : 'them')) },
  ])
  let total = 0
  let hidden = 0
  let changed = 0
  videos.forEach((v, vi) => {
    for (const r of ralliesFromScript(`v${vi}`, v, 0, v.rallies.length)) {
      total++
      const dr = draftFromRally(r)
      if (savedShots(dr) !== dr.shots) hidden++
      if (J(rallyFromDraft(dr, r.id)?.shots) !== J(r.shots)) changed++
    }
  })
  check(`${total} seeded rallies: none holds a stroke on a shot with no stroke row`, total > 0 && hidden === 0, `${hidden} with a hidden stroke`)
  check('open and save leaves the shots of every seeded rally as they were', changed === 0, `${changed} changed`)
}

// ---------- The reviewer's cases
console.log('\n' + reviewReport())
const review = reviewCount()

console.log(`\nfixes: ${pass} passed, ${fail} failed`)
console.log(`reviewer's cases: ${review - reviewFailed()} of ${review} checks passed`)
if (fail > 0 || reviewFailed() > 0) process.exit(1)
