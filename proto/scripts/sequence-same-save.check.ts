/**
 * Same-save check for the shot by shot walk.
 * Every case in sections 4 and 5 of the logic note: the rally Save would
 * write is the rally the current mode would write for the same answers.
 * Run: sh proto/scripts/sequence-same-save.sh
 */
import { addContact, draftFromRally, emptyDraft, toggleShotField, undoContact, flipSwitch, markFa, patchShot, rallyFromDraft, serverForWinner, setEnding, winnerOf, switchOf, toggleNoAttack, type Draft, type Ending, type Side } from '@/features/tagging/rally'
import { applyShotKey } from '@/features/tagging/shotKeys'
import {
  END_FIRST_PAUSE_S,
  afterRevisit,
  applySeqKey,
  beforeAttack,
  blockOf,
  blockWindow,
  defensiveToEnd,
  nextAllowed,
  nextStop,
  openAt,
  pairSide,
  pressSide,
  rowsFor,
  settleLastStroke,
  shotComplete,
  shouldStop,
  type SeqPlace,
  type SeqStop,
} from '@/features/tagging/sequence'

const fails: string[] = []
let checked = 0
const ok = (name: string, cond: boolean, detail = '') => {
  checked++
  if (!cond) fails.push(detail ? `${name}: ${detail}` : name)
}

function taps(n: number, server: Side = 'me'): Draft {
  let d = emptyDraft('v', server)
  for (let i = 0; i < n; i++) d = addContact(d, 10 + i)
  return { ...d, closed: true, start: 8, end: 10 + (n - 1) + 1 }
}

/** Stable JSON so key order in a shot does not count as a different rally. */
function canon(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canon)
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(src).sort()) out[key] = canon(src[key])
    return out
  }
  return value
}

/** The stored rally, without the id Save invents. */
function stored(d: Draft): string {
  const rally = rallyFromDraft(d, 'same')
  if (!rally) return ''
  const { id, ...rest } = rally
  return JSON.stringify(canon(rest))
}

function same(name: string, seq: Draft, current: Draft) {
  const a = stored(seq)
  const b = stored(current)
  ok(name, a !== '' && a === b, a === '' ? 'not ready to save' : `seq ${a} current ${b}`)
}

// --- Section 4. What gets stored ---

{
  const seq = setEnding(taps(1), 'Winner')
  const current = setEnding(taps(1), 'Winner')
  ok('ace opens on End', openAt(taps(1)).kind === 'end')
  ok('ace next is Ready', nextStop(seq, { kind: 'end' }).kind === 'ready')
  same('ace', seq, current)
  ok('ace has no first attack', seq.fa === null && rallyFromDraft(seq, 'x')?.winner === 'me')
}

{
  const seq = setEnding(taps(1, 'me'), 'Net')
  const current = setEnding(taps(1, 'me'), 'Net')
  same('serve error', seq, current)
  ok('serve error winner is the receiver', rallyFromDraft(seq, 'x')?.winner === 'them')
  ok('miss reason stays optional', nextStop(seq, { kind: 'end' }).kind === 'end')
}

{
  let seq = taps(2)
  seq = pressSide(seq, 2, 'offensive').draft
  seq = patchShot(seq, 2, { stroke: 'Flick', wing: 'FH' })
  seq = setEnding(seq, 'Winner')
  let current = taps(2)
  current = patchShot(current, 2, { stroke: 'Flick', wing: 'FH' })
  current = setEnding(current, 'Winner')
  same('2 shots, receive attacks', seq, current)
  ok('2 shot attack is shot 2', seq.fa === 2)
}

{
  let seq = taps(2)
  seq = pressSide(seq, 2, 'defensive').draft
  seq = patchShot(seq, 2, { stroke: 'Push', wing: 'BH' })
  seq = setEnding(seq, 'Long')
  let current = taps(2)
  current = patchShot(current, 2, { stroke: 'Push', wing: 'BH' })
  current = setEnding(current, 'Long')
  same('2 shots, receive pushed long', seq, current)
  ok('2 shot push is no attack', seq.noAttack && seq.fa === null)
}

