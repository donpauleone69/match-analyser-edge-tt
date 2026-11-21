# UI audit — stage 1

Read-only audit of what is on screen and in source. No new system and no theme is proposed here.

Two interfaces live in this repo. Screenshots are under `design-audit/screenshots/current/`.

| Tree | What it is | Shot prefix |
|---|---|---|
| `app/` | The Vite app named in Architecture.md. Document title is `app`. | `app-` |
| `proto/` | The Set Tagger the zone spec describes. Rendered from a copy outside the repo so nothing in git was installed. | `proto-` |

Sizes: iPhone portrait 390×844, iPhone landscape 844×390, tablet portrait 820×1180, tablet landscape 1180×820, desktop 1440×900. Phone and tablet shots use a coarse pointer.

## Pages reviewed

**Shipping app, 12 routes.** Account gate, Home, Find (`/matches`), New match, Match Review (Summary, Details, Work on, Clips, Rallies), Pass 1 tag (`/matches/:id/tag`), Simple tag (`mode=simple`), Edit rally, Clips, Scope review (`/review`), Training, Account (`/settings`). Also confirmed: `?tab=highlights` becomes Clips with the highlights preset, and `/clubs` returns Home.

**Proto, 9 screens.** Gate, Matches, Insights, Account, match Insights, match Details, Tag checklist, Set Tagger on an open set (`/matches/m-partial/tag/2`) and on a finished set (`/matches/m-complete/tag/1`). An unstarted set (`/matches/m-ready/tag/1`) redirects to the Tag checklist. Shots of that redirect are named `tag-off-redirects-to-list`.

Docs read: `docs-match-analyser-edge-tt/Architecture.md`, `docs-match-analyser-edge-tt/specs/DesignSystem.md`, `proto/docs/ui-zones.md`, the zone rules in `proto/src/index.css` and `proto/src/features/tagging/`, and the live tokens in `app/src/index.css`.

## Verified problems

1. **Wide landscape breaks the Set Tagger zones.** On iPhone portrait the four zones match the spec exactly (measured): video 390×219, Set 40, Rally 64, input the rest. On iPhone landscape the formula also holds: picture 508×286 (16:9), wings 168px, Set and Rally under the picture only. On tablet landscape and desktop it does not. The picture is sized from the full container, `min(100cqw, (100cqh − 40 − 64) × 16/9)`, and its height stays `100cqh − 104` with `aspect-ratio: auto`. At 1180×820 the picture is 1180×716 and the 144px wings sit on top of it. Set and Rally are a 104px strip at the bottom. At 1440×900 the picture is 1415×796. The spec says the middle column is the picture and that nothing in the Input Area draws on the picture. People lose the table edges and the set/rally strip is crushed against the bottom.

2. **The shipping tagger has no zones and collapses in landscape.** Pass 1 and Simple share one stack: a video capped at `max-h-[42dvh]` and `w-full`, then a shot rail and pills. Measured video boxes: 390×219 portrait (16:9, fine), 844×164 phone landscape, 820×461 tablet portrait, 1180×344 tablet landscape, 1440×378 desktop. On a 390px-tall phone the form is cut off (Winner / stroke row falls below the screen). Transport buttons measure 26×28px at 10px type. There is no wing layout, so a wide window stretches one pill row across the screen (wings on the left, strokes on the right).

3. **Touch targets and type are below the product’s own rules.** `DesignSystem.md` asks for 44–48px controls and 15px body. Shipping `.tag-control` and Button `sm` are 26px tall and 10px type (`--control-height: 1.625rem`, `--control-text: 0.625rem`). Pass 1 section labels are 8px. Proto zone buttons (Edit Set, star, Edit Rally) measure 32px tall, 11px semibold, 6px corners. The spec asks for 12px. On a coarse pointer the tagger raises other controls to 40/44px and leaves these at 32px.

4. **“Muted” text is the same ink as primary text in the shipping app.** `--color-text` and `--color-text-muted` are both `#0f172a`. Hints, section labels and secondary lines do not recede. Proto does have a real muted (`#475569`).

