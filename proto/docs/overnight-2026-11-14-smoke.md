# Morning smoke — 15 Nov 2026 (overnight)

**Tip:** `74d8c86` / addendum **v3.179.0** (through MA-144 / #120).  
**Gate:** `npm install --legacy-peer-deps && npm run build`  
**Goal:** 15–20 min poke — cohesion, not exhaustive QA. Phone + desktop if you can.

Use a match with ≥1 tagged set, video on device, a few flagged Work-on shots, and Serve/Receive data.

---

## Poke order (Paul)

### 1. Pass 1 (tagging)
1. Open match → **Tag** a set mid-match.
2. **Contacts:** big tap still lands; timeline marks read (winner/server colour).
3. **History:** open sheet under set bar — Escape / dismiss; ★ + ordinals clear; scroll to focused point.
4. Mid-point **Done** → discard confirm; **Leave** Keep/Discard still soft-exit vs finalize.
5. **Viewing / Live** set-bar recovery if you jump away and back.

### 2. Match Review shell
1. Sticky header + tabs denser; incomplete badge → Rallies Incomplete.
2. **Summary:** Takeaways / Your story / category drill-in quiet; back “All categories”.
3. **Details:** sets row + start-over confirm short; context selects not raw-neutral.
4. Notice strip dismisses; empty “Nothing tagged yet” denser if you wipe a set.

### 3. Work-on → Clips trails
1. **Work on** → pattern chip / Errors → Clips playlist.
2. Sticky browse trail: **Work on** + **Stay** + **Fix** (phone: Fix icon-ok when Work-on chrome present).
3. **Fix tags** / stage Edit → Save → returns to **same Clips playlist** with Work-on trail intact.
4. Empty playlist: no duplicate Work-on button (trail owns return).

### 4. Clips browse shell
1. Match **Clips** tab + global Clips: disclosure opens without scroll-hell.
2. Keyboard: ArrowDown opens; Up/Down/Home/End among options; Escape restores focus (MA-140).
3. Sticky strip sits **under** real Review chrome (`data-match-review-chrome`), not under a guessed offset.
4. Phone: sticky **Download / Save as reel** still present when exporting.
5. Summary / Evidence “Clips” CTA → playlist with return trail parity (MA-131).

### 5. Serve / Receive
1. Summary → Serve (or Receive) category.
2. Stats cards denser; tap % / headline → matching playlist focus + soft-highlight.
3. Empty / loading quiet (MA-133); sticky shell under tabs.
4. Glance card (B0/C0) scans first with short labels; detail under it on large screens (MA-143).
5. Evidence drawer rows match Clip queue language (primary/muted).

Notes: [overnight-2026-11-14-serve-receive.md](overnight-2026-11-14-serve-receive.md).

### 6. Quick surface sweep (optional, 2 min)
- **Home:** What’s left / Recent / Watch denser; empty CTAs.
- **Find:** filters + match cards quieter.
- **Account / Training:** titles + cards on primary/muted; gate/sign-in still clear.

---

## Pass / fail signals

| Pass | Fail (file a thin PR) |
|------|------------------------|
| One product feel: tagging ↔ Review ↔ Clips | Scroll-up hell under browse disclosure |
| Sticky shell under Review header, not overlapping title | Work-on trail lost after Fix tags |
| Phone reel sticky CTA still there | Leave/History/Done wrong confirm |
| Serve/Receive opens evidence → playlist | Raw palette / huge empty chrome back |

---

## Overnight chrome already landed (don’t re-poke polish)

Track B quiet: MA-87→119, **126** Review, **136** Home/Find, **141** Settings/Training.  
Playlist/trails: **106–107, 118, 121, 127, 129, 131, 137, 140**.  
Pass 1: **108, 112, 116, 124, 132, 138**.  
Serve/Receive: **115, 122, 133, 143** (+ shell **106**, deep-link **98**).  
Theme: **109, 114, 117, 120, 123, 128, 139**.

---

## If blocked
- Build green locally first.
- Prefer a **one-file fix PR** over another declutter pass unless chrome is obviously loud again.
