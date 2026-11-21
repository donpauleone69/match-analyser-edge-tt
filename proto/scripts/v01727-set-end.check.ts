/**
 * v0.17.27 set over, overrun pad and early save.
 * Run: npm run check:v01727
 */
import { readFileSync } from 'node:fs'
import { emptySet, matchSetsWon, type MatchRecord, type SetData } from '../src/data/demoStore'
import { overrunLabels, tagRegions } from '../src/features/tagging/inputModes'
import { settleFinished } from '../src/features/tagging/matchOps'
import type { Side } from '../src/features/tagging/rally'
import {
  canSaveEarly,
  countPoints,
  isLegalEnd,
  isSetWon,
  setEndIndex,
  setOverOnRule,
  type Points,
} from '../src/features/tagging/score'
import { endedEarly, lineAction, setIncomplete, setLineLabel } from '../src/features/tagging/setMark'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`PASS  ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL  ${name} ${detail}`.trim())
  }
}

const me = (n: number): Side[] => Array.from({ length: n }, () => 'me')
const them = (n: number): Side[] => Array.from({ length: n }, () => 'them')
const score = (winners: Side[]): Points => countPoints(winners)

/** The old Details clause: a broken set could be saved when the totals matched. */
function withDetailsClause(winners: Side[], entered: Points | null): boolean {
  const now = score(winners)
  const reached = entered !== null && entered.me === now.me && entered.them === now.them
  const end = setEndIndex(winners)
  return winners.length > 0 && (end === winners.length - 1 || Boolean(reached && entered && isSetWon(entered)))
}

function placed(setId: number, winners: Side[], finished: boolean): SetData {
  return {
    ...emptySet(setId),
    finished,
    rallies: winners.map((winner) => ({ winner }) as SetData['rallies'][number]),
    mark: { from: { videoId: 'v', t: 0 }, to: { videoId: 'v', t: 30 }, complete: true },
  }
}

function matchOf(s: SetData): MatchRecord {
  return {
    id: 'm',
    opponent: 'Kim',
    event: '',
    date: '',
    result: { me: null, them: null },
    videos: [],
    sets: [s],
    tagDone: true,
  }
}

const legal = [...them(9), ...me(10), 'me' as Side]
const deuce = [...me(10), ...them(10), 'me' as Side, 'me' as Side]
const overrun = [...me(11), ...them(9), 'me' as Side]
const early = [...me(9), ...them(7)]
const level = [...me(5), ...them(5)]

ok('11 - 9 is a legal end', isLegalEnd(score(legal)) && score(legal).me === 11 && score(legal).them === 9)
ok('12 - 10 is a legal end', isLegalEnd(score(deuce)) && score(deuce).me === 12 && score(deuce).them === 10)
ok('12 - 9 is not a legal end', !isLegalEnd({ me: 12, them: 9 }) && isSetWon({ me: 12, them: 9 }))
ok('11 - 10 is not a legal end', !isLegalEnd({ me: 11, them: 10 }))
ok('9 - 7 is not a legal end', !isLegalEnd(score(early)))
ok('5 - 5 is not a legal end', !isLegalEnd(score(level)))

ok('set over at 11 - 9', setOverOnRule(legal))
ok('set over at 12 - 10', setOverOnRule(deuce))
ok('overrun is not set over', !setOverOnRule(overrun) && isSetWon(score(overrun)))
ok('empty is not set over', !setOverOnRule([]))
ok(
  'details match does not save a broken set',
  withDetailsClause(overrun, { me: 12, them: 9 }) && !setOverOnRule(overrun),
)
ok('details differ still sets over on the rule', setOverOnRule(legal))

const screen = readFileSync('src/features/tagging/TagSetScreen.tsx', 'utf8')
ok('screen uses the rule', screen.includes('setOverOnRule('))
ok(
  'details clause is gone',
  !screen.includes('reachedEntered') && !screen.includes('atEntered') && !screen.includes('isSetWon(entered)'),
)

const labels = overrunLabels(18, 20)
ok('edit leads', labels.edit === 'Edit rally 18')
ok('remove is second', labels.remove === 'Remove 19 to 20')
ok('one rally still names both ends', overrunLabels(18, 19).remove === 'Remove 19 to 19')

