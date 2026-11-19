# Landscape and portrait parity, v0.16.1

Build `7f3b893`, Best + FA, corner pad. Code plus a browser check at 390x844, 844x390 and 734x310. TSS is `proto/src/features/tagging/TagSetScreen.tsx`, BP is `BestPanel.tsx`, CSS is `proto/src/index.css`.

## Earlier gaps

1. **Question line: fixed.** The name is gone in both. The server pill, Not a shot, Star and Edit show in both rally rows (BP:169-226). Delete last is gone in both; Edit plus a minus does the job.
2. **Fix rows and notes: fixed by removal.** The mismatch line stays (BP:509); not tested in landscape.
3. **Rally list leaves the wings live: still present.** The list is only 110 to 142px tall (TSS:4013).
4. **Foot line: changed.** It shows at 844x390 but is still off screen at 734x310 (TSS:3741-3771).
5. **Settings menu cut: worse.** Lead, End, Minimum and now the version are clipped in landscape (BestTimingControl.tsx:85, CSS:569-571).
6. **Layout jump at 700 wide and up: still present.** Code unchanged (TSS:2941-2943); not re-tested.
7. **Wings show only the title: still present.** "Play" against portrait's "Play / Rally 1, live" (TSS:3594, TSS:3015).
8. **Captions toggle does nothing: still present** (CSS:572-575).
9. **Swap video and flow picker hidden: still present** (CSS:565-567).
10. **Not a shot size: fixed.** 32px in both (BP:202).
11. **No double-tap guard on rotate: still present.** Not re-tested.

## New

- **Top nav at 844x390.** The app header shows from 768 wide (`proto/src/layout/AppShell.tsx:58`). It takes 48px, so the wings start at y 54, not full height. Hidden at 734.
- **Server switch on a one-contact End is gone in both.** It only switches on Serve (BP:169). This changes the behaviour, but it isn't a parity gap.
