# Match Story — audit drill-down + number format

**Date:** 2026-11-11  
**Mode:** brainstorm /chat (no code)

---

## 1. Click a number → see the points (auditing)

### What you want
On A1/A2 (and later cards), tapping a cell like **Errors · Hero 10 (67%)** should show *which rallies* that number is made of. Essential for trusting the story and catching tagging mistakes.

### Better than “click the number opens a raw list”

A naked popup of rally IDs is weak. Prefer a **shared Evidence panel** that every card feeds:

| Approach | Pros | Cons |
|----------|------|------|
| **A. Evidence drawer (recommended)** | One place for all metrics; can scrub video / jump to rally; same UX for A1–F later | Slightly more chrome |
| **B. Expand row inline** | Fast, stays in context | Crowds the card; hard for long lists |
| **C. Navigate to a filtered Rally list page** | Full space | Leaves the story; heavy for a glance check |
| **D. Hover tooltip only** | Light | Useless on touch; can’t audit seriously |

**Recommended: A — Evidence drawer / sheet**

1. Every comparable cell is a button (hero side and villain side separately).
2. Click → right-hand (or bottom on mobile) **Evidence** sheet titled with the metric, e.g. “Paul · Errors (10)”.
3. Sheet lists **one row per rally** in that set of points:
   - Score before → after (e.g. 3–4 → 3–5)
   - Server · ending (In-Net / Winner / …)
   - Shot count · FOS if any
   - Optional: short “why counted” chip (`last hitter miss`, `winner`, `won on serve`, …)
4. Tap a rally → seek video to that rally’s serve (or open tagging resume later).
5. Drawer stays open if you click another cell → list swaps (feels like pivoting the audit, not bouncing modals).

**Data shape (for later build):** analytics rules should return not only `CountShare` but also `rallyIds: string[]` (or a small `EvidenceRally[]`) per side per metric. Cards stay dumb; the drawer renders evidence.

**Nice extras (not MVP):**
- Group by set
- Filter “only my serve / only receive”
- Highlight the same rally if it appears in two metrics (error vs opponent’s “from error”)

Click-the-number is still the right *affordance*; the drawer is the better *destination*.

---

## 2. Set scores showing “point scores”

On a single tagged set that finished **11–4**, **Set scores** and **Points won** both show `4` vs `11`. That’s not a wrong set total — for one set, set score *is* the point score — but the Hero|label|Villain layout makes it look like another points row.

**Clearer presentation:**
- **Sets won** (when multi-set / match result exists): `0` | Sets won | `1`
- **Set scores** as a **scoreline**, not two independent tallies:
  - One middle-focused line: `Set 1 · 4–11` (hero–villain order), or stacked `4–11` under the label
  - Or keep columns but format each side as that player’s games won in the set… no — for TT the natural read is **heroScore–villainScore** once.
- **Points won** stays the rate row: share of all points (see §3)

If only one set exists, consider hiding “Set scores” as a separate row and folding into the story line (“Lost the set 4–11”) so A1 doesn’t repeat 4/11 twice.

---

## 3. Percentage first, count in brackets

Align with the gap table spirit: rates explain the story; counts are evidence.

**Format convention**

| Metric | Display | Notes |
|--------|---------|--------|
| Points won | `27% (4)` | % of all points; n in brackets |
| Points won on serve | `14% (1/7)` | % of own serves; keep denominator — it’s the honest rate |
| Errors | `67% (10)` | % of all points |
| Winners | `7% (1)` | % of all points |
| Points from opponent error | `75% (3)` | % of *own points won* (different denominator — label must stay clear) |
| Set scoreline | `4–11` | No % |
| Sets won | `0` / `1` | No % |

Swap today’s `4 (27%)` → **`27% (4)`**.

Serve hold stays special: **`14% (1/7)`** not `14% (1)` — dropping the served count hides sample size.

---

## 4. Good numbers green, bad ones red

**Principle:** colour encodes *helpfulness to that side’s goal*, not “higher is always green”.

| Metric | Hero green when… | Hero red when… |
|--------|------------------|----------------|
| Points won % | Higher than villain (or ≥50% if you prefer absolute) | Lower |
| Points won on serve | Higher hold than villain | Lower |
| Errors % | **Lower** than villain | Higher |
| Winners % | Higher | Lower |
| Points from opponent error | Ambiguous — high can mean “won ugly” | Prefer **neutral** or mild amber; don’t paint “living on their errors” as pure green |

**Practical rules for MVP**
- Compare hero vs villain on the same row.
- Better side → green; worse → red; tie → default (no colour).
- Invert for **Errors** (and any future “bad” rates: miss rates, etc.).
- Don’t colour set scorelines or raw set wins unless you also colour the match winner — optional.
- Keep colour on the **%**, not the whole row label; AA contrast on dark cards (muted green/red, not neon).

**Avoid:** colouring both sides green/red on every row so the card looks like a Christmas tree — only the losing side red + winning side green is enough, or only tint when the gap is meaningful (e.g. ≥10pp).

---

## Suggested build order (when leaving /chat)

1. Number format (% primary) + set scoreline presentation  
2. Good/bad colour by metric polarity  
3. Evidence ids from `calculateMatchStory` (+ tests)  
4. Clickable cells → Evidence drawer with rally list  

---

## Open questions

1. Evidence drawer: jump to **video** only, or also deep-link into **Pass 1 form** for that rally later?  
2. Colour: always vs opponent, or also vs a fixed bar (e.g. hold &lt;40% always red)?  
3. “Points from opponent error” — leave uncoloured, or treat high as amber (“gifted”)?  