const noop = () => {}
function pad(over: Partial<Parameters<typeof tagRegions>[0]> = {}) {
  return tagRegions({
    mode: 'watch',
    bestOn: false,
    bestQ: null,
    best: [],
    shotEdit: false,
    editRally: [],
    editStop: '',
    zoneOn: false,
    padTitle: 'Play',
    tapDim: false,
    overDim: false,
    removeDim: false,
    showRemove: false,
    removeAfter: 18,
    removeLast: 20,
    endPad: false,
    saveEarly: false,
    saveLabel: 'Save at 9 - 7',
    onOverrunEdit: noop,
    editing: false,
    editKind: null,
    editName: '',
    rallyOn: true,
    saveOn: false,
    saveDim: false,
    backDim: false,
    forwardDim: false,
    insertDim: false,
    onPad: noop,
    onFinish: noop,
    onOverEdit: noop,
    onRemove: noop,
    onRallies: noop,
    onGaps: noop,
    onBack: noop,
    onForward: noop,
    onEditRally: noop,
    onDeleteRally: noop,
    onInsert: noop,
    review: false,
    reviewPart: '',
    reviewMarked: false,
    reviewBackDim: false,
    reviewForwardDim: false,
    onReviewBack: noop,
    onReviewForward: noop,
    onReviewMark: noop,
    ...over,
  })
}

const overrunPad = pad({ showRemove: true, endPad: true, saveEarly: true })
ok('overrun leads with edit', overrunPad.regions[0]?.label === 'Edit rally 18' && overrunPad.regions[0]?.column === 1)
ok('overrun remove is second', overrunPad.regions[1]?.label === 'Remove 19 to 20' && overrunPad.regions[1]?.column === 2)
ok('overrun hides save', overrunPad.attrs['data-overrun'] === '' && !overrunPad.regions.some((r) => r.key === 'save'))

const earlyPad = pad({ endPad: true, saveEarly: true, saveLabel: 'Save at 9 - 7' })
ok('save at the score', earlyPad.regions.length === 1 && earlyPad.regions[0]?.label === 'Save at 9 - 7')
ok('early save is marked', earlyPad.regions[0]?.data?.['data-save-early'] === '')
ok('level has no save', pad({ endPad: true, saveEarly: false }).regions.length === 0)
ok('level pad is still the end', pad({ endPad: true, saveEarly: false }).attrs['data-end-pad'] === '')
ok('9 - 7 can be saved', canSaveEarly(score(early)))
ok('5 - 5 cannot be saved', !canSaveEarly(score(level)))
ok('10 - 10 cannot be saved', !canSaveEarly({ me: 10, them: 10 }))

const earlySet = placed(2, early, true)
const levelSet = placed(2, level, true)
const wonSet = placed(1, legal, true)
const overrunSet = placed(2, overrun, true)
ok('ended early line', setLineLabel(earlySet) === 'Set 2 · Saved · 9 - 7 · ended early')
ok('ended early flag', endedEarly(earlySet) && !setIncomplete(earlySet) && lineAction(earlySet) === 'Open')
ok('a win is not ended early', setLineLabel(wonSet) === 'Set 1' && !endedEarly(wonSet))
ok('level is not ended early', setLineLabel(levelSet) === 'Set 2' && !endedEarly(levelSet))
ok('level stays incomplete', setIncomplete(levelSet) && lineAction(levelSet) === 'Continue')
ok('overrun is not ended early', !endedEarly(overrunSet) && lineAction(overrunSet) === 'Open')
ok('early set counts for the leader', matchSetsWon(matchOf(earlySet)).me === 1 && matchSetsWon(matchOf(earlySet)).them === 0)

ok('early save stays finished', settleFinished(matchOf(earlySet), 2).sets[0]?.finished === true)
ok('level save reopens', settleFinished(matchOf(levelSet), 2).sets[0]?.finished === false)
ok('overrun edit reopens', settleFinished(matchOf(overrunSet), 2).sets[0]?.finished === false)
ok('a won set stays finished', settleFinished(matchOf(wonSet), 1).sets[0]?.finished === true)

const words = [labels.edit, labels.remove, 'Save at 9 - 7', setLineLabel(earlySet)].join('\n')
ok('no clip', !/\bclip\b/i.test(words))
ok('no long dash', !words.includes('—') && !words.includes('–'))
ok('no arrow', !words.includes('→') && !words.includes('➔'))

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nall passed')
