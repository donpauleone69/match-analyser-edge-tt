# Components

Shared UI is `app/src/ui-mine/`. Features import from `@/ui-mine` (the barrel `app/src/ui-mine/index.ts`). They do not import `lucide-react` or shadcn themselves. One folder per component: the component, `types.ts`, and `index.ts`. `buttonKinds.ts` sits beside the folders because the height classes are shared.

Heights follow the pointer, not the window width. Defaults in `app/src/index.css`: mouse is tap pad 80 px, main 44 px, control 36 px. A coarse pointer is main 48 px, control 44 px, tap pad 64 px, and tap pad 80 px when the viewport is at least 700 px tall. The set tagger overrides those variables for its own screen: mouse control 32 px and tap pad 40 px, coarse control 40 px and tap pad 48 px.

## When to use which

| Piece | Use it for |
|---|---|
| `Button` | A labelled action. `variant` is `primary` (brand), `secondary` (idle fill), or `ghost`. `kind` is `tapPad`, `main`, or `control` and sets the height. `fullWidth` stretches it. Disabled uses the disabled colours |
| `Pressable` | A `<button>` with no classes of its own. Tagging regions, filters, and anything that paints itself. Features do not write a raw `<button>` (`app/scripts/check-rules.mjs` rule R17) |
| `buttonKindClass` and the square, field, and text-link strings | The same heights on a control that is not `Button`. Square control for Back and Filter. Square tap pad for a companion beside the pad |
| `Card`, `CardTitle`, `CardDescription` | A bordered surface. `variant="interactive"` adds a hover lift. Title is 16 px semibold. Description is muted |
| `CardHead` | The three heads already on screen: icon and badge, icon only, or title and badge. No extra wrapper |
| `Icon` | The only icons. `name` is a key of `app/src/ui-mine/Icon/icons.ts` (`list`, `chart`, `user`, `play`, `star`, `filter`, and the rest of that map). `size` is a step, not a pixel font |
| `WfBadge` | A tiny label. `tone` `idle` (default) or `warning` |
| `WfWarnBadge` | The warning badge. Details uses it for Differs |
| `WfField` | A label over a value that cannot be edited. Gate and Account stubs. It is not a text input |
| `WfEmpty` | An empty state: title, optional body |
| `WfRow` | A stub list row: title, meta, trailing slot |

`CardHead` is the card head. Do not rebuild that row in a section.

## What is not a separate component

Tagging regions (Winner, BH Attack, Save set) are `Pressable` nodes with colours from the derive hooks, not a `Button` variant. The contact pad uses the tap-pad kind. Save set uses the brand fill. Back, Forward, Edit, and Delete use the slate rest style from the tagging styles, not a second button component.

Filter on Matches and Insights is `FilterButtonBlock` in `app/src/features/matches/blocks/FilterButtonBlock.tsx` (a square control). The sheet is `FilterSheetBlock` in the same folder. Insights reuses that sheet.

There is no shared flavour named quiet, pair, overlay, or icon-button. Those were a proposal. The code has the three kinds and the three variants above. A new control uses one of those, or `Pressable` when it must not look like them. A size change to a kind changes every control of that kind, including the tagger's local override if the change is meant for that screen too.
