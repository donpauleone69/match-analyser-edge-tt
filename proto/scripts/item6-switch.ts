/**
 * Item 6 switch cases S1 to S18. Run: npm run check:item6
 * Prints one line per case and exits 1 on a miss.
 */
import { buildScripts } from '../src/features/tagging/script'
import { applyShotKey } from '../src/features/tagging/shotKeys'
import {
  ATTACK_STROKES,
  DEFENSIVE_STROKES_ROW,
  applyAutoSkip,
  flipSwitch,
  markFa,
  noAttackOffered,
  patchShot,
  rallyFromDraft,
  setEnding,
  showsStroke,
  strokeCells,
  switchOf,
  toggleNoAttack,
  undoClosedContact,
  type Draft,
  type StrokeSide,
} from '../src/features/tagging/rally'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`pass ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL ${name} ${detail}`.trim())
  }
}

function draft(over: Partial<Draft> & Pick<Draft, 'contacts' | 'shots'>): Draft {
  return {
    videoId: 'v',
    server: 'me',
    closed: true,
    start: null,
    end: null,
    ending: 'Long',
    fa: null,
    noAttack: false,
    highlight: false,
    ...over,
  }
}

const wing = { wing: 'FH' as const }
const s1 = draft({
  contacts: [1, 2, 3, 4, 5],
  fa: 3,
  shots: [{}, {}, { ...wing, stroke: 'Loop' }, {}, {}],
})

const sw = (d: Draft, shot: number) => switchOf(d, shot)
const cells = (d: Draft, shot: number, side?: StrokeSide) =>
  strokeCells(side ?? sw(d, shot).side, d.fa === shot).filter((c): c is string => c !== null)

// S1
{
  const a = sw(s1, 4)
  const b = sw(s1, 5)
  const before = sw(s1, 2)
  const fa = sw(s1, 3)
  ok('S1 shots 4 and 5 open Offensive and can flip', a.side === 'offensive' && !a.fixed && b.side === 'offensive' && !b.fixed)
  ok('S1 shot 2 Defensive fixed', before.side === 'defensive' && before.fixed && !showsStroke(s1, 2))
  ok(
    'S1 shot 3 Offensive fixed, four strokes, no Block',
    fa.side === 'offensive' && fa.fixed && cells(s1, 3).join() === 'Flick,Loop,Drive,Smash'
  )
}

// S2
{
  const d = patchShot(s1, 4, { stroke: 'Push' })
  ok('S2 shot 5 opens Defensive', sw(d, 5).side === 'defensive')
}

// S3
{
  const d = patchShot(s1, 4, { stroke: 'Block' })
  ok(
    'S3 shot 4 Offensive with Block, shot 5 Offensive',
    sw(d, 4).side === 'offensive' && d.shots[3]?.stroke === 'Block' && sw(d, 5).side === 'offensive'
  )
}

// S4
{
  const d = patchShot(patchShot(s1, 4, { stroke: 'Push' }), 5, { stroke: 'Block' })
  ok('S4 shot 5 Defensive with Block lit', sw(d, 5).side === 'defensive' && d.shots[4]?.stroke === 'Block')
}

// S5
{
  const d = draft({
    contacts: [1, 2, 3, 4],
    noAttack: true,
    shots: [{}, {}, {}, {}],
  })
  const end = sw(d, 4)
  ok(
    'S5 shot 4 Defensive fixed, Block Lob Push Chop',
    end.side === 'defensive' && end.fixed && cells(d, 4).join() === 'Block,Lob,Push,Chop'
  )
}

// S6
{
  const d = draft({ contacts: [1, 2, 3, 4], ending: 'Long', shots: [{}, {}, {}, {}] })
  const end = sw(d, 4)
  ok('S6 Offensive, can flip', end.side === 'offensive' && !end.fixed)
}

// S7
{
  const d = draft({ contacts: [1, 2], ending: 'In-Net', shots: [{}, {}] })
  const end = sw(d, 2)
  ok('S7 Defensive, can flip', end.side === 'defensive' && !end.fixed)
}

// S8 S9
{
  const base = draft({ contacts: [1, 2], ending: 'Winner', shots: [{}, { ...wing }] })
  const open = sw(base, 2)
  ok('S8 opens Offensive, can flip', open.side === 'offensive' && !open.fixed)
  const block = patchShot(base, 2, { stroke: 'Block' })
  ok('S8 pick Block: noAttack, fa null', block.noAttack === true && block.fa === null)
  const flick = patchShot(base, 2, { stroke: 'Flick' })
  ok('S9 pick Flick: fa 2', flick.fa === 2 && flick.noAttack === false)
}

function pressFlip(d: Draft, shot: number, shown: StrokeSide): { d: Draft; shown: StrokeSide } {
  if (sw(d, shot).fixed) return { d, shown }
  return { d: flipSwitch(d, shot), shown: shown === 'offensive' ? 'defensive' : 'offensive' }
}

