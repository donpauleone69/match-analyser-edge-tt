# Team brief — make it ready to look at

**Date:** 2026-11-12  
**Status:** Brief for the next build session. Not a layout.  
**Finish line:** A branch the user can keep, trim, or throw away. The team stops when every slice below is signed off or explicitly deferred, each signed slice is its own commit, and this file ends with a change list plus a short “look at this” script.

Related, do not contradict unless this brief explicitly revises them:

- `.cursorrules` — folder roles, naming, `rules/` purity, `@/ui-mine`
- `docs-match-analyser-edge-tt/DataSchema.md` — entities and the video-time contract
- `docs-match-analyser-edge-tt/chat_notes/focal_player_and_loose_video.md` — login is not the person in the point
- `docs-match-analyser-edge-tt/chat_notes/match_review_feedback_and_plan_2026-11-12.md` — player’s shoes; Work on + clips are the payoff; card walls were a step back
- `app/src/index.css` `@theme` — the token layer that already exists. `specs/DesignSystem.md` is older; the CSS tokens win if they disagree.

---

## What stays, what may go

**Keep and reach from the new flow.**

- The tagging screen and its menu (`/matches/:matchId/tag`, Pass 1). Do not replace it with a different tagger.
- Last night’s review system: Match Review as the hub, Work on with the rallies behind a problem, Clips, player-voice summary. That payoff stays. Chrome around it may move.

**May remove, archive, or replace** when a cleaner flow makes them redundant: the older shell and admin pages (sidebar entries such as Clubs, separate Players / Tournaments ceremonies, Analytics beta, Data viewer), create-match ceremony, card walls, and any page that exists only because an old menu pointed at it. “Archive” means it is gone from the user’s path. Dead routes and unused screens do not stay in the shell “just in case.”

File structure and naming stay as in `.cursorrules` (composers, sections, blocks, derive, `models.ts`, pure `rules/`). New UI goes in those folders. Do not invent a parallel tree.

---

## Stack

Stay on Vite, React, TypeScript, Zustand, Tailwind, and Dexie. The user is not attached to a particular library beyond that. If a slice cannot meet its done-when on the current tools, say so in the slice card, name the smallest addition, and only then add a dependency. Do not swap frameworks, databases, or UI kits for taste. Do not add a package that duplicates something already in the repo.

---

## How the team works

One parent chat is the **coordinator**. It does not write feature code. It owns order, ownership locks, git, consolidation of parallel results into this note, and the final change list.

**Multitask is allowed. Parallel writers in this checkout are not.** Prefer Cursor multi mode for scouts, viewport walks, and critiques. Keep **exactly one builder editing app code** in this checkout at a time. If two slices need simultaneous code edits, they must have disjoint touch folders written into both cards first; otherwise run them serially.

Use the role that fits the moment:

| Role | Who | Does | Parallel OK? |
|--|--|--|--|
| Coordinator | Parent chat | Order, locks, git, consolidate results into this note. No feature code. | n/a (one) |
| Scout | `explore` | Read an area; report files, behaviour, touch list. No edits. | Yes — fan out A–F scouts |
| Builder | `generalPurpose` | One owned slice: design → implement → own Vitest. | Only if touch folders are disjoint and locked |
| Browser | Browser tools on `http://localhost:5173/` | Walk assigned viewport cases. No feature edits. | Yes — one agent per viewport after code freeze |
| Critique | Fresh `generalPurpose` that did not build the slice | Judge done-when; propose Keep / Change / Next. Prefer **not** editing this file — return text to coordinator. | Yes — code critique + UX critique in parallel |

### Ownership and non-collision

Before any builder starts code:

1. Coordinator writes **Touch** on the slice card (folders/files).
2. Coordinator records an **ownership lock** under Session progress: slice id, owner role, touch paths, status `building`.
3. No other builder may edit locked paths. Scouts/browsers/critiques may read them.
4. After implement, coordinator sets status `code-frozen` before fanning out browser or critique agents.
5. Only the owning builder may un-freeze to fix test or critique Change items (at most one rebuild).
6. When signed or deferred, coordinator clears the lock and commits (signed only).

### What to parallelise (best practice)

| Wave | Parallel work | Serial work |
|--|--|--|
| Ahead of build | Scouts for upcoming slices | — |
| During build | — | One builder (or disjoint locked builders) |
| After code-frozen | Vitest (builder or dedicated runner); Desktop / iPad / iPhone browser agents; 1–2 critique agents | — |
| After agents return | — | Coordinator consolidates into the slice card, then sign / one rebuild / defer |

Do **not** parallelise two builders that both touch `App.tsx`, shell/nav, `cloudStore`, match-review composers, or `index.css` tokens. Prefer serial there.

Dependency default (do not violate without a written reason on the card):

`A → B → C → (D ∥ E scout/design) → D build → E build → F`

D and E may share a design/scout wave after C; their builds stay serial unless touch lists are proven disjoint. F waits on B + C + D.

### The loop (per slice)

Do not start implementation before the plan, the UX bet, and the test cases are written into the slice card.

1. **Think.** Scout (may already be done in parallel).
2. **Plan.** Job confirmation, touch folders, out of scope, ownership lock.
3. **Design.** UX bet + test cases on the card before feature code.
4. **Implement.** One owning builder. Follow `.cursorrules`.
5. **Code-freeze + Test.** Builder runs Vitest for the slice. Coordinator fans out the three browser viewports (and optional second critique) in multi mode. Agents return results to coordinator; coordinator writes one consolidated Result on the card.
6. **Critique.** Fresh agents; coordinator consolidates **Keep / Change / Next** onto the card.
7. **Repeat at most once.** A Change sends the slice through design → implement → test **one** time. Then sign off or defer with a reason. No further loops.

