import { THEMES, contrast, type ColorToken } from '../src/theme/themes.ts'

type Pair = [fg: ColorToken, bg: ColorToken, min: number, use: string]

const PAIRS: Pair[] = [
  ['chalk', 'ink-0', 7, 'Text on the page'],
  ['chalk', 'ink-2', 7, 'Text on a button'],
  ['chalk-mute', 'ink-0', 4.5, 'Secondary text'],
  ['chalk-mute', 'ink-1', 4.5, 'Secondary text on a card'],
  ['chalk-faint', 'ink-0', 3, 'Captions and counts, never the only cue'],
  ['ink-0', 'chalk', 7, 'Chosen answer label'],
  ['you', 'ink-0', 4.5, 'You as text'],
  ['kim', 'ink-0', 4.5, 'Kim as text'],
  ['ball', 'ink-0', 4.5, 'Action colour as text'],
  ['flag', 'ink-0', 4.5, 'Mark colour as text'],
  ['alert', 'ink-0', 4.5, 'The does not add up line'],
  ['you-ink', 'you', 4.5, 'Label on a You fill'],
  ['kim-ink', 'kim', 4.5, 'Label on a Kim fill'],
  ['ball-ink', 'ball', 4.5, 'Label on Delete last'],
  ['flag-ink', 'flag', 4.5, 'Label on a marked part'],
  ['alert-ink', 'alert', 4.5, 'Minus on a cell'],
  ['ink-4', 'ink-0', 1.5, 'Outline of a part button'],
  ['ball', 'vid-table', 3, 'The ball on the table'],
]

let failed = 0
for (const t of THEMES) {
  console.log(`\n${t.name}`)
  for (const [fg, bg, min, use] of PAIRS) {
    const r = contrast(t.color[fg], t.color[bg])
    const ok = r >= min
    if (!ok) failed++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} >= ${String(min).padEnd(3)} ${fg} on ${bg}, ${use}`)
  }
}
if (failed) throw new Error(`${failed} contrast pairs below target`)
console.log('\nAll contrast pairs pass')