// S10
{
  const d = patchShot(s1, 4, { stroke: 'Loop' })
  const flipped = pressFlip(d, 4, 'offensive')
  ok(
    'S10 flip clears Loop and shows Defensive',
    flipped.d.shots[3]?.stroke === undefined && flipped.shown === 'defensive' && cells(flipped.d, 4, flipped.shown).includes('Lob')
  )
}

// S11
{
  const d = patchShot(s1, 4, { stroke: 'Block' })
  const flipped = pressFlip(d, 4, 'offensive')
  ok(
    'S11 Block stays and the other list shows',
    flipped.d.shots[3]?.stroke === 'Block' && flipped.shown === 'defensive'
  )
  ok('S11 flip is not kept on the draft', sw(flipped.d, 4).side === 'offensive')
}

// S12
{
  const pushed = patchShot(
    draft({ contacts: [1, 2], ending: 'In-Net', shots: [{}, { ...wing }] }),
    2,
    { stroke: 'Push' }
  )
  ok('S12 starts noAttack', pushed.noAttack === true && pushed.fa === null)
  const flipped = pressFlip(pushed, 2, 'defensive')
  const flick = patchShot(flipped.d, 2, { stroke: 'Flick' })
  ok('S12 flip then Flick: fa 2, noAttack false', flick.fa === 2 && flick.noAttack === false && flipped.shown === 'offensive')
}

// S13
{
  const d = draft({
    contacts: [1, 2, 3, 4],
    ending: 'Winner',
    shots: [{}, {}, {}, { ...wing, stroke: 'Smash' }],
  })
  ok('S13 No attack not offered', noAttackOffered(d) === false && toggleNoAttack(d) === d)
}

// S14
{
  const d = draft({
    contacts: [1, 2, 3, 4],
    ending: 'Long',
    shots: [{}, {}, {}, { stroke: 'Block' }],
  })
  const next = markFa(d, 4)
  ok('S14 end shot Block refused', next.fa === null && next === d)
}

// S15
{
  const d = draft({
    contacts: [1, 2, 3, 4, 5],
    fa: 3,
    shots: [{}, {}, { stroke: 'Loop' }, { stroke: 'Block' }, {}],
  })
  ok('S15 Block shot refused as first attack', markFa(d, 4).fa === 3)
}

// S16 Delete last keeps No attack on the way from three shots to two.
// Entering an attacking stroke on that end shot clears No attack and decides again.
{
  const three = draft({
    contacts: [10, 10.9, 11.8],
    ending: 'Long',
    noAttack: true,
    shots: [{}, { ...wing }, { stroke: 'Push' }],
  })
  const two = undoClosedContact(three)
  ok(
    'S16 delete last keeps No attack on two shots',
    two.contacts.length === 2 && two.noAttack === true && two.ending === null && two.fa === null
  )
  for (const stroke of ATTACK_STROKES) {
    const withResult = setEnding(two, 'In-Net')
    const entered = patchShot(withResult, 2, { stroke })
    ok(
      `S16 enter ${stroke} clears No attack and sets fa 2`,
      entered.noAttack === false && entered.fa === 2 && entered.shots[1]?.stroke === stroke,
      `noAttack=${entered.noAttack} fa=${entered.fa}`
    )
  }
  const still = patchShot(setEnding(two, 'In-Net'), 2, { stroke: 'Push' })
  ok('S16 Push leaves No attack', still.noAttack === true && still.fa === null)
}

// S17 Moving the first attack later keeps the strokes already answered in the draft.
// The shots now before it show no stroke row, and Save leaves their strokes out. Moving it back brings them back.
{
  const before = draft({
    contacts: [1, 2, 3, 4, 5],
    fa: 3,
    shots: [
      {},
      { wing: 'BH' },
      { wing: 'FH', stroke: 'Loop' },
      { wing: 'BH', stroke: 'Drive' },
      { wing: 'FH', stroke: 'Smash' },
    ],
  })
  const after = markFa(before, 5)
  ok('S17 first attack is shot 5', after.fa === 5 && after.noAttack === false)
  ok(
    'S17 strokes before it stay in the draft with their wings, and have no row',
    after.shots[2]?.stroke === 'Loop' &&
      after.shots[2]?.wing === 'FH' &&
      after.shots[3]?.stroke === 'Drive' &&
      after.shots[3]?.wing === 'BH' &&
      !showsStroke(after, 3) &&
      !showsStroke(after, 4)
  )
  ok('S17 the new first attack keeps Smash', after.shots[4]?.stroke === 'Smash' && showsStroke(after, 5))
  const saved = rallyFromDraft(after, 'r')
  ok(
    'S17 Save leaves out the strokes with no row and keeps the wings',
    saved !== null &&
      !('stroke' in saved.shots[2]) &&
      saved.shots[2].wing === 'FH' &&
      !('stroke' in saved.shots[3]) &&
      saved.shots[3].wing === 'BH' &&
      saved.shots[4].stroke === 'Smash'
  )
  const back = markFa(after, 3)
  ok(
    'S17 moved back to shot 3: every answer is as it was',
    back.fa === 3 && JSON.stringify(back.shots) === JSON.stringify(before.shots)
  )
}

