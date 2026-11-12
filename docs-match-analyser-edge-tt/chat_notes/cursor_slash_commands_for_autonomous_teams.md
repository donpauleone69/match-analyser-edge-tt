# Cursor slash commands — autonomous “team” workflows?

**Date:** 2026-11-12  
**Context:** Brainstorm (`/chat`). Question: are there `/` commands meant to stand up a UI/team of agents that can develop and optimise with little ongoing help?

## Short answer

**No single “spin up a team and leave it” slash command.** Closest built-ins are unattended **Automations** and **Autopilot**, plus long-running **goal/loop**, with multi-agent parallelism still needing a coordinator (you or a parent agent).

## Closest `/` tools (by intent)

| Intent | Command / surface | How hands-off? |
|--|--|--|
| Recurring / event-driven cloud work | `/automate` → Automations | Most unattended after setup (schedule, GitHub/Slack/Linear, etc.). You still design the prompt and review outcomes. |
| Babysit an open PR | `/autopilot` | Hands-off for that PR’s CI/comments/conflicts; you still merge. |
| Long objective in one session | `/goal` (+ often `/loop`) | Runs until done or you stop; not a standing org. |
| Parallel specialists in chat | `/multitask`, `/create-subagent`, Agents Window, Projects | Team-like, but a human or parent agent still coordinates. |
| Try many approaches | `/best-of-n`, `/worktree` | Compares; does not auto-ship a winner. |
| Encode your playbook | `/create-skill`, `/create-rule`, `/create-hook`, custom `/` commands | Makes *your* team process reusable; not a product “team UI”. |

## What does *not* exist

No documented `/team`, `/swarm`, `/fleet`, or `/spin-up-agents` that provisions a standing multi-agent development organisation.

## Fit for Edge TT Match Analyser team brief

- **Local multi mode + coordinator prompt + brief** ≈ closest to a “team” for this checkout (`localhost:5173`, dirty tree, no push/merge).
- **`/automate` / cloud** better for later recurring jobs (e.g. “after push, run Vitest + Bugbot”) than for the current review-ready slices against local Vite/Dexie/OPFS.
- **`/autopilot`** useful once slices become PRs you want watched.
- Encoding the brief as a **skill** (`/create-skill`) would make “resume coordinator” one `/` away without inventing a product team feature.

## Takeaway

Cursor can *configure* unattended workers and *parallelise* agents; it does not ship a one-shot autonomous team UI. The low-touch path is Automations + Cloud + Autopilot; the “dev team” path is Agents Window / subagents / multitask with a coordinator still in charge.