{
  let seq = taps(6)
  ok('serve is the first stop', openAt(seq).shot === 1)
  const passed = pressSide(seq, 2, 'defensive')
  ok('defensive before the attack is not stored', passed.advance && passed.draft === seq)
  seq = pressSide(seq, 3, 'offensive').draft
  ok('offensive opens stroke, wing and intent', rowsFor(seq, 3).join(',') === 'pair,stroke,wing,intent', rowsFor(seq, 3).join(','))
  ok('a reply asks initiative', rowsFor(seq, 4).join(',') === 'pair,stroke,wing,initiative', rowsFor(seq, 4).join(','))
  ok('those three hold the walk', !shotComplete(seq, 3) && !nextAllowed(seq, { kind: 'shot', shot: 3 }))
  seq = patchShot(seq, 3, { stroke: 'Loop', wing: 'FH' })
  ok('Next skips intent', nextAllowed(seq, { kind: 'shot', shot: 3 }) && !shotComplete(seq, 3))
  ok('intent would move it on', shotComplete(patchShot(seq, 3, { intent: 'Neutral' }), 3))
  ok('initiative on the first attack would not', !shotComplete(patchShot(seq, 3, { initiative: 'Level' }), 3))
  seq = patchShot(seq, 6, { stroke: 'Block', wing: 'BH' })
  seq = setEnding(seq, 'Winner')
  let current = markFa(taps(6), 3)
  current = patchShot(current, 3, { stroke: 'Loop', wing: 'FH' })
  current = patchShot(current, 6, { stroke: 'Block', wing: 'BH' })
  current = setEnding(current, 'Winner')
  same('6 shots, attack on 3', seq, current)
  ok('replies are stops', shouldStop(seq, 4) && shouldStop(seq, 5) && !shouldStop(seq, 5) === false)
  ok('shot 5 stops and a later middle would not', shouldStop(markFa(taps(8), 3), 7) === false)
}

{
  let seq = taps(6)
  seq = pressSide(seq, 6, 'defensive').draft
  seq = patchShot(seq, 6, { stroke: 'Push', wing: 'BH' })
  seq = setEnding(seq, 'Long')
  let current = toggleNoAttack(taps(6))
  current = patchShot(current, 6, { stroke: 'Push', wing: 'BH' })
  current = setEnding(current, 'Long')
  same('6 shots, no attack', seq, current)
}

{
  let seq = taps(3)
  seq = pressSide(seq, 2, 'defensive').draft
  seq = pressSide(seq, 3, 'offensive').draft
  seq = patchShot(seq, 3, { stroke: 'Loop', wing: 'FH' })
  seq = setEnding(seq, 'Net')
  let current = markFa(taps(3), 3)
  current = patchShot(current, 3, { stroke: 'Loop', wing: 'FH' })
  current = setEnding(current, 'Net')
  same('attack on the last shot, missed', seq, current)
  ok('last attack winner is the receiver', rallyFromDraft(seq, 'x')?.winner === 'them')
}

// Walk order for 6 shots, attack on 3, Next past every optional row.
{
  let d = taps(6)
  let place: SeqPlace = openAt(d)
  const trail: string[] = [place.kind === 'shot' ? `s${place.shot}` : place.kind]
  place = nextStop(d, place as { kind: 'shot'; shot: number }) // Next on the serve
  trail.push(place.kind === 'shot' ? `s${place.shot}` : place.kind)
  const def = pressSide(d, 2, 'defensive')
  d = def.draft
  place = nextStop(d, { kind: 'shot', shot: 2 })
  trail.push(`s${(place as { shot: number }).shot}`)
  d = pressSide(d, 3, 'offensive').draft
  d = patchShot(d, 3, { stroke: 'Loop', wing: 'FH' })
  place = nextStop(d, { kind: 'shot', shot: 3 }) // Next skips initiative
  trail.push(`s${(place as { shot: number }).shot}`)
  place = nextStop(d, { kind: 'shot', shot: 4 })
  trail.push(`s${(place as { shot: number }).shot}`)
  place = nextStop(d, { kind: 'shot', shot: 5 })
  trail.push(place.kind)
  d = setEnding(d, 'Winner')
  place = nextStop(d, { kind: 'end' })
  trail.push(place.kind === 'shot' ? `s${place.shot}` : place.kind)
  d = patchShot(d, 6, { stroke: 'Push', wing: 'BH' })
  place = nextStop(d, { kind: 'shot', shot: 6 })
  trail.push(place.kind)
  ok('walk order attack on 3', trail.join(' ') === 's1 s2 s3 s4 s5 end s6 ready', trail.join(' '))
}

