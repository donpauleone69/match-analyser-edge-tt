// Item 4 rule checks: Add contact (C1 to C9), Delete last, Re-tap. No browser.
// Run: sh proto/scripts/add-contact.sh
import {
  ADD_CONTACT_LEAD_S,
  RETAP_LEAD_S,
  addContactWindow,
  addedContactText,
  addedContactTime,
  insertContact,
  rallyStart,
  retapStart,
  stageOf,
  undoClosedContact,
  undoContact,
  winnerOf,
  type Draft,
  type Ending,
  type ShotTags,
  type Side,
  type Stage,
} from '@/features/tagging/rally'

let pass = 0
let fail = 0
const check = (name: string, ok: boolean, detail: unknown = '') => {
  if (ok) pass++
  else fail++
  const shown = ok || detail === '' ? '' : ` | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${shown}`)
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const NAMES: Record<Side, string> = { me: 'You', them: 'Sam' }
const MAX = 900
const draft = (patch: Partial<Draft>): Draft => ({
  videoId: 'v1',
  server: 'me',
  contacts: [],
  closed: true,
  start: null,
  end: null,
  ending: null,
  fa: null,
  noAttack: false,
  shots: [],
  highlight: false,
  ...patch,
})

const FH_LOOP: ShotTags = { wing: 'FH', stroke: 'Loop' }
const BH_BLOCK: ShotTags = { wing: 'BH', stroke: 'Block' }
const BH_PUSH: ShotTags = { wing: 'BH', stroke: 'Push' }
const FH_FLICK: ShotTags = { wing: 'FH', stroke: 'Flick' }

/** Base draft D: You serve, four shots, Sam hits shot 4 long, so You win. */
const D = () =>
  draft({ contacts: [10.0, 10.9, 11.8, 12.7], ending: 'Long', fa: 3, shots: [{}, {}, FH_LOOP, BH_BLOCK] })
const NO_ATTACK_3 = () =>
  draft({ contacts: [10.0, 10.9, 11.8], ending: 'In-Net', noAttack: true, shots: [{}, {}, BH_PUSH] })
const TWO_ATTACK = () => draft({ contacts: [10.0, 10.9], ending: 'Winner', fa: 2, shots: [{}, FH_FLICK] })
const TWO_NO_ATTACK = () =>
  draft({ contacts: [10.0, 10.9], ending: 'In-Net', noAttack: true, shots: [{}, BH_PUSH] })

type Want = {
  contacts: number[]
  shots: ShotTags[]
  fa: number | null
  noAttack: boolean
  ending: Ending | null
  winner: Side | null
  stage: Stage
  shot: number
  text: string
}

/** One press of the big button while Add contact is on. Undo is the draft that went in. */
function addCase(name: string, make: () => Draft, press: number, fence: number | null, want: Want) {
  const before = make()
  const snapshot = JSON.stringify(before)
  const { draft: after, shot } = insertContact(before, addedContactTime(before, press, fence, MAX))
  const got = {
    contacts: after.contacts,
    shots: after.shots,
    fa: after.fa,
    noAttack: after.noAttack,
    ending: after.ending,
    winner: winnerOf(after),
    stage: stageOf(after),
    shot,
    text: addedContactText(before, after, shot, NAMES),
  }
  for (const key of Object.keys(want) as (keyof Want)[]) {
    check(`${name}: ${key}`, eq(got[key], want[key]), { got: got[key], want: want[key] })
  }
  check(`${name}: end is ${want.ending === null ? 'cleared' : 'kept'}`, after.end === (want.ending === null ? null : before.end))
  check(`${name}: Undo puts the draft back exactly`, JSON.stringify(before) === snapshot && eq(before, make()))
  return after
}

const c1 = addCase('C1 in front', D, 9.4, null, {
  contacts: [9.1, 10.0, 10.9, 11.8, 12.7],
  shots: [{}, {}, {}, FH_LOOP, BH_BLOCK],
  fa: 4,
  noAttack: false,
  ending: 'Long',
  winner: 'them',
  stage: 'ready',
  shot: 1,
  text: 'Shot 1 added · Sam wins now',
})
check('C1 in front: start is null, so the rally starts at 7.1', c1.start === null && Math.abs(rallyStart(c1) - 7.1) < 1e-9, rallyStart(c1))

addCase('C2 middle, before the first attack', D, 11.65, null, {
  contacts: [10.0, 10.9, 11.35, 11.8, 12.7],
  shots: [{}, {}, {}, FH_LOOP, BH_BLOCK],
  fa: 4,
  noAttack: false,
  ending: 'Long',
  winner: 'them',
  stage: 'ready',
  shot: 3,
  text: 'Shot 3 added · Sam wins now',
})

