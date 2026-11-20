# Tagging screen UI zones

Names Paul set on 19 Nov 2026 for the areas of the Set Tagger screen. Use these names in briefs, reviews and chat.

| # | Name | What it is |
|---|------|------------|
| 1 | Shot Input | The tap area for the current question (Tap serve, shots, answers) and the Edit Rally pad. In landscape it is split into the left and right wings. |
| 2 | Rally Zone | The rally row at the bottom: rally number and server, shot cells and part labels. A display, not buttons. |
| 3 | Set Zone | One row under the video: set name, this set's rally pills, Edit Set. Gap slots in Edit Set, Gaps mode only. |
| 4 | Video Zone | The video picture with score, Back, the playback row (Settings after Mute), and a seek bar along the bottom of the picture, rally spans shown. |

## Layout

No Top Nav. Back sits top left of the Video Zone. The seek bar is the bottom edge of the picture.

- Portrait, one column, top to bottom: Video Zone, Set Zone, Rally Zone, Shot Input.
- Landscape, three columns: left Shot Input wing, a middle column with Video Zone, Set Zone and Rally Zone, right Shot Input wing. Wings run full height.

![Portrait zones](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/ui-zones/portrait-zones.jpg)

## Where it lives

All under `proto/src/features/tagging/`. The screen is `TagSetScreen.tsx`. Pure rules (no React) sit beside it.

| File | Holds |
|------|-------|
| `TagSetScreen.tsx` | The screen, its zones and the landscape wings |
| `VideoStage.tsx`, `usePlayer.ts`, `timeline.ts` | Video Zone, playback, videos played end to end |
| `CornerPad.tsx`, `BestPanel.tsx`, `AnswerCells.tsx` | Shot Input pad and the questions |
| `bestFlow.ts` | Question order for Best + FA: Serve, each later shot, End, Point to only when needed |
| `rally.ts`, `score.ts` | Rally model, score, server and set end |
| `setMark.ts`, `continuity.ts` | Set marks on the videos, and flags for gaps and serve order breaks |
