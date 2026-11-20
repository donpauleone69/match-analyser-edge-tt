# Key documents

Updated 20 Nov 2026. The working set for decisions. Kept current as each one changes.

Mirrors the [Key documents canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/7c7577ce-ca6a-47ed-a64a-c83282ecdde0) with repo paths for markdown in this folder.

## Start here

| Document | In repo | Notes |
|----------|---------|-------|
| Product brief (draft, awaiting Paul's approval) | [fresh/product-brief.md](./fresh/product-brief.md) · [product-brief-review.md](./product-brief-review.md) | One page: goal, workflow, shared concepts, current focus. For any project working on this codebase. |

## For decisions

| Document | Link | Notes |
|----------|------|-------|
| Build review | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/c1742a6f-8ec8-480b-8982-9f7e53a67b14) | Your usability notes from real tagging, by build, with my view and the next build candidates. |
| Question order, in order or End first | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/6c268a07-7ab3-41f8-8479-011ab23ecb57) | Logic review of asking every shot in order with End last. Built as v0.15.0. |
| Eyes on video, compared | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/2f7ed7b0-64c6-47b2-b0e8-165de08c227a) | Seven models' blind concepts and your notes in 7 families. You picked the corner pad as the baseline. |
| Problem 5, my ideas | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/b21abb84-dc87-492d-b8f5-639f06a994b4) | Your ideas for keeping eyes on the video while answering shot questions on the phone. |
| Best + FA main flow plan | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/9027bc66-7334-4f4f-8288-502d23cb74e6) · [tagging-ideation/best-fa-main-plan.md](./tagging-ideation/best-fa-main-plan.md) | The v0.13.1 order: End first, shot 4, Who attacked first, Nobody, scenarios and test cases. |
| Tagging models compared | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/4b40d60d-bb36-40e8-b609-fccff5e1d70a) · [tagging-ideation/model-comparison-best-fa.md](./tagging-ideation/model-comparison-best-fa.md) | Data value, taps, time per rally and ratings. Best + FA now 8 out of 10 at 9.5 taps, tied with Spine r4. |
| Best + FA insights | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/59552445-e705-4aa7-987c-8f67c98602a0) · [tagging-ideation/best-fa-insights.md](./tagging-ideation/best-fa-insights.md) | What the data can show: match, cards, training and season views on sample data, plus model changes, what could come out, and research. |
| UI zones | Context: [docs/ui-zones.md](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/ui-zones.md) | Zone names and portrait and landscape layout for the tagging screen. |
| Set Tagger sprint plan | Context: [docs/set-tagger-sprint-plan.md](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/set-tagger-sprint-plan.md) | Shipped in v0.17.4. |
| Set marking sprint plan | Context: [docs/set-marking-sprint-plan.md](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/set-marking-sprint-plan.md) | Shipped in v0.17.4. |
| Set marking flow test | Context: [docs/set-marking-flow-test.md](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/set-marking-flow-test.md) | Route and mark flow checks at 390x844 and 734x310 after v0.17.0 to v0.17.4. |
| Edit Set gaps plan | Context: [docs/edit-set-gaps-plan.md](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/edit-set-gaps-plan.md) | Built as v0.17.5 to v0.17.8. |
| Product ideas | [product-ideas.md](./product-ideas.md) | Running list of product ideas. |

## Latest builds

