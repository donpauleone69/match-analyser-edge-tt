# Edge TT Match Analyser — Project context

Last updated: 2026-11-14

## What this is

Table tennis match video tagging and analysis. Local-first Vite + React + TypeScript + Zustand/Dexie app. Separate from the Edge TT club session app.

## Current phase — route planning → wireframe

**Product `app/` code frozen.** Sequence (Paul locked):

1. Ideal IA + flows (docs)  
2. NEW `proto/` nav/layout wireframe (after Gate 2)  
3. Theme on agreed UX  
4. Map good existing code (keep/cut)

| Doc | Role |
|-----|------|
| **[route-planning.md](./route-planning.md)** | Workshop master + `proto/` proposal |
| **[user-flows.md](./user-flows.md)** | **Two jobs** + Mermaid (Gate 2) |
| [ideal-functionality.md](./ideal-functionality.md) | Gate 1 — Must/Should/Later under those two jobs |
| [gap-analysis-template.md](./gap-analysis-template.md) | Gate 5 — keep/cut after proto+theme |

Tips / poke ports = evidence only.

**Pause (Paul 2026-11-14):** No further ideal-doc expansion — Paul overwhelmed. Next product step after **current-pages map** = **wireframe `proto/`**. Agents stand by; do not grow route-planning / user-flows / functionality docs unless Paul asks.

## Product truth

**Goals SoT:** [product-goals.md](./product-goals.md)  
**Tagging rules SoT:** [tagging-rules-and-phase-options.md](./tagging-rules-and-phase-options.md)  
**Decisions:** [decisions-log.md](./decisions-log.md)

Keywords: usability, speed, accuracy, intuitiveness · phone-first · Pass 1 preferred · Insights → playlists.

## Conventions

Follow `.cursorrules` for product `app/`. Proto is intentionally separate and minimal.

## Git

`main` is canonical. Build: `cd app && npm install --legacy-peer-deps && npm run build`. Product app frozen this phase.