The next *build* starts from the critique, not from a new idea. Scouts for later slices may already be running.

### Test cases

Each slice card gets two lists **before** implementation.

**Functional cases** become Vitest tests next to the pure rule (inputs, expected outputs, the edge the user cares about). Run them and record pass/fail on the card. A slice with no pure decision still gets a test for the invariant it claims (token names exist, optional links stay optional, a trim offset does not move a contact, a scope filter includes and excludes the right matches).

**Browser cases** are steps a person can follow. For each case record device, steps, and what you should see. Run the same cases at three sizes (parallel agents OK after code-freeze):

| Device | Viewport |
|--|--|
| Desktop | 1440 × 900 |
| iPad | 820 × 1180 |
| iPhone | 390 × 844 |

Use the browser tools and set the viewport. Click and type through the flow. A screenshot alone is not a pass. If a viewport breaks the path (cannot reach tagging, cannot read the shot list, cannot play a clip), fix the layout before sign-off. If the browser tools are unavailable, write that on the card and do not claim the device passed.

**Regression gate when slices advance.** After each signed commit, before the next builder starts, run the prior slices’ Vitest files that guard shared contracts (at least: theme tokens if A signed; account scope if B signed; later: trim mapping, review scope, training exclusion). Record that gate on Session progress. This is how parallel later work proves it did not tread on earlier toes.

### Git, so slices can be kept or dropped

The user approves after the session. The team does not merge and does not push.

Before any feature edit:

1. Record the current branch and commit in this file. The session starts on `overnight/player-dashboard`, which already has uncommitted work from the review session the user has accepted.
2. Create and work only on branch `team/review-ready-2026-11-12`.
3. If the tree is dirty, make one commit on that new branch whose message is `baseline: accepted review session 2026-11-12`. Include the accepted app and doc changes. Do not include `.env`, credentials, `tmp_patch_phase1.py`, or `tmp_patch_phase2.py`.
4. Put a lightweight tag `pre-team-brief-2026-11-12` on that baseline commit if the tag does not already exist. That tag is the full rollback point. Slice commits come after it, so reverting the session does not throw away the accepted review.

After a slice is **signed** (tests green, critique keep or the one rebuild done):

- One commit on that branch. Message starts with the slice id, for example `slice A: readable shot list tokens`.
- Include only that slice’s files. Do not commit `.env`, credentials, or junk.
- Do not use `--no-verify`, force, reset, or amend. Do not change git config.

A deferred or broken slice gets **no** commit. Leave the branch at the last signed commit.

When A–F are each signed or deferred, append **Change list** to this file:

| Commit | Slice | What the user will notice | How to drop only this |
|--|--|--|--|
| hash | A | … | `git revert <hash>` on the branch |

Also state:

- Full rollback: check out tag `pre-team-brief-2026-11-12` (the branch can be deleted later; the team does not delete it).
- Keep a subset: revert the commits they do not want, in reverse order, and leave the rest.
- Nothing is on the previous branch and nothing is pushed, so looking is safe.

### Coding bar

- Composers, sections, blocks, derive hooks, `models.ts`. Pure logic in `rules/` only.
- Features import `@/ui-mine` and `@/ui-mine/Icon`. Never `lucide-react` or `@/components/ui` from features.
- Significant behaviour, schema, or UX: update `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` and, if types change, `DataSchema.md`.
- Dexie is the source of truth. Clip membership is derived, not stored as a second list of rallies. OPFS (else IndexedDB) holds video bytes. Cloud is a backup of an account, not a second app.

Stop when slices A–F are each signed or deferred, the change list is filled, and **Ready to look at** says what to click. Do not start a seventh slice.

---

## Outcome the whole team is aiming at

The signed-in person owns a library. They review as one player (themselves, or a player a coach has selected). The useful output is still what to work on, shown as the rallies behind it. The same review works for one match, a tournament, an opponent, or everything in the library. Video stays attached to that data and can be trimmed, archived, retrieved, and downloaded as a highlight without moving the tags onto the wrong ball. Tagging itself stays the Pass 1 screen.

Training is a separate section, not a match. The focal player posts short videos over time — about ten reps of a shot type, and named combinations such as serve, open, drive — and a coach compares this month with earlier months of the same shot or the same combination.

---

## Slice order

Do them in this order unless a written dependency in the slice card forces a swap.

| Order | Slice | Why this position |
|--|--|--|
| A | Readable scheme | Tokens first, so later screens inherit them. Fix tagging distinguishability now. Do not spend the slice repainting pages Slice C will remove. |
| B | Account and who you are reviewing as | Later slices need “whose library” and “whose shoes.” |
| C | One navigation model | Tournament, opponent, and global are scopes of this flow, not new apps. Old shell pages may go here. |
| D | Video that survives | Archive, trim, and download sit on the identity and the match flow. Timestamp contract is a rule, tested, before the UI promises it. |
| E | Wider than one match | Same review as C, over a set of matches. Aggregation in `rules/`. |
| F | Training, compared over time | Needs a person (B), a library entry that is not a match (C), and durable video (D). Not part of match review. |

---

## Slice cards

The builder fills **UX bet**, **Test cases**, **Result**, and **Critique**. The jobs and done-when lines below are the user’s. Do not weaken them.

### A — A scheme you can tell shots apart in

**Job.** Tagging is hard to scan. The dark scheme makes one shot look like the next. Produce one underlying scheme, consistent across the app, easy to change later, with enough color difference between shot roles and tag types that a list of contacts can be read at a glance.