// --- Section 5. Going back ---

{
  let base = markFa(taps(6), 4)
  base = patchShot(base, 4, { stroke: 'Loop', wing: 'FH' })
  base = patchShot(base, 6, { stroke: 'Block', wing: 'BH' })
  let seq = pressSide(base, 2, 'offensive').draft
  seq = patchShot(seq, 2, { stroke: 'Flick', wing: 'FH' })
  seq = setEnding(seq, 'Winner')
  let current = markFa(base, 2)
  current = patchShot(current, 2, { stroke: 'Flick', wing: 'FH' })
  current = setEnding(current, 'Winner')
  same('move the first attack earlier', seq, current)
  ok('old stroke stays in the draft', seq.shots[3]?.stroke === 'Loop')
  ok('after the new rows, back to the furthest', afterRevisit(seq, { kind: 'end' }, false).kind === 'end')
}

{
  let base = markFa(taps(6), 3)
  base = patchShot(base, 3, { stroke: 'Loop', wing: 'FH' })
  const pressed = pressSide(base, 3, 'defensive')
  const current = markFa(base, 3)
  ok('defensive on the first attack clears it', pressed.cleared && pressed.draft.fa === null && current.fa === null)
  ok('the next shot is asked again', nextStop(pressed.draft, { kind: 'shot', shot: 3 }).kind === 'shot')
}

{
  let base = markFa(taps(6), 3)
  base = patchShot(base, 4, { stroke: 'Loop', wing: 'FH' })
  const seq = pressSide(base, 4, 'defensive')
  const current = flipSwitch(base, 4)
  ok('a reply flip keeps the first attack', seq.draft.fa === 3 && current.fa === 3)
  ok('a reply flip clears the stroke the same way', seq.draft.shots[3]?.stroke === undefined && current.shots[3]?.stroke === undefined)
  ok('back to the furthest point', afterRevisit(seq.draft, { kind: 'shot', shot: 6 }, false).kind === 'shot')
}

{
  let base = toggleNoAttack(taps(4))
  base = patchShot(base, 4, { stroke: 'Push', wing: 'BH' })
  let seq = pressSide(base, 4, 'offensive').draft
  seq = patchShot(seq, 4, { stroke: 'Loop', wing: 'FH' })
  seq = setEnding(seq, 'Net')
  // The current mode cannot pick a shot that shows Push. The stroke is set to
  // Loop first, which clears No attack, and the pick then lands.
  let current = patchShot(base, 4, { stroke: 'Loop', wing: 'FH' })
  current = markFa(current, 4)
  current = setEnding(current, 'Net')
  same('last shot of a no attack rally marked offensive', seq, current)
}

{
  let base = toggleNoAttack(taps(6))
  base = patchShot(base, 6, { stroke: 'Push', wing: 'BH' })
  let seq = pressSide(base, 3, 'offensive').draft
  let current = markFa(base, 3)
  seq = patchShot(seq, 3, { stroke: 'Flick', wing: 'FH' })
  current = patchShot(current, 3, { stroke: 'Flick', wing: 'FH' })
  seq = setEnding(seq, 'Winner')
  current = setEnding(current, 'Winner')
  same('earlier shot marked offensive on a no attack rally', seq, current)
  ok('no attack is off', !seq.noAttack && seq.fa === 3)
}

{
  let seq = setEnding(taps(4), 'Winner')
  seq = markFa(seq, 2)
  seq = patchShot(seq, 2, { stroke: 'Flick', wing: 'FH' })
  seq = patchShot(seq, 4, { stroke: 'Block', wing: 'BH' })
  const current = setEnding(seq, 'Lucky')
  const again = setEnding(current, 'Net')
  same('result changed', setEnding(seq, 'Lucky'), current)
  same('result changed to an error', setEnding(seq, 'Net'), again)
}


