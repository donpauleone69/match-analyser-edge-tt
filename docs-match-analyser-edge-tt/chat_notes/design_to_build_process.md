# Design-to-Build Process Discussion

_Chat notes from brainstorming session_

---

## Context

We have complete documentation:
- **MVP_Spec_and_Architecture.md** — Full feature spec, entities, screens, flows
- **techstack.md** — React, TypeScript, Vite, Supabase, Tailwind, etc.
- **DesignSystem.md** — Complete tokens, components, patterns (~820 lines)
- **18 Figma prompts** — All screens + design system components ready for generation

## Question
What is the best process to visualize the app and then build it?

---

## Recommended Process

### Phase 1: Visual Design (Figma) — 1-2 weeks

**Order of generation:**
1. DS_03 (Tokens Reference) → visual language foundation
2. DS_01 (Core Components) → buttons, inputs, cards, tables
3. DS_02 (App Shell Layout) → navigation, responsive breakpoints
4. DS_04 (Video Tagging Components) → specialized tagging UI
5. Screens: 01 → 04 → 05 → 06 → 02 → 03 → 07 → rest

### Phase 2: Design Validation — 3-5 days

- Prototype key flows in Figma
- Test critical path: Match Setup → Step 1 → Review → Step 2 → Stats
- Validate CONTACT button UX on mobile
- Get stakeholder/user feedback

### Phase 3: Development Setup — 2-3 days

- Initialize Vite + React + TypeScript
- Configure TailwindCSS with design tokens as CSS variables
- Set up Radix UI + Headless UI
- Configure React Router v7
- Set up Supabase client + Dexie.js
- Initialize Video.js + Hls.js wrapper

### Phase 4: Build in Vertical Slices — 3-4 weeks

| Slice | Scope | Priority |
|-------|-------|----------|
| 1 | Match Setup → Step 1 Contact Tagger (basic) | 🔴 Core |
| 2 | Step 1 Review + Error Correction | 🔴 Core |
| 3 | Step 2 Shot Detail (Q1–Q5) | 🔴 Core |
| 4 | Match Stats | 🟡 Important |
| 5 | Dashboard, History, Players | 🟢 Polish |

---

## Options

### Option A: Figma-First (Traditional)
Generate all designs before coding.
- ✅ Full visual preview
- ✅ Stakeholder alignment
- ⏱️ Adds 1-2 weeks before dev

### Option B: Code-First
Build directly from DesignSystem.md.
- ✅ Faster to working prototype
- ⚠️ Visual refinement during dev
- ⏱️ Start immediately

### Option C: Parallel Track (Recommended)
Generate Figma designs while setting up codebase simultaneously.
- ✅ Fastest overall timeline
- ✅ Design informs code as it progresses
- ⏱️ Optimal efficiency

---

## Next Steps to Choose From

1. **Generate Figma designs** — Use MCP tools with existing prompts
2. **Initialize codebase** — React + Vite + Tailwind + design tokens
3. **Create detailed project plan** — Week-by-week milestones
4. **Refine design prompts** — Enhance specific screens

---

_End of chat notes_

