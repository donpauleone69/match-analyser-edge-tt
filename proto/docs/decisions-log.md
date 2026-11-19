# Decisions log — Match Analyser

Updated: 2026-11-13 (Europe/London).

**How to use:** Product direction lives in [product-goals.md](./product-goals.md) (user wants). This file tracks confirms and process. Nudge Paul in chat with multi-choice when something needs sign-off.

---

## Confirmed direction (Paul, 2026-11-13)

Replaces old thin P1 “core loop only” framing.

- Full user-want list in **product-goals.md** (tag, context, curated stats+playlists+download, intuitive flows, navigate by tournament/opponent/date, cross-match patterns, tournament video reality, resume, incomplete excluded from stats, no duplicate tag, edit old tags, future scout/benchmarks).
- Keywords: usability, speed, accuracy, intuitiveness · phone / iPad / Windows.
- Insights → playlists is **general** product direction.
- Inference engine retired; standalone dashboards without playlists out.

## Sprint focus (Paul, 2026-11-13)

- **Now:** IA/flow pass **+** Home outstanding/resume **+** Match find/nav (together).
- **Then:** Deepen Work on → Clips (no new pattern cards).
- **Then:** Edit/re-tag polish → Video trim/archive.
- Pattern examples (9–9) illustrative only. Full user wants stay in product-goals; recheck every ship.

---

## Simple tagging §9 (Paul, 2026-11-13)

1B remember last · 2B row→matrix (UX may explore) · 3 offensive row, first=FOS · 4A full endings · 5B miss-reason required · 6A rally ★ · 7A binary→technical · 8A loop pause on review · 9A reopen save mode · 10A clips after MVP.  
Plan: [simple-tagging-plan.md](./simple-tagging-plan.md).

## Tagging logic (Paul, 2026-11-17)

- Contact delete that recomputes the data (shot count, hitters, serve order, winner, score) applies to every prototype and tagging model.
- Point first (end first) is still preferred over serve first, but serve first is closing the gap.
- Best + FA is the main flow and runs last shot first (2026-11-17). Proto keeps only Shot by shot, Spine and Best + FA; all other flows are deleted. Rally Row and button design come from Shot by shot; each flow keeps its own functionality. Later, only Best + FA stays.
- Rally parts are Opening, Attack, Rally, End; the word is Rally, never Middle (2026-11-17). "Who attacked first?" is a step in the step row, asked once the rally passes the Opening with no attack, and skipped when an attack is already known.

## Process

- Board: one card per shippable slice; detail in docs + PRs  
- Product confirms: chat multi-choice nudge  
- Merge when `npm run build` passes (autonomy until you change it)  
- Code: `.cursorrules`  

## Shipped (code)

PR #3 foundation · #4 overnight UX · #5 dead UI · #6 day UX · #7 Pass1 More + Clips reel export  
MA-54 Simple tagging Phase 1 MVP (branch `cursor/simple-tagging-mvp-083d`) — alternative to Pass 1; §9 locked.  
MA-59 / #44 Simple matrix consistency (square tag-control cells; RALLY None+cycle+★; HUD h-7 baseline). 