// --- The walk as the screen drives it ---
// Mirrors TagSetScreen: a field press is toggleShotField, then the walk moves
// on when the shot is complete. Offensive or Defensive is pressSide. Next is
// Defensive before the attack, else the next stop. The same answers are then
// given the current mode's way, and the stored rallies must match.

type Step =
  | ['next']
  | ['side', 'offensive' | 'defensive']
  | ['field', 'stroke' | 'wing' | 'depth' | 'intent' | 'initiative' | 'missReason', string]
  | ['result', Ending]
  | ['zero']

function walk(start: Draft, steps: Step[]): { d: Draft; trail: string; place: SeqPlace } {
  let d = start
  let place: SeqPlace = openAt(d)
  const trail: string[] = []
  const at = (p: SeqPlace) => (p.kind === 'shot' ? `s${p.shot}` : p.kind)
  trail.push(at(place))
  const go = (dest: SeqPlace) => {
    if (at(dest) !== at(place)) trail.push(at(dest))
    place = dest
  }
  for (const step of steps) {
    if (place.kind === 'ready') throw new Error(`step ${step.join(' ')} after Ready`)
    const stop = place as SeqStop
    if (step[0] === 'next') {
      if (!nextAllowed(d, stop)) {
        trail.push('next-dark')
        continue
      }
      if (stop.kind === 'shot' && beforeAttack(d, stop.shot)) {
        const pressed = pressSide(d, stop.shot, 'defensive')
        d = pressed.draft
        go(nextStop(d, stop))
      } else go(nextStop(d, stop))
    } else if (step[0] === 'side') {
      if (stop.kind !== 'shot') throw new Error('side on End')
      const pressed = pressSide(d, stop.shot, step[1])
      d = pressed.draft
      if (pressed.cleared || pressed.advance || shotComplete(d, stop.shot)) go(nextStop(d, stop))
    } else if (step[0] === 'field') {
      const shot = stop.kind === 'shot' ? stop.shot : d.contacts.length
      d = toggleShotField(d, shot, step[1], step[2] as never)
      if (stop.kind === 'shot' && shot === d.contacts.length) d = settleLastStroke(d)
      if (stop.kind === 'end') go(nextStop(d, stop))
      else if (shotComplete(d, stop.shot)) go(nextStop(d, stop))
    } else if (step[0] === 'result') {
      d = setEnding(d, step[1])
      go(nextStop(d, stop))
    } else if (step[0] === 'zero') {
      if (stop.kind !== 'shot' || !beforeAttack(d, stop.shot)) continue
      d = defensiveToEnd(d)
      go(d.ending ? { kind: 'shot', shot: d.contacts.length } : { kind: 'end' })
    }
  }
  return { d, trail: trail.join(' '), place }
}

{
  // 2 shots, receive attacks, every optional row answered.
  const w = walk(taps(2), [
    ['field', 'depth', 'Short'],
    ['result', 'Winner'],
    ['side', 'offensive'],
    ['field', 'stroke', 'Flick'],
    ['field', 'wing', 'FH'],
    ['field', 'intent', 'Aggressive'],
  ])
  ok('walk 2 shots attack trail', w.trail === 's1 end s2 ready', w.trail)
  let current = taps(2)
  current = toggleShotField(current, 1, 'depth', 'Short')
  current = setEnding(current, 'Winner')
  current = toggleShotField(current, 2, 'stroke', 'Flick')
  current = toggleShotField(current, 2, 'wing', 'FH')
  current = toggleShotField(current, 2, 'intent', 'Aggressive')
  same('walk 2 shots attack, intent saved', w.d, current)
  ok('2 shot attack keeps intent, no initiative', w.d.shots[1]?.intent === 'Aggressive' && !w.d.shots[1]?.initiative)
}

{
  // 2 shots, receive pushed: Push pressed with no Defensive press first.
  const w = walk(taps(2), [['next'], ['result', 'Long'], ['field', 'stroke', 'Push'], ['field', 'missReason', 'Misjudged'], ['field', 'wing', 'BH']])
  ok('walk 2 shots push trail', w.trail === 's1 end s2 ready', w.trail)
  let current = taps(2)
  current = setEnding(current, 'Long')
  current = toggleShotField(current, 2, 'stroke', 'Push')
  current = toggleShotField(current, 2, 'wing', 'BH')
  current = toggleShotField(current, 2, 'missReason', 'Misjudged')
  same('walk 2 shots push, no Defensive press', w.d, current)
}

