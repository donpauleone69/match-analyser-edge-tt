# Themes

Three themes, one component set. Each file is a single `[data-theme]` rule loaded after `tokens/base.css`. They override contract literals only. Derived tokens (`-soft`, hover, pressed, and the aliases that are not restated) recompute. No theme is preferred.

| | scorebook | daylight | lamplight |
|---|---|---|---|
| Intent | A paper scorebook. Rules, not shadow. | An afternoon session. Room to read. | A dim room around a black picture. |
| UI font | Source Sans 3 | Figtree | IBM Plex Sans |
| Figures | tabular, by default | tabular, via `tnum` | tabular, by default |
| Labels | uppercase, 0.04em | sentence case | sentence case |
| Body / title / display | 15 / 18 / 32 | 16 / 20 / 28 | 16 / 18 / 28 |
| Page | `#f6f1e4` warm stock | `#e7eef3` cool stone | `#161310` charcoal |
| Ink | `#241c14` | `#122430` | `#f4eee4` |
| Action | table green `#1f6b38` | sea teal `#0f6772` | dark teal fill `#0e5560`, light teal links `#8fd0d4` |
| Mark | deep ochre `#8a4e08`, light text | deep ochre `#8a560c`, light text | gold `#f0c14a`, dark text |
| You / Them | cobalt and clay | proto blue and orange | bright blue and red-orange |
| Wings | split: indigo and brick | same hues as You and Them | split: dark blue and brick; short and control stay light |
| Radius, card | 2px, strong rule, no shadow | 8 / 12px, strong rule, one quiet shadow | 4 / 6px, hairline, no shadow |
| Density, card / stack / row | 12 / 8 / 56 | 20 / 16 / 68 | 14 / 10 / 58 |

All three keep the video on `#000` and the chrome on a 72% black scrim, so a bright frame does not wash the controls out. Micro type stays 12px. Zone sizes are not touched.

## scorebook

A match reads like a filled score sheet. Source Sans 3 is the narrowest passing face with tabular figures built in, so scores and the 22px wing labels stay compact. Hierarchy comes from the 32px stat, uppercase column labels, and a single green action. Cards are flat ruled boxes. Press scale is off.

You stays cobalt and Them stays clay. Backhand is a deeper indigo and forehand a brick, so a wing is not the same fill as a player cell.

Trade-off: uppercase labels take more width. They apply to field and column labels, not to the zone buttons. The darkened ochre used for a marked part is in the same family as the Long region. Both are warnings, and they show in different modes. Two dark ambers cannot also be 3:1 apart from each other.

## daylight

Built for a long read on a tablet. Figtree, the open end of the shortlist, at the top of each type range, with the loosest density the spec allows. Sentence case. The action is teal, not the proto brand and not a player blue. Radii are modest (control 8, card 12, sheet 16), with one shadow.

You and backhand stay blue. Them and forehand stay orange. This is the theme that keeps the mapping the proto already taught.

Trade-off: the card fill is only 1.13:1 against the page, so the card edge uses the strong line (4.4:1) rather than the hairline. The shadow is extra, not the thing that defines the card. Blue and orange still sit close in luminance; hue carries that pair, as it does today.

## lamplight

The page drops back so the picture is not a black rectangle on a white field. IBM Plex Sans has the highest x-height in the shortlist (0.75), which is what 12px ivory labels need, and its figures are tabular by default. Body steps up to 16. No shadow: a shadow on charcoal is mud. Borders do the separating.

One teal cannot be both a dark button fill and a light link. `--accent` is the dark fill (ivory text). `--accent-ink`, the focus ring, and the selected line are the light teal. Gold is only the mark and the warning text, so a link is not a flag.

The big regions stay dark, with ivory text, so the wings do not flare beside the picture. That means the light status-ink colours are not reused as fills. `--end-winner`, `--end-long`, `--end-net`, and `--timeline-span-saved` are set to dark literals. `--first-attack` is a light green edge, which is what reads on a dark rest cell.

Trade-off: short and control wings stay light pastels. `--ink-on-player` is one colour, and it has to clear 4.5:1 on the bright You and Them cells, so it cannot also be ivory on a dark wing. Long and attack stay dark. The light wings are the glare this theme accepts, and they are the ones that mean the softer shot.

## Contrast

Checked by resolving every colour token, including `color-mix(in srgb)` and `var()`, then measuring WCAG against the pairs in `design-system.md` section 2.3. Text at 4.5:1, including disabled text and the 12px mark label. UI marks, field edges, the focus ring, the card edge, and the first-attack edge at 3:1. Video chrome and the seek bar were composited over both a black frame and a white frame.

Chrome painted a swatch of all three (`tokens/base.css` plus the three files) and its computed `color-mix` for the sampled soft tokens matched the script. Source Sans 3, Figtree and IBM Plex Sans are vendored for the previews in `previews/fonts/`, so the theme frames draw those faces. The wing-width and x-height figures are the measurements in `design-system.md`.

All required pairs pass. The tightest:

| Pair | scorebook | daylight | lamplight |
|---|---|---|---|
| Worst text | 4.63 disabled | 4.80 accent text on sunken | 5.27 player text on Them |
| Mark on the page | 5.87 | 5.24 | 10.96 |
| Mark on sunken | 4.84 | 4.50 | 11.40 |
| Mark label on the mark fill | 6.19 | 6.15 | 10.82 |
| First-attack edge on both soft cells | above 5.1 | above 4.9 | above 5.6 |
| White-frame chrome text, and the muted line | 9.23 / 8.25 | 9.23 / 8.25 | 9.23 / 8.25 |
| Danger button, label on the danger fill | 6.15 | 5.92 | 5.27 |

Scorebook and Daylight put `--ink-inverse` on `--danger`. Lamplight's coral fill (`#e15d4e`) is only 3.18:1 under ivory, so the danger button uses `--ink-on-player` (`#14110e`) on that fill. The same dark ink stays on the lighter hover fill (`--danger-ink`), at 11.07:1. Quiet danger text on the page is still `--danger-ink`.

The base amber `#f59e0b` was 2.0:1 on the page, so a marked part was told apart by hue only. Each theme replaces it. On the two light pages the ochre is darkened until the line clears 3:1 on the page, on sunken, and on both player soft cells, and the label flips to light text. Dark text on a bright amber cannot hit both bars. On lamplight the mark goes the other way, to gold, with dark text.

## For previews

Load after `tokens/base.css`. Set `data-theme` to `scorebook`, `daylight`, or `lamplight`.

| Theme | Family | Weights |
|---|---|---|
| scorebook | Source Sans 3 | 400, 600, 700 |
| daylight | Figtree | 400, 600, 700 |
| lamplight | IBM Plex Sans | 400, 600, 700 |

`base.css` only names the face. The preview page loads it.