**Done when.**

- Changing the scheme means editing tokens (the existing `@theme` block in `app/src/index.css`, or one successor module it imports), not hunting hex values in features.
- Pass 1 shot list: adjacent contacts are distinguishable by who played them and by the tag role that matters (serve, receive, first attack, result such as winner / error / air). Color is meaningful, not decoration.
- Match Review, Clips, and tagging use the same tokens. A light base is acceptable. A dark base is acceptable only if the shot list is genuinely easier to scan than today, proven by using it on desktop, iPad, and iPhone.
- Empty, selected, and live-contact states are still obvious.

**Job confirmation (coordinator + scout).** Confirmed. Pass 1 list is painted by `Pass1FocusBlock` / `pass1FocusModel` / `Pass1FocusComposer` with duplicated raw hex; `@theme` already has unused `player-*` and `shot-*` tokens but no serve/receive/first-attack/result/live/selected semantics. Winner/error/air currently share one `end` color. Light base preferred if it makes the shot list easier to scan; dark only if proven better in browser.

**Touch folders.** `app/src/index.css`; Pass 1 paint files; shared outcome/selected/review color uses in Match Review + Clips (token swap, not layout rebuild). Optional: Rally Focus duplicates if still reachable. Vitest token invariant next to theme.

**Out of scope.** Theme picker. New tagging behaviour. Routes/shell. Schema. Full repaint of screens Slice C will replace. Unused `ShotListItem.tsx`.

**UX bet.** Open a match in Pass 1 and scan the contact rail before reading labels: alternating player-side treatments establish who hit, while role accents distinguish serve, receive, first attack, and winner / error / air. Select a contact, move the live contact, and add an empty contact; selected, live, and empty states remain unmistakable without changing any tagging action. Open Match Review and Clips from the existing flow and see the same winner / error / review semantics carried through.

**Rebuild UX bet.** Unchanged: complete the same semantic language across the remaining visible Match Review and tagging outcome/review/highlight surfaces; no interaction or layout change.

**Test cases.**

- **Functional:** `index.css` defines semantic tokens for app surfaces/text, both player sides, serve, receive, first attack, winner, error, air, live contact, selected contact, and review state.
- **Functional:** `Pass1FocusBlock.tsx`, `pass1FocusModel.ts`, and `Pass1FocusComposer.tsx` contain no raw `#hex`; visual changes in those files resolve through theme-backed Tailwind utilities.
- **Functional:** Pass 1 role derivation and tagging behavior are unchanged; the visual mapping presents distinct role tokens for serve, receive, first attack, winner, error, and air.
- **Browser — Desktop 1440 × 900:** open an existing match → Tag / Pass 1; click adjacent contacts from both players, select a contact, move/play to the live contact, and inspect an empty slot. Expect player side and role to be distinguishable at a glance, with selected/live/empty states obvious and all controls still usable. Then open Match Review and Clips and expect winner/error/review colors to match Pass 1 semantics.
- **Browser — iPad 820 × 1180:** repeat the same click path. Expect the contact rail/list to remain readable without overlap or clipped role/state cues, and review/clip outcomes to use the same semantic colors.
- **Browser — iPhone 390 × 844:** repeat the same click path. Expect horizontal/compact presentation to preserve player, role, selected, live, and empty distinctions; tagging, review, and clip navigation remain reachable and usable.

**Functional check.** Token names cover surface, text, player side, and shot role. A feature file that needs a new color adds a token rather than a raw hex.

**Result (builder).**

- Added shared semantic tokens for player sides, serve, receive, first attack, winner, error, air, live contact, selected contact, and review. Pass 1 paint now uses tokens only; player alternation is carried by row surfaces, while role/result is carried by the accent and explicit label.
- Match Review and Clips winner/error, review, and selected treatments now use the same tokens. Tagging behavior, role derivation, routes, and layout were not changed.
- **Functional — PASS:** `npx vitest run src/themeTokens.test.ts` (2/2); required token names exist and all three Pass 1 paint files contain no raw hex. `npm run build` passed. No linter errors; `git diff --check` passed.
- **Desktop 1440 × 900 — PASS:** Review → Continue tagging; created four unsaved contacts; selected shot 2; marked shot 3 first attack and shot 4 Air; observed alternating blue/orange player surfaces, Serve / Receive / First attack / Air role labels, distinct live outline and selected surface, and the empty pre-contact state. No horizontal overflow. Returned without saving, opened Clips, and switched to the winner playlist; controls and semantic selected/winner states remained usable.
- **iPad 820 × 1180 — PASS:** repeated the full click path with four unsaved contacts, selected/live/first-attack/Air states, then Review → Clips → winner playlist. Shot rows stayed within 814 px with no horizontal overflow or clipped role cues.
- **iPhone 390 × 844 — PASS:** repeated the full click path. Shot rows stayed within 376 px, retained player alternation and Serve / Receive / First attack / Air labels, selected and live states remained distinct, and Review / Clips / winner playlist stayed reachable with no horizontal overflow.
- **Done-when:** met. Scheme changes are token edits; adjacent Pass 1 contacts differ by player and meaningful role/result; Review and Clips share the semantics; empty, selected, and live states remain obvious.

**Rebuild result.**

