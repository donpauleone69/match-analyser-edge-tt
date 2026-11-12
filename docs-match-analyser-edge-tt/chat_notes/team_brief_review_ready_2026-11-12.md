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

One parent chat is the coordinator. It does not write feature code. It runs **one builder at a time** in this checkout. Parallel builders will overwrite each other. Do not use multitask to fan out slices.

Use the role that fits the moment:

| Role | Who | Does |
|--|--|--|
| Coordinator | Parent chat | Order, git, this note, the final change list. No feature code. |
| Scout | `explore` | Read the area before a slice is planned. Report files and behaviour. No edits. |
| Builder | `generalPurpose` | One slice: design through test. |
| Browser | Browser tools on `http://localhost:5173/` | Walk the test cases. Desktop, iPad, iPhone. |
| Critique | A **new** `generalPurpose` that did not build the slice | Use the feature, then edit only this note (Keep / Change / Next). |

### The loop

Every slice goes through this, in order. Do not start implementation before the plan, the UX bet, and the test cases are written into the slice card.

1. **Think.** Scout the code the slice will touch. Read the constraints in this brief.
2. **Plan.** Fill job confirmation, touch folders, and out of scope. Flavor is allowed inside the job. New products the job does not need are not.
3. **Design.** Write the UX bet (the click path in a few lines) and the test cases (below) before editing feature code.
4. **Implement.** Build only that bet. Follow `.cursorrules`.
5. **Test.** Run the functional tests. Walk every browser case on desktop, iPad, and iPhone. Fix failures.
6. **Critique.** Fresh pass. Write **Keep / Change / Next** on the card.
7. **Repeat once if needed.** A “change” sends the slice back through design → implement → test one time. Then sign off or defer with a reason. Do not loop further.

The next slice starts from the critique, not from a new idea.

### Test cases

Each slice card gets two lists **before** implementation.

**Functional cases** become Vitest tests next to the pure rule (inputs, expected outputs, the edge the user cares about). Run them and record pass/fail on the card. A slice with no pure decision still gets a test for the invariant it claims (token names exist, optional links stay optional, a trim offset does not move a contact, a scope filter includes and excludes the right matches).

**Browser cases** are steps a person can follow. For each case record device, steps, and what you should see. Run the same cases at three sizes:

| Device | Viewport |
|--|--|
| Desktop | 1440 × 900 |
| iPad | 820 × 1180 |
| iPhone | 390 × 844 |

Use the browser tools and set the viewport. Click and type through the flow. A screenshot alone is not a pass. If a viewport breaks the path (cannot reach tagging, cannot read the shot list, cannot play a clip), fix the layout before sign-off. If the browser tools are unavailable, write that on the card and do not claim the device passed.

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

**UX bet.** _(before code)_

**Test cases.** _(before code)_

**Functional check.** A pure rule or a single store action resolves “account → focal player → matches in scope.” A test covers coach-switch versus player-default, including “opponent shots are not rewritten.”

**Touch.** Account gate, player link on the account, match list scope, review hero derivation (`player1_id` is today’s hero — keep that meaning or migrate it in the schema with a note).

**Out of scope.** Teams, clubs as permissions, federation login, billing.

**Result / Critique.**

### C — One flow that matches how the data actually links

**Job.** The card wall and the extra page are a step back. Design navigation from the job and from the data, not from a dashboard template. Matches may or may not sit in a tournament. Tournaments may or may not sit in a federation. Opponents may be one-offs or recurring players. An account and a player are different things. Playing styles and attributes may matter later.

Consider those links. Build only the links that make the current flow honest. Record the rest as later, in this file, so the schema does not grow speculative tables.

The older menu outside tagging and last night’s review may be removed or replaced. Tagging and the review payoff (Work on, clips, player-voice summary) stay reachable and usable on desktop, iPad, and iPhone.

**Done when.**

- There is one way in: library → a scope (a match, and later the scopes in Slice E) → the same review (summary, what to work on, clips of the rallies). Work on + evidence clips stay the payoff.
- A match can exist with no tournament. A tournament can exist with no federation. An opponent can be a real player or still unknown, per the focal-player note.
- Creating and finding things follows that shape. The user is not sent through a ceremony of empty entities before they can tag.
- Browser walk on all three viewports: open a match, tag, review, reach a clip, come back, without a wall of comparison cards or a detached admin page. The library has a Training entry that is visibly not a match. Slice F fills that entry.

**UX bet.** _(before editing routes)_

**Test cases.** _(before code)_

**Functional check.** Optional foreign keys stay optional. A test or a documented fixture shows a match with no tournament and an opponent that is only a label still opening review.

**Touch.** Routes, app shell, match list, review entry. Remove pages the new flow replaces.

**Out of scope.** Building federation, style, and attribute products. Cross-match aggregation (Slice E). Video trim (Slice D). Replacing the Pass 1 tagger. The contents of Training (Slice F). Slice C only gives Training its own entry so it is not filed as a match.

**Result / Critique.**

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

**Result / Critique.**

### E — The same review, across more than one match

**Job.** Single-match review stays. In addition, the same slices (what to work on, the categories, the clips) work across a tournament’s tagged matches, across matches against one opponent, and across the focal player’s library. Four tagged matches in one tournament are one review of that tournament, not four disconnected matches and not a new visual language.