// S18 No attack on three or more shots keeps the strokes in the draft. Save keeps only the end shot's.
{
  const before = draft({
    contacts: [1, 2, 3, 4],
    fa: 3,
    ending: 'Long',
    shots: [{}, { wing: 'BH', stroke: 'Push' }, { wing: 'FH', stroke: 'Loop' }, { wing: 'BH', stroke: 'Chop' }],
  })
  const after = toggleNoAttack(before)
  ok('S18 No attack, fa cleared', after.noAttack === true && after.fa === null)
  ok(
    'S18 strokes stay in the draft, only the end shot has a row',
    JSON.stringify(after.shots) === JSON.stringify(before.shots) &&
      !showsStroke(after, 2) &&
      !showsStroke(after, 3) &&
      showsStroke(after, 4)
  )
  const saved = rallyFromDraft(after, 'r')
  ok(
    'S18 Save leaves out the strokes with no row, wings stay, end stroke stays',
    saved !== null &&
      !('stroke' in saved.shots[1]) &&
      saved.shots[1].wing === 'BH' &&
      !('stroke' in saved.shots[2]) &&
      saved.shots[2].wing === 'FH' &&
      saved.shots[3].stroke === 'Chop' &&
      saved.shots[3].wing === 'BH'
  )
  const back = markFa(toggleNoAttack(after), 3)
  ok(
    'S18 No attack taken back and shot 3 picked again: every answer is as it was',
    back.fa === 3 && back.noAttack === false && JSON.stringify(back.shots) === JSON.stringify(before.shots)
  )
}

// Keys
{
  const d = draft({
    contacts: [1, 2, 3, 4],
    fa: 3,
    ending: 'Winner',
    shots: [{}, {}, { ...wing, stroke: 'Loop' }, {}],
  })
  const flipped = applyShotKey(d, 4, 'z', 'offensive')
  ok('key Z flips and clears an empty shot to Defensive list', flipped !== null && sw(flipped!, 4).side === 'offensive' && flipped!.shots[3]?.stroke === undefined)
  const block = applyShotKey(d, 4, 'x', 'offensive')
  ok('key X is Block', block?.shots[3]?.stroke === 'Block')
  const flick = applyShotKey(d, 4, 'c', 'offensive')
  ok('key C is Flick on Offensive', flick?.shots[3]?.stroke === 'Flick')
  const lob = applyShotKey(d, 4, 'c', 'defensive')
  ok('key C is Lob on Defensive', lob?.shots[3]?.stroke === 'Lob')
  const none = applyShotKey(d, 4, 'n', 'defensive')
  ok('key N does nothing on Defensive', none === null)
  const faX = applyShotKey(d, 3, 'x', 'offensive')
  ok('key X does nothing on the first attack', faX === null)
  const faZ = applyShotKey(d, 3, 'z', 'offensive')
  ok('key Z does nothing on a fixed first attack', faZ === null)
  ok('M and comma do nothing', applyShotKey(d, 4, 'm', 'offensive') === null && applyShotKey(d, 4, ',', 'offensive') === null)
}

// Demo script: shots before the first attack are defensive only.
{
  const videos = buildScripts(7, [
    { firstServer: 'me', winners: Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? 'me' : 'them')) },
  ])
  const defensive = new Set<string>(DEFENSIVE_STROKES_ROW)
  let before = 0
  let bad = 0
  for (const rally of videos.flatMap((v) => v.rallies)) {
    rally.play.forEach((p, i) => {
      const shot = i + 1
      if (shot === 1) return
      if (rally.fa === null || shot < rally.fa) {
        before += 1
        if (!defensive.has(p.stroke)) bad += 1
      }
      if (rally.fa === shot && !(ATTACK_STROKES as readonly string[]).includes(p.stroke)) bad += 1
    })
  }
  ok(`demo before first attack stays defensive (${before} shots)`, before > 0 && bad === 0, `bad=${bad}`)
}

// applyAutoSkip still decides a fresh two shot rally.
{
  const d = applyAutoSkip(
    draft({ contacts: [1, 2], ending: 'Winner', shots: [{}, { ...wing, stroke: 'Drive' }] })
  )
  ok('fresh Drive on two shots is fa 2', d.fa === 2 && d.noAttack === false)
}

if (fails.length) {
  console.log(`${fails.length} failed`)
  process.exit(1)
}
console.log('all passed')