- Replaced the remaining direct emerald / rose / amber outcome, review, and highlight utilities in Set panels, rally player, comparison cards, Work on, Highlights, review patterns, and Pass 1 highlight states. Match outcomes now use `result-winner` / `result-error`, review/highlight uses `review`, and genuinely operational states use `success`, `warning`, or `danger`.
- Extended `themeTokens.test.ts` across all seven critique-named surfaces so direct emerald / rose / amber palette utilities fail the invariant.
- **Functional — PASS:** `npx vitest run src/themeTokens.test.ts` (3/3), `npm run build`, and edited-file lint checks all passed.
- **Desktop 1440 × 900 — PASS:** clicked through Summary, Details/sets, Work on, Highlights, Rallies, the rally player, Pass 1, and Clips. In Pass 1, created four unsaved contacts, selected shot 2, marked shot 3 First attack and shot 4 Winner, and toggled Highlight; role/player/live/selected states and the token-backed highlight remained distinct. Returned without saving and switched Clips to the winner playlist. No horizontal overflow.
- **iPad 820 × 1180 — PASS (quick regression):** winner Clips playlist, review navigation, playback/edit/export controls remained reachable with no horizontal overflow.
- **iPhone 390 × 844 — PASS (quick regression):** the same winner Clips and review controls remained reachable with no horizontal overflow.
- **Rebuild done-when:** met; the critique-named visible surfaces now share the semantic scheme and are covered by an invariant.

**Critique.**

- **Keep:** The desktop 1440 × 900 walk reached Match Review, Clips, and Pass 1. The dark base is materially clearer in Pass 1: player turns have alternating blue/orange surfaces, role/result colors are distinct and explicitly labelled, and live/selected treatments have separate outlines/rings. The new semantic token set and the removal of raw hex from the three Pass 1 paint files are the right foundation.
- **Change:** The shared scheme is not complete enough to sign off yet. Several visible winner/error/review/highlight treatments in this same flow still bypass the semantic tokens with direct Tailwind palette utilities: notably `SetPanelBlock.tsx`, `RallyPlayerBlock.tsx`, `CompareCardBlock.tsx`, `WorkOnSection.tsx`, `HighlightsSection.tsx`, `ReviewPatternBlock.tsx`, and highlight uses in `Pass1FocusComposer.tsx`. Replace matching `emerald` / `rose` / `amber` outcome and review uses with `result-winner`, `result-error`, and `review` tokens (or an existing general semantic token where the meaning is genuinely not match outcome/review). Extend the invariant so these reviewed surfaces cannot silently reintroduce direct palette colors for those semantics. Otherwise changing the scheme still requires hunting feature classes, and Match Review/tagging do not consistently share the scheme.
- **Next:** Later visual cleanup can tokenise unrelated operational states such as cloud availability, sync, focus rings, and generic information colors; those are not Slice A blockers.

**Post-rebuild critique.**

- **Keep:** The blocking change is satisfied. The seven named Match Review and Pass 1 surfaces now use `result-winner`, `result-error`, `review`, or the appropriate general semantic status tokens, and the expanded invariant rejects direct emerald / rose / amber utilities in those files. The rebuild result is supported by a fresh `themeTokens.test.ts` pass (3/3), a successful production build, and the recorded desktop plus responsive browser regressions. Slice A's done-when holds: Pass 1 remains readable by player, role, result, live, selected, and empty state, while Review and Clips share the same token-backed semantics.
- **Change:** None. No hard done-when failure remains.
- **Next:** Keep the earlier non-blocking cleanup note for operational states and alternate/test tagging surfaces; do not extend Slice A for it.

### B — Logged in, and clear whose shoes you are in

**Job.** Using the app means being an account. The library and the review belong to a player. If the account is a coach, they choose which player they are acting as, and from then on the app behaves as that player’s. If that model breaks a real flow, record why and implement the smallest alternative that still gives one library and one focal player.

**Done when.**

- An account is required to reach the library, tagging, and review. Cloud sign-in that already exists (`features/account`, `stores/cloudStore`) is the account system. Do not invent a second one.
- The account is not silently the person in the point. The focal player is who the review speaks as (“you / your serve / what you should work on”). A coach can switch the focal player; a player-account defaults to their own player record.
- This matches `focal_player_and_loose_video.md` unless the slice card records a revision and why.
- Switching focal player changes whose matches and whose “you” you see, and does not rewrite historical shot rows.

**Job confirmation (coordinator + scout).** Confirmed. Supabase auth exists but only gates cloud sync; all routes are public and copy says tagging works without account. `match.player1_id` is already the hero / “you”; keep that meaning. No account↔player link, role, or focal switcher yet. Pure scope rule should live at `rules/derive/account/deriveAccountScope.ts`. Do not rewrite shot rows. Prefer local profile persistence tied to `auth.uid()` if a new cloud table is not required for done-when; if a migration is the smallest honest store, document it in DataSchema.

**Touch.** `App.tsx` gate; `cloudStore` / `features/account`; home/match list/clips scope derives; match create default to focal; review entry scope check; `rules/derive/account/*`; DataSchema + specAddendum if types change.

**Out of scope.** Teams, clubs as permissions, federation login, billing. Shot rewriting. Analytics internals. Changing Pass 1 tagger.

**UX bet.** A signed-out visitor who opens Home, Matches, Clips, Match Review, or Tagging sees the existing cloud account screen instead of library data; after sign-in they return to the path they asked for. The first signed-in visit asks for one small, explicit profile choice: player or coach. A player links their account to their own player record and immediately reviews as that player. A coach chooses a focal player and can switch the “Reviewing as” player from Account & data; Home, Matches, Clips, match creation, review, and tagging then consistently use that player’s library and first-person “you”. Switching focal player filters the visible library and entry routes but never changes a match, rally, or shot row.

**Test cases.**