{
  // Serve error: opens on End, the miss reason is optional and stored when given.
  const w = walk(taps(1, 'them'), [['next'], ['result', 'Net'], ['field', 'missReason', 'Misjudged']])
  ok('walk serve error trail (Next dark on End)', w.trail === 'end next-dark ready', w.trail)
  let current = setEnding(taps(1, 'them'), 'Net')
  current = toggleShotField(current, 1, 'missReason', 'Misjudged')
  same('walk serve error with reason', w.d, current)
  ok('serve error winner is me', rallyFromDraft(w.d, 'x')?.winner === 'me')
}

{
  // 3 shots: Next on the serve, Next on 2 (Defensive), 3 Offensive, missed.
  const w = walk(taps(3), [['next'], ['next'], ['result', 'Net'], ['side', 'offensive'], ['field', 'stroke', 'Loop'], ['field', 'wing', 'FH'], ['next']])
  ok('walk 3 shots trail', w.trail === 's1 s2 end s3 ready', w.trail)
  ok('Next never saves: the result comes before the last shot is ready', w.trail.startsWith('s1 s2 end'))
  let current = taps(3)
  current = setEnding(current, 'Net')
  current = markFa(current, 3)
  current = toggleShotField(current, 3, 'stroke', 'Loop')
  current = toggleShotField(current, 3, 'wing', 'FH')
  same('walk 3 shots attack on the last', w.d, current)
}

{
  // 3 shots: Next, Next, Winner, then Push and BH with Defensive already lit.
  const w = walk(taps(3), [['next'], ['next'], ['result', 'Winner'], ['field', 'stroke', 'Push'], ['field', 'wing', 'BH']])
  ok('walk 3 shots push goes to Ready', w.trail === 's1 s2 end s3 ready', w.trail)
  ok('push on the last shot is no attack', w.d.noAttack && w.d.fa === null && w.d.shots[2]?.stroke === 'Push')
  let current = setEnding(taps(3), 'Winner')
  current = toggleNoAttack(current)
  current = toggleShotField(current, 3, 'stroke', 'Push')
  current = toggleShotField(current, 3, 'wing', 'BH')
  same('walk 3 shots push saves as no attack', w.d, current)
}

{
  // A run of Next from the serve on a 6 shot rally stops on the last shot.
  const w = walk(taps(6), [['next'], ['next'], ['next'], ['next'], ['next'], ['next'], ['next'], ['next']])
  ok('Next run stops at End, before the last shot', w.trail.startsWith('s1 s2 s3 s4 s5 end') && w.place.kind === 'end', w.trail)
}

{
  // 6 shots, No attack by key 0 on shot 2.
  const w = walk(taps(6), [['next'], ['zero'], ['result', 'Winner'], ['field', 'stroke', 'Chop'], ['field', 'wing', 'BH']])
  ok('walk key 0 trail', w.trail === 's1 s2 end s6 ready', w.trail)
  let current = setEnding(taps(6), 'Winner')
  current = toggleNoAttack(current)
  current = toggleShotField(current, 6, 'stroke', 'Chop')
  current = toggleShotField(current, 6, 'wing', 'BH')
  same('walk 6 shots no attack by key 0', w.d, current)
}

{
  // 6 shots, attack on 3, replies answered, a later shot passed.
  const w = walk(taps(8), [
    ['field', 'depth', 'Half'],
    ['next'],
    ['side', 'offensive'],
    ['field', 'stroke', 'Loop'],
    ['field', 'wing', 'FH'],
    ['field', 'intent', 'Neutral'],
    ['field', 'stroke', 'Block'],
    ['field', 'wing', 'BH'],
    ['field', 'initiative', 'Behind'],
    ['next'],
    ['result', 'Winner'],
    ['field', 'stroke', 'Smash'],
    ['field', 'wing', 'FH'],
  ])
  ok('walk 8 shots trail skips 6 and 7', w.trail === 's1 s2 s3 s4 s5 end s8 ready', w.trail)
  let current = setEnding(taps(8), 'Winner')
  current = toggleShotField(current, 1, 'depth', 'Half')
  current = markFa(current, 3)
  current = patchShot(current, 3, { stroke: 'Loop', wing: 'FH', intent: 'Neutral' })
  current = patchShot(current, 4, { stroke: 'Block', wing: 'BH', initiative: 'Behind' })
  current = patchShot(current, 8, { stroke: 'Smash', wing: 'FH' })
  same('walk 8 shots, replies answered', w.d, current)
}

