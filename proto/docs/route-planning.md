# Route planning workshop — Match Analyser

**Phase:** Route planning → wireframe proto (product app frozen)  
**Updated:** 2026-11-14  
**Audience:** Paul  
**Companion docs:** [user-flows.md](./user-flows.md) · [ideal-functionality.md](./ideal-functionality.md) · [gap-analysis-template.md](./gap-analysis-template.md) · [product-goals.md](./product-goals.md)

---

## 1. Purpose / rules

Define the **ideal target** first, validate navigation with a **new wireframe prototype**, then theme, then map good existing code.

| Rule | Meaning |
|------|---------|
| Ideal first | Target is the product we want — **not** yesterday tip, **not** current tip |
| Flows before build | Ordered user journeys signed before proto code |
| Proto ≠ product | Nav/layout wireframe only — no tagging logic, no stores fluff |
| Both-way gap later | After proto+theme: excess in codebase vs missing vs ideal |
| Tips = evidence only | Poke ports / tips feed gap keep/cut — never redefine ideal |

**Paul’s sequence (locked):**  
1 Ideal IA + flows → 2 NEW nav/layout wireframe proto → 3 Theme on agreed UX → 4 Map good code onto it (keep/cut).

---

## 2. Ideal product

### Purpose

Tag table tennis match video fast and accurately; turn tags into **playable playlists** (work-on + highlights) so Paul → coach → club can see what works and what doesn’t.

### Users (rollout)

1. **Paul** — primary tagger and reviewer  
2. **Coach** — consumes playlists / downloads; light navigation  
3. **Club** — same loop soon; **do not invent club features** beyond [product-goals.md](./product-goals.md)

### Keywords

usability · speed · accuracy · intuitiveness · **phone-first** (iPad / Windows usable)

### Non-goals (now)

- Opponent scouting / pro benchmarks  
- Inference / dead-end dashboards without playlists  
- Simple tagging as **primary** (Pass 1 preferred)  
- Club session management (other Edge TT app)  
- Full cloud SoT · theme rewrite before Gate 4

---

## 3. Ideal information architecture

**Mental model = two jobs** (Paul approved). Find/Create/Resume = entries under Tag. Account/settings out of flow scope. Find/Create may fold into Home in proto.

**What / where (purpose · actions · NOT on screen):** → **[user-flows.md — Screens](./user-flows.md#screens--what-lives-where)**

| Screen | Route | Serves |
|--------|-------|--------|
| Home | `/` | Resume Job 1 · enter Job 2 |
| Find | `/matches` | Entry (foldable into Home) |
| Create | `/matches/create` | Job 1 New entry · video first |
| Pass 1 | `/matches/:id/tag` | Job 1 New / resume |
| Edit rally | `/matches/:id/edit-rally` | Job 1 Edit |
| Match Review | `/matches/:id` | Job 2 match · door to fix/tag |
| Clips | `/clips` (+ in-match) | Job 2 playlists · download · global |
| Context | panel on match | Job 1c — not top-level nav |

**Out of ideal nav:** Training, dead redirects, dual primary tagging, Settings-as-a-flow. Video lifecycle Later.

---

## 4. Workshop sequence (sign-off gates)

| # | Gate | What | Doc | Paul |
|---|------|------|-----|------|
| 1 | **Functionality** | Must / Should / Later | [ideal-functionality.md](./ideal-functionality.md) | ☐ |
| 2 | **Flows + IA** | Ordered journeys + screen map | [user-flows.md](./user-flows.md) + §3 here | ☐ |
| 3 | **Wireframe proto** | Nav + layout only (`proto/`) | §5 below | ☐ |
| 4 | **Theme** | Map theme onto agreed UX | after proto sign-off | ☐ |
| 5 | **Map good code** | Keep/cut/build from tip → proto | [gap-analysis-template.md](./gap-analysis-template.md) | ☐ |

**Now:** Gate 1 (functionality) then Gate 2 (flows). **Do not code proto** until Gate 2 signed.

---

## 5. Prototype approach — recommend `proto/`

**Recommend:** sibling folder `proto/` at repo root (or `app-proto/`) — **separate Vite + React app**, not routes inside `app/`.

| Option | Risk to main product | Verdict |
|--------|----------------------|---------|
| **`proto/` separate Vite app** | Lowest — own `package.json`, own port | **Choose** |
| `/proto/*` routes inside `app/` | Medium — shares build, easy to leak stores/UI | Avoid |
| Replace `app/` screens in place | Highest | Forbidden for this phase |

### Shape (for Paul to approve — not built yet)

```
proto/
  package.json          # vite + react + react-router + tailwind (minimal)
  index.html
  src/
    main.tsx
    App.tsx             # Router only
    layout/
      ProtoShell.tsx    # One shell: top bar + nav (sidebar desktop / bottom phone)
    pages/              # Stubs grouped by two jobs — placeholders only
      Home.tsx          # Continue → Tag · jump → View
      Find.tsx          # Entry
      Create.tsx        # Tag New entry (+ context)
      Tag.tsx           # Pass 1 chrome outline; NO tagging logic
      EditRally.tsx     # Tag Edit
      Review.tsx        # View match-scoped
      Clips.tsx         # View playlists + fake Download
```

**In scope:** routes, shell nav framed as Tag vs View, placeholder blocks, fake Continue / Open playlist links.  
**Out of scope:** Zustand, Dexie, video, Pass 1 rules, real stats, Settings flow, imports from `app/src/features`.

**Run on Surface:** `cd proto && npm i && npm run dev` → e.g. `http://localhost:5174` (port ≠ main app).

**After Gate 3 sign-off:** Gate 4 theme tokens on proto shell → Gate 5 transplant keepers from `app/` into the agreed structure (or rebuild product onto proto IA).

---

## 6. Tips as evidence only (Gate 5)

| Artifact | Use |
|----------|-----|
| Yesterday tip / poke ports | Excess vs missing rows |
| [overnight-deframe-assessment.md](./overnight-deframe-assessment.md) | Nested borders / keep-candidates |
| [tagging-rules-and-phase-options.md](./tagging-rules-and-phase-options.md) | Pass 1 domain SoT (not for proto) |

---

## 7. Pointers

| Doc | Role |
|-----|------|
| [user-flows.md](./user-flows.md) | **Ordered flows + Mermaid (Gate 2)** |
| [ideal-functionality.md](./ideal-functionality.md) | Capabilities (Gate 1) |
| [gap-analysis-template.md](./gap-analysis-template.md) | Keep/cut after proto+theme (Gate 5) |
| [project-context.md](./project-context.md) | Phase flag for agents |