- **Functional:** a player account linked to player A resolves focal player A by default and includes only matches whose recorded hero (`match.player1_id`) is A.
- **Functional:** a coach account resolves the selected focal player; switching from A to B changes the included match ids and first-person focal id without mutating the supplied matches or shots.
- **Functional:** an incomplete player profile and a coach with no selected focal player resolve to setup-required, never to another player by inference.
- **Functional:** match-create defaults `player1_id` to the resolved focal player while preserving `player1_id` as the recorded hero; no shot `player_id` is rewritten.
- **Browser — Desktop 1440 × 900:** signed out, open Home, Matches, Clips, a Match Review URL, and its Tag URL. Expect the same existing cloud sign-in gate and no library content. Sign in, complete player/coach setup, return to the requested path, switch focal player as coach, and expect Home/Matches/Clips plus review/tag entry to show only that focal player’s matches and “you”.
- **Browser — iPad 820 × 1180:** repeat the gate, setup, and coach switch. Expect account controls, player choices, and blocked/out-of-scope messages to remain readable and actionable without horizontal overflow.
- **Browser — iPhone 390 × 844:** repeat the gate, setup, and coach switch. Expect sign-in, “Reviewing as”, and focal selection to remain reachable; match rows and review/tag entry messages fit the viewport.
- **Browser environment fallback:** if Supabase is not configured or browser sign-in cannot complete, verify the signed-out/configuration gate at all three viewports, record the exact blocker here, and complete resolver/store tests without adding a second authentication path.

**Functional check.** A pure rule or a single store action resolves “account → focal player → matches in scope.” A test covers coach-switch versus player-default, including “opponent shots are not rewritten.”

**Result (builder).**

- Reused Supabase auth and `cloudStore` as the only account system. Home/library, Matches, Clips, Match Review, Tagging, and Rally Edit now fail closed behind one account gate. A stalled session lookup falls back to the sign-in gate after 2.5 seconds instead of hanging.
- Added local account profile preference keyed by Supabase auth user id: player accounts explicitly link to their own player record; coaches explicitly choose and can switch “Reviewing as”. No credential or second login is stored locally.
- Added pure `deriveAccountScope`: player defaults to the linked player, coach resolves the selected focal player, and scope includes only matches whose recorded hero is that player. Home, match list, clips/reels, match-create default, and direct review/tag entry use that scope. `match.player1_id` remains the recorded hero.
- Switching focal player filters reads only. No match, rally, or shot update was added; tests retain opponent and focal shot rows byte-for-byte.
- **Functional — PASS:** `npx vitest run src/rules/derive/account/deriveAccountScope.test.ts` (3/3). Player default, coach switch, explicit setup requirement, match filtering, and unchanged matches/shots passed. `npm run build` passed; edited-file lint checks and `git diff --check` passed.
- **Full-suite baseline — unrelated failure:** `npx vitest run` passed 178/179 tests; the pre-existing `calculateServer.test.ts` 9–9 expectation failed (`player2` received, `player1` expected). Slice B’s test file passed in that run.
- **Browser blocker:** Supabase is configured, but session lookup did not respond and browser sign-in could not be completed. The app displayed the explicit account-service error and did not expose local library data; no fallback auth was added.
- **Desktop 1440 × 900 — PARTIAL PASS (blocked after gate):** direct Home/Matches, Clips, Match Review, and Tagging paths all resolved to the same account-required sign-in gate. The route stayed at the requested URL, sign-in controls were actionable, and there was no horizontal overflow.
- **iPad 820 × 1180 — PARTIAL PASS (blocked after gate):** the direct Tagging path showed the responsive account gate and sign-in controls with no horizontal overflow.
- **iPhone 390 × 844 — PARTIAL PASS (blocked after gate):** the same gate, requested-path copy, email/password fields, and sign-in action remained readable and reachable with no horizontal overflow.
- Coach/player setup, authenticated focal switching, and post-sign-in return could not be walked in the browser because the existing cloud auth service did not respond; resolver tests and production build cover the shipped model and scoping behavior.

**Critique.** _(coordinator fresh pass after Task critique agents aborted; code + gate UI inspected)_

- **Keep:** Done-when holds. Library/home, matches, clips, review, tagging, and rally-edit sit behind `AccountGateComposer` using the existing `cloudStore`/Supabase account only. `deriveAccountScope` (+ 3/3 tests) resolves player-default vs coach focal switch and filters `player1_id` matches without mutating match/shot inputs. Gate UI at desktop shows Account required + sign-in; stalled session fails closed with an explicit error and does not leak library data. Match-create defaults to focal; out-of-scope match URLs get a clear switch/back message.
- **Change:** none for sign-off.
- **Next:** Live coach/player setup walk still needs a working Supabase response. Ungated leftover shell routes (`/clubs`, `/players`, `/tournaments`, `/analytics`, data viewer) are Slice C cleanup, not a second auth. Tighten `/matches/create` so it is not treated as a match id in the gate matcher.

### C — One flow that matches how the data actually links

**Job.** The card wall and the extra page are a step back. Design navigation from the job and from the data, not from a dashboard template. Matches may or may not sit in a tournament. Tournaments may or may not sit in a federation. Opponents may be one-offs or recurring players. An account and a player are different things. Playing styles and attributes may matter later.

Consider those links. Build only the links that make the current flow honest. Record the rest as later, in this file, so the schema does not grow speculative tables.

The older menu outside tagging and last night’s review may be removed or replaced. Tagging and the review payoff (Work on, clips, player-voice summary) stay reachable and usable on desktop, iPad, and iPhone.

**Done when.**

