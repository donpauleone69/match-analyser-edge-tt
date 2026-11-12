# Shot fields and attributes

_Chat notes — 2026-11-11. Agreed and implemented (Dexie v5)._

One column per fact. Choices can be left blank (`null`). On/off attributes are toggles: `true` or `false`, default `false`, no blank.

`shot_strong` / Strong is dropped. A hard attack is expressed with `shot_quality`.

## Shot row

```
id
rally_id
video_id
player_id
shot_index
timestamp_start

shot_spin         'under' | 'top' | 'side' | null
shot_wing         'FH' | 'BH' | null
shot_stroke       'flick' | 'loop' | 'drive' | 'smash' | 'lob' | 'block' | null
shot_placement    'BH' | 'middle' | 'FH' | null
shot_depth        'short' | 'half' | 'long' | null
shot_contact      'over_table' | 'off_table' | null
shot_initiative   'behind' | 'level' | 'ahead' | null
shot_quality      'good' | 'normal' | 'poor' | null

shot_is_weak      boolean    // default false
shot_is_high      boolean    // default false
shot_is_heavy     boolean    // default false
```

## Options, empty, and which row asks

| Column | Options | If left alone | Row that asks |
| --- | --- | --- | --- |
| `shot_spin` | `under`, `top`, `side`, `null` | `null` | Serve |
| `shot_placement` | `BH`, `middle`, `FH`, `null` | `null` | Serve, pre-offensive |
| `shot_depth` | `short`, `half`, `long`, `null` | `null` | Serve, pre-offensive |
| `shot_wing` | `FH`, `BH`, `null` | `null` | Pre-offensive, attack, reply, next, continuation when the point ends |
| `shot_stroke` | `flick`, `loop`, `drive`, `smash`, `lob`, `block`, `null` | `null` | Attack (no block). Reply, next, and a continuation ending include block |
| `shot_contact` | `over_table`, `off_table`, `null` | `null` | First attack. Pills: Over table, Off table |
| `shot_quality` | `good`, `normal`, `poor`, `null` | `null` | First attack only |
| `shot_initiative` | `behind`, `level`, `ahead`, `null` | `null` | Reply and the next shot, while the point continues |
| `shot_is_weak` | `true`, `false` | `false` | Serve, pre-offensive |
| `shot_is_high` | `true`, `false` | `false` | Serve, pre-offensive |
| `shot_is_heavy` | `true`, `false` | `false` | Serve, pre-offensive |

## Contradiction rule

A shot never stores both attribute switches and quality. `deriveShotTagRole` + `allowListForRole` strip disallowed fields on save. The reply has no Weak pill.

## Update log

- **2026-11-11** — Agreed then built: drop strong; toggles `shot_is_*`; `shot_quality` on first attack; Dexie v5.