**Done when.**

- The UI is the Slice C review with a scope control: this match / this tournament / this opponent / all of mine. Same first person, same clip payoff. Usable on desktop, iPad, and iPhone.
- Numbers and playlists come from `rules/` over the matches in scope. A test builds a tiny set of matches and checks that a tournament scope includes those matches and excludes another tournament, and that an opponent scope includes only matches against that player.
- A match with no tournament still appears in “all of mine” and in an opponent scope, and does not appear in a tournament scope.

**UX bet.**

**Test cases.**

**Functional check.** The scope test above.

**Touch.** Review derive, analytics rules, scope entry from Slice C navigation. Reuse clip filters; do not fork a second clips UI.

**Out of scope.** New card dashboards. Style/attribute analysis. Federations as a product.

**Result / Critique.**

### F — Training posts, compared over time

**Job.** A Training section, separate from matches. The focal player (or their coach, acting as them) keeps short videos that show progress: about ten reps of one shot type, posted so a later month can be compared with an earlier month, and named combinations (serve, then open, then drive, and others they add). A coach reviews the same shot or the same combination across time. This is not a match, has no score, and does not need an opponent or a tournament.

**Done when.**

- Training lives in its own part of the library. A training post never appears in match review, a tournament scope, an opponent scope, or match clips.
- A shot-type post is one shot type plus an ordered set of about ten clips, dated, for the focal player. Comparison shows two or more months of that same shot type and plays the clips. October’s ten do not appear inside November’s post.
- A combination post is a named sequence (the first one to prove the idea is serve → open → drive) and can be compared with an earlier post of that same combination. A combination does not show up as a shot-type post, and a shot-type post does not show up as that combination.
- Adding another shot type or another named combination does not require a schema change. Do not seed the product with every shot in table tennis. Prove it with one shot type and one combination, and leave the door open.
- Video uses the Slice D asset and source-time timestamps. Do not create a second video store.
- Browser, three viewports: post a shot-type set, post the same shot type in a later month, compare them; post a serve–open–drive combination and see it only under that combination. A coach acting as the player sees that player’s posts, not someone else’s.

**UX bet.** _(before code. Comparison is the point, not a chart wall.)_

**Test cases.** _(before code)_

**Functional check.** Pure tests: a November post is excluded from October’s comparison of that shot type; a combination post is excluded from shot-type comparison and the reverse; a training post is excluded from every match scope in Slice E.

**Touch.** A training feature under the existing folder rules (`features/training/…`, `rules/` for grouping by month, shot type, and combination). Schema notes in `DataSchema.md`. The Training entry Slice C left in the library.

**Out of scope.** Match stats from training clips. Automatic shot detection. Reminders, a social feed, or a required monthly schedule. Every shot type and every combination on day one.

**Result / Critique.**

---

## Where this session started

- Prior branch: `overnight/player-dashboard` at `cb4604390f8f3df4faed4932a90f29c8bd92e173`
- Working branch: `team/review-ready-2026-11-12` (created from that HEAD with accepted dirty review work)
- Baseline commit: `540fb5b4ea939b6fa17230536a9b9b9f4cb1c1d2` (`baseline: accepted review session 2026-11-12`)
- Tag `pre-team-brief-2026-11-12`: exists on that baseline commit
- Excluded from baseline: `.env`, `tmp_patch_phase1.py`, `tmp_patch_phase2.py`

## Change list

_(Coordinator, last. One row per signed commit. Deferred slices listed under the table with the reason and no hash.)_

## Ready to look at

_(Clicks, URL, what was removed from the old shell, what was deferred and why.)_

---

## Prompt to paste

```text
You are the coordinator for Edge TT Match Analyser. Read and follow docs-match-analyser-edge-tt/chat_notes/team_brief_review_ready_2026-11-12.md. That file is the job. .cursorrules and DataSchema.md are the coding and data constraints.

Work on this PC, in this checkout, against http://localhost:5173/. One builder at a time. Do not multitask slices in parallel. Do not push and do not merge.

Before any feature edit: record HEAD in the brief, branch team/review-ready-2026-11-12, commit the already-accepted dirty review work as baseline: accepted review session 2026-11-12 (no .env, no tmp_patch scripts), then tag that commit pre-team-brief-2026-11-12.

For each slice A → F run the loop in the brief: think, plan, design (UX bet + test cases written first), implement, test (Vitest plus the same browser cases on desktop 1440×900, iPad 820×1180, and iPhone 390×844), critique with a fresh agent, repeat at most once. Then one commit for that signed slice only.

You may choose the flow and the visual flavor inside a slice. You may remove or replace old shell pages and menus that are not the Pass 1 tagging screen and not last night’s review payoff (Work on, clips, player-voice summary). Keep the file structure and naming in .cursorrules. Stay on the current stack unless a slice cannot meet its done-when; record that before adding a dependency.

Training (slice F) is not a match. Shot-type posts are about ten clips compared across months. Combinations (prove with serve → open → drive) compare across time too. Do not file them under matches, tournaments, or opponents.

When A–F are each signed or deferred, fill the change list (hash, what the user will notice, how to revert that commit only, and how to return to the tag) and “Ready to look at”, then stop.
```