- There is one way in: library → a scope (a match, and later the scopes in Slice E) → the same review (summary, what to work on, clips of the rallies). Work on + evidence clips stay the payoff.
- A match can exist with no tournament. A tournament can exist with no federation. An opponent can be a real player or still unknown, per the focal-player note.
- Creating and finding things follows that shape. The user is not sent through a ceremony of empty entities before they can tag.
- Browser walk on all three viewports: open a match, tag, review, reach a clip, come back, without a wall of comparison cards or a detached admin page. The library has a Training entry that is visibly not a match. Slice F fills that entry.

**Job confirmation (coordinator + scout).** Confirmed. Sidebar today: Home, Matches, Clips, Players, Tournaments, Clubs, Account & data + Analytics/Data viewer. Tagging + Match Review (summary/Work on/clips) stay. `tournament_id` and `player2_id` already optional on matches. Remove or archive shell destinations that are only old menu ceremony. Library gains a Training entry stub (not a match); F fills it. Keep AccountGate on library/review/tag. Slice E will add tournament/opponent/all scopes on the same review — C only needs match scope + honest optional links + Training stub. Auth browser walks may still be blocked by unresponsive Supabase (same as B); record that; do not invent a second login.

**Touch.** `App.tsx` routes; `Sidebar` / shell; Home + match list entry; review entry unchanged in purpose; Training stub route/page under `features/training` (placeholder only); remove ungated admin pages from nav and routes when replaced; optional-FK fixture/test; brief “later” notes for federation/style/attributes.

**Out of scope.** Building federation, style, and attribute products. Cross-match aggregation (Slice E). Video trim (Slice D). Replacing the Pass 1 tagger. The contents of Training (Slice F). Slice C only gives Training its own entry so it is not filed as a match.

**UX bet.** Sign in → Library (Home) lists the focal player’s matches and a Training entry that is clearly not a match. Open a match → same Match Review (Summary / Work on / Clips). From review, continue tagging on Pass 1, open a clip playlist, and return. New match asks only for opponent (optional) and goes straight to tagging — no tournament/club ceremony. Sidebar is only Library, Matches, Training, Clips, Account & data.

**Test cases.**

- **Functional:** a match with `tournament_id: null` and `player2_id: null` (opponent label only) is still considered openable for review; tournament/federation are not required.
- **Functional:** Training is routed separately from `/matches` and is not classified as a match scope entry.
- **Browser — Desktop 1440 × 900:** Library → open match → Review Summary → Work on → Clips → Tag → back. Expect no Clubs/Players/Tournaments/Analytics/Data viewer in the shell; Training visible and distinct.
- **Browser — iPad 820 × 1180 / iPhone 390 × 844:** same path; shell/nav usable; tagging and review reachable.
- **Browser fallback:** if account gate still blocks due to Supabase, verify shell/nav on the gate and that Training route is registered; record blocker.

**Later (not built):** federation product; playing-style / attribute products; tournament and opponent as review scopes (Slice E).

**Functional check.** Optional foreign keys stay optional. A test or a documented fixture shows a match with no tournament and an opponent that is only a label still opening review.

**Result (builder — coordinator stepped in after Task builders aborted).**

- Shell nav is Library · Matches · Training · Clips · Account & data. Clubs / Players / Tournaments / Analytics / Data viewer removed from the path (old URLs redirect to Library).
- `/training` stub under `features/training` is gated and labeled “Not a match”; Home/Library surfaces Training as separate practice.
- Optional-FK rule `canOpenMatchReview` + path helpers; Vitest 3/3. Account gate ignores `/matches/create` as a match id.
- **Functional — PASS.**
- **Browser — PARTIAL (Supabase still unresponsive):** Desktop/iPad/iPhone shell menu shows the five nav items including Training; `/training` reaches the account gate (not a match route); `/clubs` redirects to Library. Authenticated match → tag → review → clip walk blocked by the same account-service failure as Slice B.

**Critique.**

- **Keep:** Navigation matches the data story; tagging and review routes remain; Training is visibly not a match; optional links stay optional; old admin destinations are off the path.
- **Change:** none for sign-off (full authenticated walk remains env-blocked, already recorded).
- **Next:** Slice E scopes on this review; Slice F fills Training; restore live Supabase for end-to-end browser proof.

### D — Video stays linked, trimmable, archived, downloadable

**Job.** For the signed-in user, video persists with the match data. They can trim, archive, and retrieve it, and download a highlight clip. Cutting or archiving the file must not move tags onto the wrong contact.

**Done when.**

- Source video and any trimmed or exported file are `video_assets` (or a documented extension of that entity), tied to the match, retrievable after a reload for that account.
- Rally and shot timestamps stay in **source-video seconds**. A trim or an archive stores a mapping (the existing reel `segments` pattern is the one to extend) from the new file’s time back to source time. A pure test proves a contact still points at the same ball after a trim offset.
- From a highlight / work-on / clip list, the user can download a clip of that rally (whole rally by default, consistent with the shot/rally toggle already shipped).
- Browser, three viewports: attach a video, reload, it is still there; archive or trim; a tagged contact still seeks to the right moment; a highlight downloads.

**UX bet.**

**Test cases.**

**Functional check.** The timestamp mapping test above. No stored tag is rewritten to “file time” without the mapping beside it.

**Touch.** `videoAsset` entity and service, clip EDL rules, clip stage download, review storage/archive UI that Slice C left in Details.

**Out of scope.** A second exporter that ignores the EDL. Re-encoding the whole match as the only way to save a clip. Fake video metadata.

**Result (coordinator built after Task abort).**