addCase('C3 middle, after the first attack', D, 12.55, null, {
  contacts: [10.0, 10.9, 11.8, 12.25, 12.7],
  shots: [{}, {}, FH_LOOP, {}, BH_BLOCK],
  fa: 3,
  noAttack: false,
  ending: 'Long',
  winner: 'them',
  stage: 'ready',
  shot: 4,
  text: 'Shot 4 added · Sam wins now',
})

addCase('C4 after the end', D, 13.5, null, {
  contacts: [10.0, 10.9, 11.8, 12.7, 13.2],
  shots: [{}, {}, FH_LOOP, BH_BLOCK, {}],
  fa: 3,
  noAttack: false,
  ending: null,
  winner: null,
  stage: 'result',
  shot: 5,
  text: 'Shot 5 added',
})

addCase('C5 too close to a contact', D, 11.22, null, {
  contacts: [10.0, 10.9, 10.95, 11.8, 12.7],
  shots: [{}, {}, {}, FH_LOOP, BH_BLOCK],
  fa: 4,
  noAttack: false,
  ending: 'Long',
  winner: 'them',
  stage: 'ready',
  shot: 3,
  text: 'Shot 3 added · Sam wins now',
})

check('C6 going in: Sam wins (You hit shot 3 into the net)', winnerOf(NO_ATTACK_3()) === 'them')
addCase('C6 no attack rally', NO_ATTACK_3, 9.4, null, {
  contacts: [9.1, 10.0, 10.9, 11.8],
  shots: [{}, {}, {}, BH_PUSH],
  fa: null,
  noAttack: true,
  ending: 'In-Net',
  winner: 'me',
  stage: 'ready',
  shot: 1,
  text: 'Shot 1 added · You win now',
})

check('C7 going in: Sam wins (shot 2 is a winner)', winnerOf(TWO_ATTACK()) === 'them')
addCase('C7 two shots, attack', TWO_ATTACK, 9.4, null, {
  contacts: [9.1, 10.0, 10.9],
  shots: [{}, {}, FH_FLICK],
  fa: 3,
  noAttack: false,
  ending: 'Winner',
  winner: 'me',
  stage: 'ready',
  shot: 1,
  text: 'Shot 1 added · You win now',
})

check('C8 going in: You win (Sam hits shot 2 into the net)', winnerOf(TWO_NO_ATTACK()) === 'me')
addCase('C8 two shots, no attack', TWO_NO_ATTACK, 9.4, null, {
  contacts: [9.1, 10.0, 10.9],
  shots: [{}, {}, BH_PUSH],
  fa: null,
  noAttack: false,
  ending: 'In-Net',
  winner: 'them',
  stage: 'pickFa',
  shot: 1,
  text: 'Shot 1 added · Sam wins now',
})

addCase('C9 fence', D, 9.4, 9.3, {
  contacts: [9.35, 10.0, 10.9, 11.8, 12.7],
  shots: [{}, {}, {}, FH_LOOP, BH_BLOCK],
  fa: 4,
  noAttack: false,
  ending: 'Long',
  winner: 'them',
  stage: 'ready',
  shot: 1,
  text: 'Shot 1 added · Sam wins now',
})

// ---------- where the press lands
check('time: reaction time comes off the press', addedContactTime(D(), 11.65, null, MAX) === 11.35)
check('time: too close on the early side goes 0.05 before', addedContactTime(D(), 11.17, null, MAX) === 10.85)
check('time: on a contact exactly goes 0.05 after', addedContactTime(D(), 11.2, null, MAX) === 10.95)
check('time: never before the start of the video', addedContactTime(draft({ contacts: [1.0, 1.9] }), 0.1, null, MAX) === 0)
check('time: never past the end of the video', addedContactTime(D(), 20, null, 15) === 15)
check('time: 0.05 away is far enough', addedContactTime(D(), 11.25, null, MAX) === 10.95 && addedContactTime(D(), 11.15, null, MAX) === 10.85)
const tight = draft({ contacts: [10.0, 10.06] })
check('time: between two taps 0.06 apart it lands between them', (() => {
  const t = addedContactTime(tight, 10.31, null, MAX)
  return t > 10.0 && t < 10.06
})())
check('order: contacts stay in time order after every case', [9.4, 11.65, 12.55, 13.5, 11.22].every((press) => {
  const c = insertContact(D(), addedContactTime(D(), press, null, MAX)).draft.contacts
  return c.every((v, i) => i === 0 || v > c[i - 1])
}))
check('tags: every shot after the new one keeps its own tags', (() => {
  const d = D()
  const { draft: a, shot } = insertContact(d, 10.4)
  return shot === 2 && eq(a.shots[1], {}) && a.shots[0] === d.shots[0] && a.shots[3] === d.shots[2] && a.shots[4] === d.shots[3]
})())

