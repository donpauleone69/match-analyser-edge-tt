# Wing, placement, pivot, crossover

_Living terminology — started 2026-11-11. Update this file in place._

Words we use when we talk about where a shot was played and how it was hit. Coaching speech is in the third column. The word in the first column is the one we write in specs, notes, and UI.

| Term | What it refers to | Example in a match | Word we write |
| --- | --- | --- | --- |
| Wing (forehand / backhand) | The stroke, the side of the body used | "She is a strong two-wing attacker." | **Wing** — `FH` or `BH` |
| Corner (forehand / backhand) | The physical side of the table the ball is aimed at | "He aimed deep into the backhand corner." | **Placement** — `BH`, `middle`, or `FH` |
| Pivot | A forehand played from the backhand side of the table | "He pivoted quickly to hit a forehand winner." | **Pivot** — described, not its own stored tag |
| Crossover / pocket | The middle zone between the two wings | "Jamming the opponent at the crossover." | **Crossover** — placement `middle` when the ball is aimed there |

## Preferred words

- **Wing** for the stroke. Forehand and backhand are the two wings.
- **Placement** for the side of the table. "Corner" stays in spoken examples ("backhand corner"). Specs and labels say placement.
- Sides are named **FH** and **BH**. Left and right follow the camera and the player's handedness, so we do not use them as the term.
- **Deep** is depth, not a third placement. "Deep into the backhand corner" is placement `BH` plus depth `long`.

## How a shot can use more than one

A player can stand on the backhand side and still play a forehand. That shot is wing `FH` and a pivot. Placement still records where the ball was aimed: `BH`, `middle`, or `FH`.

| Coaching picture | Wing | Placement | Also |
| --- | --- | --- | --- |
| Backhand from the backhand side | `BH` | wherever the ball went | |
| Forehand from the forehand side | `FH` | wherever the ball went | |
| Forehand from the backhand side | `FH` | wherever the ball went | Pivot |
| Ball jammed between the opponent's wings | the opponent's choice of wing | `middle` | Crossover / pocket |
| Deep into the backhand corner | the hitter's wing | `BH` | Length `long` |

## What the app stores today

On the shot (`DataSchema.md`):

- `shot_wing`: `FH` | `BH` — the stroke
- `shot_placement`: `BH` | `middle` | `FH` — where the ball was aimed, on serve and balls before the attack
- `shot_depth`: `short` | `half` | `long` — depth, kept beside placement

Pivot and crossover are coaching words. They are not their own columns. Older inference code treats a forehand from the backhand side as a pivot (`app/src/rules/infer/`).

## Update log

- **2026-11-11** — Aligned with Dexie v5 `shot_*` names (`shot_depth` replaces length).
- **2026-11-11** — First version from coaching table: wing, placement (preferred over corner), pivot, crossover / pocket.
