# Fresh tagging design

A from-scratch look and flow for tagging on a phone (393x660, no scroll). Logic only from the [Best + FA plan](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/9027bc66-7334-4f4f-8288-502d23cb74e6) and `best-fa-main-plan.md`, plus tonight's changes. Nothing taken from `app/`, `proto/` or earlier design canvases.

- Design canvas: [Fresh tagging design](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/2b779b80-7719-478c-ad55-cb68b3f2e1ed) (concept, theme, components, every screen state, logic, decisions)
- Prototype: `proto-fresh/` on branch `cursor/fresh-tagging-design-b647`
- Screenshots: `media/fresh-design/01` to `05`

## Concept: Courtside night
Watch, tap, answer with one thumb. Dark and quiet so the video leads, and every colour means one thing:
- **Mint is You, lilac is Kim.** Cells, names, score, tap dots.
- **Orange is the ball** and the one thing to do now (Delete last, the add pad, the serving dot).
- **Chalk yellow is a mark:** review parts and the star.
- **Rose is something wrong:** the "does not add up" line, error ends, the Check minus.
- **Answers sit low.** Questions anchor to the bottom, so the stroke grid never moves. A big title on top says what is asked and how many are left.
- **The strip is the guide.** No step row, no Review page, no Save tap. The last answer saves.

## The loop
1. **Live:** the video at 221 px and a full width tap pad. One tap per contact. The pad shows the count and hitter dots. An orange bar fills over 2 s of quiet, then End opens.
2. **Questions:** the video shrinks to 158 px and loops the shot being asked. The order is End (with Point to and the last stroke), Serve, 2, 3, 4 (on 7+ shots), then the End shots.
3. **Does not add up:** one rose line ("Point to You, but shot 6, the winner, is Kim's."). Then Delete last (orange), Delete first, Check, and More (Add missed, Switch server, Keep as is). Serve offers "Shot 1 the toss?" after Delete last.
4. **Saved:** the rally card stays above the pad until the next contact. Each part has a plain button: one tap marks it for review, one tap clears it. ★ sits in the header. Tapping a cell reopens its question.
5. **Overview:** Set 1, Set 2 or Match. Rallies shows the rally tiles and the overview of the chosen rally: parts, answers, Play rally, Edit tags. Insights has four sections, Attack, Serve, Points and Review, and each fits one screen.

## Decisions made overnight
- **Shot 4 is asked on 7+ shots, after Third.** "Who attacked first?" then covers shots 5 to n-3. It shows only on 8+ shots, when shots 2, 3 and 4 have no attack, on the first End shot page.
- **Parts when the first attack is not known:** Opening 1 to 4. The Rally part is then exactly the shots not asked.
- **Dark theme by default.** The palette is in the canvas Theme tab. Numbers use system mono and words system sans. No web fonts.
- **Video height:** 221 px while live, 158 px during questions. That makes room for the tallest state, a point that does not add up with More open.
- **Set overview as tiles,** six across, so a whole set fits on one screen.
- **Edit from the overview** reopens the rally. The next answer saves it and returns to the overview.
- **Stand-in video:** a drawn table with the ball moving along the true contact times. For scenarios, the taps are made already, mistakes included. The Demo button lists 11 scenarios plus a live rally to tap along with.

## Run it
```
cd proto-fresh
npm install
npm run dev        # http://localhost:5190, best at 393x660 (phone frame on desktop)
npm run build      # tsc -b and vite build
npm run check:logic
```
No new heavy dependencies: React 18, Vite, Tailwind 3 and TypeScript only. `app/` and `proto/` are untouched.

## Checked
- Typecheck, build and logic checks pass. The logic checks cover order for 1 to 13 shots, 10 and 7 shot walks, Delete last, the toss offer, Add missed, Nobody, rally one and an ace.
- Walked headless at 393x660 with touch, through 28 states: live, End, every fix, Check, Add missed, Serve and the toss offer, shot 4, the Rally question, save, marks, the overview and all insight sections. Nothing scrolls or clips, there are no page errors, and the copy has no "clip", "Middle", arrows or long dashes.