5. **Three design documents describe three different products.** `DesignSystem.md` is a dark UI (sidebar 240px, bottom nav 64px, neutral-950 `#0a0a0a`). Its own note says those tables are historical and `app/src/index.css` wins. That file is a light remap: neutrals 50–600 are all `#0f172a`, and 700–950 are paper. `Architecture.md` (13 Nov) describes Pass 1 scorebug + shot rails and lists Highlights as a Review tab. The app redirects Highlights to Clips. `proto/docs/ui-zones.md` (19 Nov) describes four zones the shipping app does not render.

6. **Desktop and phone landscape still use the phone bottom bar in `app/`.** The bar is 48px (`h-12`) with 10px labels, on every shell page including 1440px desktop. A `Sidebar` (224px, five items) and a `Header` exist and are not mounted. On phone landscape the bar covers the bottom of the account gate. On Account, “Populate dummy data” sits under the bar.

7. **A saved proto set leaves a blank half-screen.** The spec says a saved set’s Input Area is empty. On iPhone portrait that empty region is about 520px under a 219px picture. The checklist and the tagger are also different screens: the checklist keeps the match tabs and a preview player; the set screen is full-bleed.

8. **Dead UI and two taggers.** Pass 1 and Simple are two composers on one chrome, switched by a control on the video. Beside them, unused: the SVG table-tennis buttons, Spin / Landing / Position grids, Phase 1 blocks (`Phase1ControlsBlock`, `RallyCard`, `ShotListItem`, `StatusGrid`, setup blocks), and `DataViewer` (its routes redirect Home). Training is a stub: snake_case labels (`forehand_loop`), raw file inputs, and two Home buttons.

9. **The shipping font files are not requested.** `app/index.html` has no font link. The CSS stack is Plus Jakarta Sans, DM Sans, system-ui. Proto loads Plus Jakarta from Google Fonts and does not load JetBrains Mono. This machine already had the faces, so these shots are not the iPhone fallback.

## Strengths to keep

- Phone-portrait zone geometry is exact and worth keeping as the contract: fixed Set 40px, fixed Rally 64px, 16:9 picture, input takes the rest, one component per zone, modes only change what fills the slots.
- Portrait input regions are full-colour, 22px, weight 700, and share the height. Empty cells are space, not boxes.
- Player and shot colours are opaque pastels on paper, so a selected pill stays readable. Callout and video-scrim tokens already exist for warnings and on-video chrome.
- Proto navigation follows orientation: bottom bar in portrait, left rail in landscape, and it hides inside a match. Phone-landscape Matches and Account use the extra width (Account becomes two columns).
- The shipping “Tap serve” pad is a real thumb control (`min-h-12`, up to 4.75rem), with the server colour on its edge.
- Match Review is five tabs, not a dashboard. Empty states say what to do next (“Nothing tagged yet”, “No clips yet”).
- Insights (proto) is a comparison, not a wall of cards: a percent, You / Them / Grade, then a playable row.

## Priority recommendations

1. Fix the landscape zone formula before any visual restyle. The picture stays 16:9, the wings stay beside it, and Set + Rally stay under the picture. When `(height − 104) × 16/9` is wider than the screen minus two 144px wings, shrink the picture height. Do not let the input draw on the picture.
2. On the shipping tagger, stop capping video at 42% of a short landscape viewport. Keep the question row on screen. Give transport and zone actions at least a 44px hit area; keep the big contact pad.
3. One type ramp and one muted ink. Drop 8–11px labels. Do not ship the dark tables in `DesignSystem.md`.
4. One shell. Phone portrait: bottom bar. Landscape and tablet: the proto rail. Desktop: a width limit and the rail, not a 48px bar under a sea of empty page.
5. Remove the unmounted sidebar, the unused Phase 1 button kit, and the duplicate tagger chrome before adding components. Keep Pass 1’s question order; it does not need a second visual language.
6. A finished set should not park the user on 500px of blank input. The spec currently requires empty columns; that is the behaviour to change on purpose, not by accident.

## Not rendered

- Edit Rally with a real rally, and Review / Clips / Work on with saved points. Saving needs first-attack, then wing and stroke; the capture pass stopped on that form. Shots show the in-progress match (“Nothing tagged yet”) and the question form itself. Edit Rally shots are the “Rally 1 not found” state.
- A camera file inside proto. The set screen draws its scripted table. Zone boxes were measured on that screen.
- iPhone font fallback. This environment already had Plus Jakarta Sans, DM Sans and JetBrains Mono.
