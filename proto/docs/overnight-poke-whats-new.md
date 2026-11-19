# Overnight poke — what’s new in each build

Use with [overnight-poke-milestones.md](overnight-poke-milestones.md).  
Each port is everything up to that point. Below = **what landed since the previous port** — and **what to open** to see it.

Shared note: **Clips opens on every port.** **5201–5207** include a local poke-only hooks patch (same as #124) so empty/loading Clips no longer white-screens — UI deltas are still the overnight milestones; only that crash fix was back-ported. **5200** never had the bug; **5208** already included the fix.

---

## 5200 — yesterday (baseline)

**Nothing overnight yet.** This is “how it looked before.”

**Look at:** Home, Find, Match Review (Summary / Work on / Rallies / Clips), Pass 1, Account.  
**Remember:** nested boxes / density / browse chip / Serve-Receive polish are **not** here yet. This is your comparison baseline.

---

## 5201 — after overlay (+ early declutter)

**New / updated vs 5200**

- Shared **score HUD + video overlay** on Clips / Rallies / Rally edit / Review stages  
- Mute / HUD cohesion across those surfaces  
- First big **declutter** wave: Work on, Rallies, Clips chrome, rally rows, evidence/tab bar, scope notices  
- Early **Serve/Receive data pages** start appearing  
- Pass 1 contacts / scrub timeline polish starts  

**Look at:** open a match → **Rallies** / **Clips** stage — scorebug + overlay. **Work on** + **Rallies** lists for quieter/denser chrome. Summary if Serve/Receive tabs show.

**Watch for:** first “everything got boxed / tightened” feeling vs yesterday.

---

## 5202 — after playlist browse shell

**New / updated vs 5201**

- **PlaylistBrowseShell** + shared **BrowseDisclosure** (the playlist chip / picker)  
- Home / nav IA declutter  
- Match Review shell declutter  
- More Serve/Receive polish  
- Theme token cohesion batch  
- Pass 1 tagging-flow polish  

**Look at:** Match Review → **Clips** tab (or Work on → open a playlist) — sticky **Playlists** chip / disclosure. **Home** layout.  

**Watch for:** browse chrome + more borders; whether the chip feels useful or heavy.

---

## 5203 — after density / lists

**New / updated vs 5202**

- **Denser lists + quieter empty states** (Home / Find / empties)  
- Settings / match IA declutter  
- Pass 1 chrome / interaction polish  
- Theme follow-ups on new surfaces  

**Look at:** **Home** “What’s left / Recent”, **Find** match list, empty states.  

**Watch for:** this is a prime “borders around borders / cramped” checkpoint vs 5200–5202.

---

## 5204 — after theme SoT (+ browse refine)

**New / updated vs 5203**

- DesignSystem / **theme tokens as source of truth** (callouts, scrims, borders)  
- Residual raw-paint cleanup → more `border-border` everywhere  
- Playlist browse **refine** + **mobile** polish; Work-on → Clips **trail**  
- Serve/Receive adopts browse shell + stats card polish  
- Pass 1 rail / dialog / History / Done density  
- Notices / banners / secondary Review chrome quieted  
- Video HUD chips → token washes  

**Look at:** Summary **Takeaways** / category cards, Work on → Clips **trail** (Work on / Stay / Fix), Pass 1 History sheet, any warning/success banners.  

**Watch for:** tokenized borders looking harsher on light theme; trail chrome stacking with other frames.

---

## 5205 — after Serve/Receive (+ late Pass 1 / trails)

**New / updated vs 5204**

- Serve/Receive **glance cards** + empty/loading polish + evidence ↔ playlist sync  
- Playlist sticky chrome under Review header; Summary/Evidence trails; Fix round-trip  
- BrowseDisclosure keyboard a11y  
- Pass 1 Viewing/Live, Leave Keep/Discard, **Save/Let/Discard** ready row  

**Look at:** Summary → **Serve** / **Receive** category (glance card first). Work on → Clips trail round-trip. Pass 1 mid-point **Leave** + **Save** row when ready.  

**Watch for:** Serve/Receive usefulness vs visual noise; sticky browse strip under tabs.

---

## 5206 — after Pass 1 contacts pad

**New / updated vs 5205**

- Pass 1 **contacts pad** polish (size, Viewing state, undo, hints)  

**Look at:** open a set → **Pass 1** live tagging — big contact tap pad, Viewing vs Live, undo.  

**Watch for:** pad feel (good/bad) separate from the global border/density issue.

---

## 5207 — overnight tip (as delivered morning)

**New / updated vs 5206**

- Phone playlist **trail density** (one-row icon-first trail) — last overnight browse tweak  
- This is the tip Paul first pulled before morning crash/de-frame hotfixes  

**Look at:** phone-width or narrow window on Clips with a Work-on trail — sticky strip density. Full smoke of “overnight as shipped.”  

**Watch for:** overall “huge step backwards” feeling — this is the peak overnight tip.

---

## 5208 — current tip (crash fix + de-frame)

**New / updated vs 5207**

- **Clips white-screen fixed** in history (hooks crash) — also back-ported locally onto **5201–5207** for poke  
- Nested-border **de-frame**: Home / Find / Review / Clips lists / Pass 1 set picker / Account — fewer stacked Panel/Card/chip frames  

**Look at:** Compare Home / Find / Review / Clips / Account boxes vs **5207** and vs **5200**.  

**Watch for:** still denser than yesterday, but less “frame in frame.” Decide: keep tip / roll back / cherry-pick liked bits ([assessment](overnight-deframe-assessment.md)).

---

## Suggested compare path

1. **5200** vs **5203** — when density/boxing first hurts  
2. **5203** vs **5204** — theme/token border harshness  
3. **5205** — Serve/Receive + trails worth keeping?  
4. **5206** — Pass 1 pad worth keeping?  
5. **5207** vs **5208** — did de-frame help enough?  
6. **5200** vs **5208** — final keep vs rollback call  