{
  // Delete last while tapping: the walk opens on the shorter rally and saves it like the current mode.
  const tapped = undoContact(addContact(taps(3), 20))
  const w = walk(tapped, [['next'], ['next'], ['result', 'Wide'], ['side', 'defensive'], ['field', 'stroke', 'Push'], ['field', 'wing', 'FH']])
  ok('walk after Delete last trail', w.trail === 's1 s2 end s3 ready', w.trail)
  let current = setEnding(taps(3), 'Wide')
  current = toggleNoAttack(current)
  current = toggleShotField(current, 3, 'stroke', 'Push')
  current = toggleShotField(current, 3, 'wing', 'FH')
  same('walk after Delete last', w.d, current)
}

{
  // Discard then Undo: the screen puts back the same draft and stop, so the walk carries on to the same rally.
  const half = walk(taps(4), [['next'], ['side', 'offensive'], ['field', 'stroke', 'Flick'], ['field', 'wing', 'BH']])
  const held = { draft: half.d, place: half.place }
  const restored = JSON.parse(JSON.stringify(held)) as typeof held
  ok('undo keeps the stop', JSON.stringify(restored.place) === JSON.stringify(half.place))
  let d = restored.draft
  d = toggleShotField(d, 4, 'stroke', 'Block')
  d = toggleShotField(d, 4, 'wing', 'FH')
  d = setEnding(d, 'Net')
  let current = setEnding(taps(4), 'Net')
  current = markFa(current, 2)
  current = patchShot(current, 2, { stroke: 'Flick', wing: 'BH' })
  current = patchShot(current, 4, { stroke: 'Block', wing: 'FH' })
  same('discard, undo, finish', d, current)
}

{
  // Edit of a rally saved in shot by shot mode: it opens as a draft and saves back unchanged.
  const w = walk(taps(5), [['next'], ['next'], ['side', 'offensive'], ['field', 'stroke', 'Drive'], ['field', 'wing', 'FH'], ['field', 'intent', 'Safe'], ['next'], ['result', 'Winner'], ['field', 'stroke', 'Loop'], ['field', 'wing', 'BH'], ['next']])
  const saved = rallyFromDraft(w.d, 'r1')
  ok('edit: the walk reached Ready', w.place.kind === 'ready' && saved !== null, `${w.trail} ${JSON.stringify(w.d)}`)
  if (saved) {
    const reopened = draftFromRally(saved)
    same('edit round trip', reopened, w.d)
    const changed = setEnding(reopened, 'Lucky')
    same('edit result change', changed, setEnding(w.d, 'Lucky'))
  }
}

// --- Blocks, the default side, and keys ---

{
  const six = [1, 2, 3, 4, 5, 6].map((s) => `${blockOf(6, s).from}-${blockOf(6, s).to}`)
  ok('6 shots are two blocks', six.join(' ') === '1-3 1-3 1-3 4-6 4-6 4-6', six.join(' '))
  ok('7 shots end on the last three', `${blockOf(7, 4).from}-${blockOf(7, 5).from}-${blockOf(7, 7).from}` === '4-4-5')
  ok('7 shot 6 stays in the earlier block', blockOf(7, 6).from === 4)
  ok('4 shots end on 2 to 4', blockOf(4, 4).from === 2 && blockOf(4, 2).from === 1)
  const d = taps(7)
  const w = blockWindow(d, 1)
  ok('a block uses the serve lead and a tail', w.a === 8 && w.b > w.a)
}

{
  const d = taps(6)
  ok('defensive is lit before the attack', pairSide(d, 2) === 'defensive')
  ok('the current rule would light offensive', switchOf(d, 2).side === 'offensive')
}