- Pure trim/EDL map: contact at source 42.5 after a 10s leading trim stays 42.5 in tags; file time 32.5 maps back. Vitest clip suite includes trim mapping + validateTrimWindow + download filename (17/17 in final gate).
- `kind: 'trimmed'`, `archived_locally_at`; archive/retrieve/trim on Details → Storage; Clips stage Download via existing EDL exporter.
- Polish `9a43b76`: archive/retrieve require cloud copy (honest error); trim start/end in source seconds (not hardcoded first 10s).
- **Browser — BLOCKED** by account gate (same Supabase non-response). Functional done-when for mapping met; UI wired behind the gate.

**Critique.**

- **Keep:** Source-time contract tested; archive/trim/download use one video store and EDL map; no tag rewrite; polish closes the thin trim UX gap.
- **Change:** none for sign-off given env browser block already recorded.
- **Next:** Live attach/reload/download walk when auth works; optional Download on inline Work-on player.

### E — The same review, across more than one match

**Job.** Single-match review stays. In addition, the same slices (what to work on, the categories, the clips) work across a tournament’s tagged matches, across matches against one opponent, and across the focal player’s library. Four tagged matches in one tournament are one review of that tournament, not four disconnected matches and not a new visual language.

**Done when.**

- The UI is the Slice C review with a scope control: this match / this tournament / this opponent / all of mine. Same first person, same clip payoff. Usable on desktop, iPad, and iPhone.
- Numbers and playlists come from `rules/` over the matches in scope. A test builds a tiny set of matches and checks that a tournament scope includes those matches and excludes another tournament, and that an opponent scope includes only matches against that player.
- A match with no tournament still appears in “all of mine” and in an opponent scope, and does not appear in a tournament scope.

**UX bet.** From a match review or Library → All of mine, pick a scope (this match / tournament / opponent / all). Clips for that scope use the existing Clips UI filtered to those matches. Work on lists the scoped matches’ evidence entry points. Same first-person framing.

**Test cases.**

- **Functional:** tournament / opponent / all / no-tournament fixtures as in done-when.
- **Browser:** scope control reachable; auth may still block.

**Functional check.** The scope test above.

**Touch.** Review derive, analytics rules, scope entry from Slice C navigation. Reuse clip filters; do not fork a second clips UI.

**Out of scope.** New card dashboards. Style/attribute analysis. Federations as a product.

**Result (coordinator).** Pure `filterMatchesByScope` 5/5 tests. `/review` ScopeReviewComposer + ScopeControl on Match Review and Library. ClipsComposer accepts `matchIds` for scoped playlists. Browser auth-blocked.

**Critique.** **Keep** scope rule + control + reuse of Clips. **Change:** none. **Next:** richer combined Work on narrative across matches when auth allows UX polish.

### F — Training posts, compared over time

**Job.** A Training section, separate from matches. The focal player (or their coach, acting as them) keeps short videos that show progress: about ten reps of one shot type, posted so a later month can be compared with an earlier month, and named combinations (serve, then open, then drive, and others they add). A coach reviews the same shot or the same combination across time. This is not a match, has no score, and does not need an opponent or a tournament.

**Done when.**

- Training lives in its own part of the library. A training post never appears in match review, a tournament scope, an opponent scope, or match clips.
- A shot-type post is one shot type plus an ordered set of about ten clips, dated, for the focal player. Comparison shows two or more months of that same shot type and plays the clips. October’s ten do not appear inside November’s post.
- A combination post is a named sequence (the first one to prove the idea is serve → open → drive) and can be compared with an earlier post of that same combination. A combination does not show up as a shot-type post, and a shot-type post does not show up as that combination.
- Adding another shot type or another named combination does not require a schema change. Do not seed the product with every shot in table tennis. Prove it with one shot type and one combination, and leave the door open.
- Video uses the Slice D asset and source-time timestamps. Do not create a second video store.
- Browser, three viewports: post a shot-type set, post the same shot type in a later month, compare them; post a serve–open–drive combination and see it only under that combination. A coach acting as the player sees that player’s posts, not someone else’s.

**UX bet.** Training → post ~10 clips as shot type `forehand_loop` or combination `serve-open-drive` for this month → Compare months plays each month’s own clips side by side. Combinations listed separately from shot types.

**Test cases.**

- **Functional:** November excluded from October month list; combination excluded from shot-type series; training never in match scopes; coach focal sees only that player’s posts.
- **Browser:** auth may block; functional tests cover the model.

**Functional check.** Pure tests: a November post is excluded from October’s comparison of that shot type; a combination post is excluded from shot-type comparison and the reverse; a training post is excluded from every match scope in Slice E.

**Touch.** A training feature under the existing folder rules (`features/training/…`, `rules/` for grouping by month, shot type, and combination). Schema notes in `DataSchema.md`. The Training entry Slice C left in the library.

**Out of scope.** Match stats from training clips. Automatic shot detection. Reminders, a social feed, or a required monthly schedule. Every shot type and every combination on day one.

**Result (coordinator).** Dexie `training_posts` v7; `compareTrainingPosts` tests; Training UI posts/compare using `video_assets` via `training:{playerId}`. Prove labels: forehand_loop + serve-open-drive.

**Critique.** **Keep.** **Change:** none. **Next:** richer month picker UI when auth works for browser proof.

---

## Where this session started

- Prior branch: `overnight/player-dashboard` at `cb4604390f8f3df4faed4932a90f29c8bd92e173`
- Working branch: `team/review-ready-2026-11-12` (created from that HEAD with accepted dirty review work)
- Baseline commit: `540fb5b4ea939b6fa17230536a9b9b9f4cb1c1d2` (`baseline: accepted review session 2026-11-12`)
- Tag `pre-team-brief-2026-11-12`: exists on that baseline commit
- Excluded from baseline: `.env`, `tmp_patch_phase1.py`, `tmp_patch_phase2.py`