| Build | Link | Notes |
|-------|------|-------|
| v0.17.8 | | A gap of 9 seconds or more, or one named by a serve order break, takes a warning tint on its slot and on the seek bar. |
| v0.17.7 | | Insert from a gap, including a finished set. The first gap starts at the mark. Saving returns to Edit Set on the new rally. Discard returns to the same gap. |
| v0.17.6 | | Edit Set steps rallies and gaps separately. Gap slots show in Gaps mode only. A seek-bar tap picks what is under the finger. Delete has Undo. |
| v0.17.5 | | The seek bar is taller, with rally spans. The picked rally is in brand colour. Edit Set opens on rally 1. |
| v0.17.4 | [PR #150](https://github.com/donpauleone69/match-analyser-edge-tt/pull/150) | A set may end on the next video. Those two videos stay put. On a phone in landscape the mark steps sit in the left wing. A spanning line reads videos N and M. |
| v0.17.3 | [PR #150](https://github.com/donpauleone69/match-analyser-edge-tt/pull/150) | Set line menu: Re-mark, Change number, Delete tags, Unmark, Mark complete. Each change can be undone. Re-mark keeps every rally inside. A video move that breaks the order is refused. Removing a video unmarks its sets. |
| v0.17.2 | [PR #150](https://github.com/donpauleone69/match-analyser-edge-tt/pull/150) | Only a ready, tagging, or saved set opens. Play and seeking stop at the mark. The start card asks who serves. The end of the mark offers Re-mark. Save set offers the next ready set. |
| v0.17.1 | [PR #150](https://github.com/donpauleone69/match-analyser-edge-tt/pull/150) | Mark screen on the set's video: start, end, set number, complete or part filmed. Marks do not overlap and set numbers stay in order. |
| v0.17.0 | [PR #150](https://github.com/donpauleone69/match-analyser-edge-tt/pull/150) | A set has one mark. The Tag page is one block per video, with a strip, a set line, and sets not on video. |
| v0.16.12 | [PR #149](https://github.com/donpauleone69/match-analyser-edge-tt/pull/149) | Set Row edges. A grey start score leads the pills. The open rally is a dashed pill in the next server's colour. Rallies after an early win keep a warning edge. |
| v0.16.11 | [PR #149](https://github.com/donpauleone69/match-analyser-edge-tt/pull/149) | Edit Set stays on the rally pills. The picked pill takes a ring, the row scrolls it to the centre, and the status line reads the rally and the score. |
| v0.16.10 | [PR #149](https://github.com/donpauleone69/match-analyser-edge-tt/pull/149) | Thin seek bar on the bottom of the picture, with a tick for each rally in this set. The playback row sits just above it. |
| v0.16.9 | [PR #149](https://github.com/donpauleone69/match-analyser-edge-tt/pull/149) | A 250 ms guard ignores a second press when You serve, Play, a stroke answer, or Delete set changes. Cancel sits on Delete's spot. |
| v0.16.7 | [PR #147](https://github.com/donpauleone69/match-analyser-edge-tt/pull/147) | Click guards removed (1000, 600, 450 and 300 ms), including Discard waiting them out. A tap right after a question appears counts. The 2 second idle close stays. |
| v0.16.8 | [PR #148](https://github.com/donpauleone69/match-analyser-edge-tt/pull/148) | MVP simple set flow. Start card (video, server, set number, score, default 0 - 0) replaces the server toggle. A saved rally is the save point. Set over: Save set or Edit. Edit Set (was Rallies) shows the picked rally in the Set Row; the corner pad steps Back and Forward and opens Edit rally N. Score and finished state follow every edit. Rally list retired. Delete set and Change set number on the Tag page. |
| v0.16.6 | [PR #146](https://github.com/donpauleone69/match-analyser-edge-tt/pull/146) | Latest merged on proto (37e7e62). Version in video Settings. Dead-code prune. Removes Sequential and Spine flows, buttons layout, ?flow and ?cells switches, old live UI, foot line (Finish set kept), timing log, highlight star and old edit panel. Saved rallies open in Best+FA. proto/src 17,063 to 12,827 lines. |
| v0.16.5 | [PR #145](https://github.com/donpauleone69/match-analyser-edge-tt/pull/145) | Latest merged on proto (4b3e07b). Version in video Settings. Removes late tap, Minimum, layout toggle, video clock and shot badge. Settings in playback row after Mute. Opus review: SHIP. |
| v0.16.4 | [PR #144](https://github.com/donpauleone69/match-analyser-edge-tt/pull/144) | Latest merged on proto (d303eda). Version in video Settings. Top Nav removed with Back on video; Set Zone one row with set name and Rallies; portrait Video, Set, Rally, Shot Input; landscape three columns with full-height wings; Discard for the rally in progress. |
| v0.16.3 | [PR #143](https://github.com/donpauleone69/match-analyser-edge-tt/pull/143) | Latest merged on proto (7e2d6f1). Version in video Settings. "In net" line removed, landscape video fits height, fixed 82px rally row at bottom in both orientations, shot timer on top of rally row, slimmer 16px phase tags and shot row. |
| v0.16.1 | [PR #140](https://github.com/donpauleone69/match-analyser-edge-tt/pull/140) | Latest merged on proto (7f3b893). Version in video Settings. Rally row: server pill, Not a shot, Star, Edit (was Check). Removed narrative line, toss offer, fix row, Delete last. |
| Live app | [edge-tt.apps.grok.bot](https://edge-tt.apps.grok.bot) | Private. v0.16.6 is live (37e7e62). |
| v0.16.0 | [PR #139](https://github.com/donpauleone69/match-analyser-edge-tt/pull/139) | Latest merged on proto (dd8ff43). Serve landing quadrants. Phone landscape tapping with video in the middle. Best + FA only in the dropdown. |
| v0.15.1 | [PR #138](https://github.com/donpauleone69/match-analyser-edge-tt/pull/138) | Home screen mode removed. New timing defaults. |
| Proto branch | [PR #129](https://github.com/donpauleone69/match-analyser-edge-tt/pull/129) | Main prototype PR the builds merge into. |

## Theme and style

| Document | Canvas | Markdown in repo | Notes |
|----------|--------|------------------|-------|
| Style guide v3 | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/7c5f04e3-951d-43aa-8f4c-0bc9c3ee0bf9) | [tagging-ideation/fresh-design.md](./tagging-ideation/fresh-design.md) | iPhone 15 sizing. Layouts A and B. B uses v2 components. A and B in v1 styles. |
| Fresh pass themes | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/aff1e37f-c39f-4123-a302-566a55e5294e) | [tagging-ideation/blind-design.md](./tagging-ideation/blind-design.md) | Clay, Ink, and Mist. |
| Style guide v1 | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/2b779b80-7719-478c-ad55-cb68b3f2e1ed) | [tagging-ideation/fresh-design-v1.md](./tagging-ideation/fresh-design-v1.md) | Earliest Courtside night canvas. |

## Reference

| Document | Canvas | Notes |
|----------|--------|-------|
| Opening and Ending r3 | [Canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/3e5a21c8-7aea-43f9-b06c-2dd50eb26bcc) | Canvas style reference for plans with a demo. |