// ---------- more of the rule
const lateFa = insertContact(draft({ contacts: [10.0, 10.9, 11.8, 12.7], ending: 'Long', fa: 4, shots: [{}, {}, {}, FH_LOOP] }), 12.2)
check('first attack on the end shot moves up with it', lateFa.draft.fa === 5 && stageOf(lateFa.draft) === 'ready')
const beforeFa = insertContact(D(), 11.8 + 0.05)
check('first attack: a contact just after it leaves it where it is', beforeFa.draft.fa === 3 && beforeFa.shot === 4)
const withTrim = draft({ ...D(), start: 8.2, end: 13.6 })
check('trim: Start is kept unless the contact goes in front', insertContact(withTrim, 11.35).draft.start === 8.2 && insertContact(withTrim, 9.1).draft.start === null)
check('trim: End is kept unless the contact goes after the end shot', insertContact(withTrim, 11.35).draft.end === 13.6 && insertContact(withTrim, 13.2).draft.end === null)
const twoAfter = insertContact(TWO_NO_ATTACK(), 11.5)
check('two shots, no attack, added after the end: result asked, no attack asked again', twoAfter.draft.ending === null && twoAfter.draft.noAttack === false && stageOf(twoAfter.draft) === 'result')
const serveOnly = insertContact(draft({ contacts: [10.0], ending: 'Winner', shots: [{}] }), 9.1)
check('serve only rally, serve added in front: the old shot is shot 2 and its wing and stroke are asked', serveOnly.shot === 1 && stageOf(serveOnly.draft) === 'endShot' && serveOnly.draft.ending === 'Winner')
check('highlight, server and video are untouched', (() => {
  const d = draft({ ...D(), highlight: true, server: 'them', videoId: 'v9' })
  const a = insertContact(d, 9.1).draft
  return a.highlight && a.server === 'them' && a.videoId === 'v9' && a.closed
})())
check('message: no winner line when the result is asked again', addedContactText(D(), insertContact(D(), 13.2).draft, 5, NAMES) === 'Shot 5 added')
check('message: no winner line when there was no result yet', (() => {
  const d = draft({ contacts: [10.0, 10.9, 11.8], shots: [{}, {}, {}] })
  return addedContactText(d, insertContact(d, 9.1).draft, 1, NAMES) === 'Shot 1 added'
})())

// ---------- the loop while Add contact is on
check('loop: 4 seconds before the first tap to the rally end', eq(addContactWindow(D(), null), { a: 6, b: 13.7 }) && ADD_CONTACT_LEAD_S === 4)
check('loop: not before the fence', eq(addContactWindow(D(), 9.3), { a: 9.3, b: 13.7 }))
check('loop: not before the start of the video', addContactWindow(draft({ contacts: [1.5, 2.4] }), null).a === 0)
check('loop: runs to a trimmed End', addContactWindow(withTrim, null).b === 13.6)

// ---------- Delete last
const tapping = draft({ contacts: [10.0, 10.9, 11.8], shots: [{}, {}, {}], closed: false })
const untapped = undoContact(tapping)
check('Delete last while tapping: the last tap goes, still tapping', eq(untapped.contacts, [10.0, 10.9]) && untapped.shots.length === 2 && untapped.closed === false)
const dl = undoClosedContact(D())
check('Delete last after the close on D: contacts', eq(dl.contacts, [10.0, 10.9, 11.8]), dl.contacts)
check('Delete last after the close on D: ending and end are null', dl.ending === null && dl.end === null)
check('Delete last after the close on D: fa stays 3', dl.fa === 3, dl.fa)
check('Delete last after the close on D: stage result', stageOf(dl) === 'result', stageOf(dl))
check('Delete last after the close on D: shot 3 keeps its tags', eq(dl.shots, [{}, {}, FH_LOOP]))
const dl4 = undoClosedContact(draft({ ...D(), fa: 4, shots: [{}, {}, {}, FH_LOOP] }))
check('Delete last with fa 4 on a four shot rally: fa null', dl4.fa === null && stageOf(dl4) === 'result', dl4.fa)
const dlNo = undoClosedContact(NO_ATTACK_3())
// As today: No attack survives down to two shots, and is dropped only when one shot is left.
check('Delete last on a three shot No attack rally: No attack is kept on the two left (unchanged)', dlNo.noAttack === true && dlNo.contacts.length === 2)
check('Delete last down to the serve alone: No attack is dropped', undoClosedContact(TWO_NO_ATTACK()).noAttack === false)
check('Delete last then Add contact after the end gives the same contacts back', eq(insertContact(dl, 12.7).draft.contacts, D().contacts))

// ---------- Re-tap
check('Re-tap: 2.5 seconds before the serve', retapStart(D(), null) === 7.5 && RETAP_LEAD_S === 2.5)
check('Re-tap: not behind the fence', retapStart(D(), 9.3) === 9.3)
check('Re-tap: not before the start of the video', retapStart(draft({ contacts: [1.2, 2.0] }), null) === 0)
check('Re-tap: the same place while tapping and after the close', retapStart({ ...D(), closed: false }, 3) === retapStart(D(), 3))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