## Session progress (coordinator live board)

| Slice | Status | Commit |
|--|--|--|
| A | Signed | `992adae` |
| B | Signed | `fddee5f` |
| C | Signed | `f41ad9c` |
| D | Signed | `93464ee` (+ polish `9a43b76`) |
| E | Signed | `e85f4b8` |
| F | Signed | `01f9797` |

## Change list

| Commit | Slice | What the user will notice | How to drop only this |
|--|--|--|--|
| `992adaea8032d69ec14d654519f0501588b48252` | A | Pass 1 shot list uses shared player/role/result tokens; Review/Clips share the same semantics | `git revert 992adae` on the branch |
| `fddee5f5c8cb4fbc80385d56c8c393e61ad7eb9d` | B | Library/tag/review require account; coach can switch “Reviewing as”; player defaults to self | `git revert fddee5f` |
| `f41ad9cced22f48a8b552e3616505b07a0f0f01e` | C | Shell is Library · Matches · Training · Clips · Account; old Clubs/Players/Tournaments/Analytics/Data viewer paths redirect home | `git revert f41ad9c` |
| `93464ee3e2ed9410f5e9906930af31a5dcef085f` | D | Details storage: archive / retrieve / trim; Clips Download; source-time trim map | `git revert 93464ee` |
| `e85f4b83f235f06eaa5950fdd7cfab5a7a8863c6` | E | Scope control: this match / tournament / opponent / all of mine; `/review` | `git revert e85f4b8` |
| `9a43b76b3d49bbd2bd69bb061dcfb9d6b8e4b714` | D′ | Archive requires cloud backup; trim start/end in source seconds | `git revert 9a43b76` (before dropping D core if removing all of D) |
| `01f9797c123eb460ed32909139101efc55de1f3d` | F | Training posts (shot type + combination) with month compare | `git revert 01f9797` |

Deferred: none (all A–F signed). Browser end-to-end after sign-in was blocked by unresponsive Supabase on this machine; gates and Vitest cover the models. Final regression 35/35.

Also state:

- Full rollback: check out tag `pre-team-brief-2026-11-12` (`540fb5b`). The branch can be deleted later; the team does not delete it.
- Keep a subset: revert unwanted commits in reverse chronological order (`01f9797` → `9a43b76` → `e85f4b8` → `93464ee` → `f41ad9c` → `fddee5f` → `992adae`).
- Nothing is pushed; nothing is merged; looking is safe.

## Ready to look at

1. Open `http://localhost:5173/` on branch `team/review-ready-2026-11-12`.
2. Sign in (Account required). If cloud auth is down, you will see the gate — fix Supabase session to walk further.
3. After sign-in + player/coach setup: **Library** → open a match → Pass 1 colors → Review (Summary / Work on / Clips) → scope control → **Training** (not a match) → post/compare.
4. Removed from the shell path: Clubs, Players, Tournaments, Analytics, Data viewer (URLs redirect to Library).
5. Tagging Pass 1 and last night’s review payoff (Work on, clips, player-voice summary) stay.

---

## Prompt to paste

```text
You are the coordinator for Edge TT Match Analyser. Read and follow docs-match-analyser-edge-tt/chat_notes/team_brief_review_ready_2026-11-12.md — that file is the job, including “How the team works” (structured multitask) and Session progress. .cursorrules and DataSchema.md are coding/data constraints (update them when the job requires it).

Work on this PC, in this checkout, against http://localhost:5173/. Prefer Cursor multi mode. Do not push and do not merge.

Resume — do not re-baseline. Branch team/review-ready-2026-11-12 is already created; baseline 540fb5b and tag pre-team-brief-2026-11-12 already exist; Slice A is signed at 992adae. Pick up at Slice B (implemented, dirty, awaiting critique / possible one rebuild), then C→F.

Multitask rules (non-negotiable):
- Exactly one builder may edit app code in this checkout at a time, unless two slices have disjoint Touch paths locked on both cards.
- Parallelise freely: scouts; after code-freeze, Desktop 1440×900 / iPad 820×1180 / iPhone 390×844 browser agents; 1–2 fresh critique agents. Coordinator consolidates all returns into the slice card (one Result, one Keep/Change/Next). Critique agents should return text; coordinator writes the brief.
- Before the next slice build, run the regression Vitest files for already-signed slices (Session progress). That is the toe-treading check.
- Rebuild at most once per slice after critique Change. Then sign or defer. One commit per signed slice only (message starts with slice id). No .env, no tmp_patch_*.py. No --no-verify / force / reset / amend.

Per slice loop: think → plan (touch + lock) → design (UX bet + tests on card first) → implement → code-freeze → Vitest + parallel browser walks → consolidate → parallel critiques → consolidate → one rebuild max → commit if signed.

You may choose flow and visual flavor inside a slice. You may remove or replace old shell pages/menus that are not Pass 1 tagging and not last night’s review payoff (Work on, clips, player-voice summary). Keep .cursorrules folder/naming. Stay on the current stack unless a slice cannot meet done-when; record that before adding a dependency.

Training (F) is not a match. Shot-type posts ≈ ten clips compared across months. Combinations (prove serve → open → drive) compare across time. Do not file training under matches, tournaments, or opponents.

When A–F are each signed or deferred, fill Change list (hash, what the user will notice, how to revert that commit only, how to return to the tag) and Ready to look at, then stop.
```