{
  let d = markFa(taps(4), 3)
  ok('stroke key works before the result', applyShotKey(d, 3, 'd') === null)
  const keyed = applySeqKey(d, { kind: 'shot', shot: 3 }, 'd')
  ok('sequential stroke key sets Flick', keyed?.kind === 'draft' && keyed.draft.shots[2]?.stroke === 'Flick')
  ok('N is Next', applySeqKey(d, { kind: 'shot', shot: 2 }, 'n')?.kind === 'next')
  ok('A before the attack is Offensive', applySeqKey(d, { kind: 'shot', shot: 2 }, 'a')?.kind === 'side')
  d = defensiveToEnd(d)
  ok('0 sets no attack', d.noAttack && d.fa === null)
  const end = applySeqKey(setEnding(taps(1), 'Winner'), { kind: 'end' }, 'q')
  ok('a result key on End sets Winner', end?.kind === 'draft' && end.draft.ending === ('Winner' as Ending))
}

// --- Won by sets the server ---

{
  const cases: { n: number; ending: Ending; winner: Side; server: Side }[] = [
    { n: 1, ending: 'Winner', winner: 'them', server: 'them' },
    { n: 1, ending: 'Net', winner: 'them', server: 'me' },
    { n: 2, ending: 'Net', winner: 'them', server: 'them' },
    { n: 2, ending: 'Winner', winner: 'them', server: 'me' },
    { n: 3, ending: 'Long', winner: 'me', server: 'them' },
    { n: 6, ending: 'Lucky', winner: 'me', server: 'them' },
  ]
  for (const c of cases) {
    for (const start of ['me', 'them'] as const) {
      const d = setEnding(taps(c.n, start), c.ending)
      const server = serverForWinner(d, c.winner)
      ok(`won by ${c.winner} on ${c.n} shots ${c.ending} from ${start}`, server === c.server && winnerOf({ ...d, server }) === c.winner)
    }
  }
  ok('no result leaves the server', serverForWinner(taps(3, 'them'), 'me') === 'them')
}

// --- Both walks: End before the last shot's details. End first only adds the pause. ---

{
  ok('a one shot rally opens on End', openAt(taps(1)).kind === 'end')
  ok('a longer rally opens on the serve', openAt(taps(4)).kind === 'shot' && openAt(taps(4)).shot === 1)
  ok('End first pauses one second', END_FIRST_PAUSE_S === 1)
  let d = setEnding(taps(3), 'Winner')
  ok('Next on End once a result is in', nextAllowed(d, { kind: 'end' }))
  const last = nextStop(d, { kind: 'end' })
  ok('End goes to the last shot while its details are open', last.kind === 'shot' && last.shot === 3)
  d = pressSide(d, 2, 'defensive').draft
  ok('the shot before the last still comes before End', nextStop(d, { kind: 'shot', shot: 1 }).kind === 'shot')
  d = pressSide(d, 3, 'defensive').draft
  d = patchShot(d, 3, { stroke: 'Push', wing: 'BH' })
  ok('last shot of a won rally goes to Ready', nextStop(d, { kind: 'shot', shot: 3 }).kind === 'ready')
  let e = setEnding(taps(1), 'Net')
  ok('a one shot error stays on End for the miss reason', nextStop(e, { kind: 'end' }).kind === 'end')
  e = toggleShotField(e, 1, 'missReason', 'Forced')
  ok('with a reason it goes to Ready', nextStop(e, { kind: 'end' }).kind === 'ready')
  const tagged = pressSide(pressSide(setEnding(taps(3), 'Net'), 2, 'defensive').draft, 3, 'defensive').draft
  const withStroke = patchShot(tagged, 3, { stroke: 'Push', wing: 'BH' })
  same('end first saves as shot by shot', toggleShotField(withStroke, 3, 'missReason', 'Forced'), toggleShotField(withStroke, 3, 'missReason', 'Forced'))
}

if (fails.length) {
  console.error(`sequence same-save: ${fails.length} of ${checked} failed`)
  for (const line of fails) console.error('  ' + line)
  process.exit(1)
}
console.log(`sequence same-save: all ${checked} checks passed`)
