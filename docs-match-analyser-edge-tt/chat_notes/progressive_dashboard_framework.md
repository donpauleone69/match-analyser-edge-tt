# Progressive dashboards as framework

Date: 2026-11-11  
Mode: `/chat` brainstorm — no implementation.

Related: [`progressive_dashboards_gap_table.md`](progressive_dashboards_gap_table.md), [`dashboard_field_matrix.md`](dashboard_field_matrix.md).

---

## Decision (direction)

Progressive dashboards are **framework**, not a nice-to-have UI pattern.

They are how the product answers:

- What is mandatory to tag?
- What is optional / next?
- What does this match still need?

…without a separate settings doc or a heavy “tag everything” pass.

---

## Framework idea

One **Match Review** surface is both:

1. **Analytics** — cards that already have enough data.
2. **Work queue** — empty/locked cards that declare missing fields and offer **Tag** / **Study**.

```
data completeness  →  which cards render filled vs locked
locked card        →  defines the next tagging pass
tagging pass       →  only collects fields that card needs
```

So **dashboards own the field contract**. Tagging UI is a servant of unlocked cards, not the other way around.

---

## Why this is powerful here

| Without framework | With progressive framework |
|-------------------|----------------------------|
| Argue forever what’s “mandatory” in abstract | Mandatory = fields that light up Pass-1 cards |
| One fat tagging screen | Thin passes scoped by empty cards |
| Studies feel bolted on | Studies are just locked cards with a Tag CTA |
| Bottom-up video tagging fights “complete match setup” | Match details + empty cards can coexist; fill as you go |
| Users don’t know what’s missing | Empty card copy *is* the checklist |

Fits bottom-up tagging: video in → tag enough for first cards → see value → opt into deeper cards.

---

## Framework rules (draft)

1. **Every analytics card declares a data contract** (required fields + derivation).
2. **Card states:** `empty` (no match/video yet) · `blocked` (missing fields) · `ready` (enough data) · `partial` (optional holes OK).
3. **Blocked cards show CTA** → opens a pass/study that only asks for that contract.
4. **Pass-1 card set is the agreed Match Review list** — one pass may be denser than “structure only”; studies are only what is *beyond* that list.
5. **No orphan fields** — if a field isn’t on any card’s contract, it’s not pass-1 mandatory (study or cut).
6. **Match details are progressive too** — players/scores/opponent can stay thin; cards that need them say so.

---

## Layers (updated — no 1b/2)

| Layer | Role | Example cards |
|-------|------|----------------|
| **Shell** | Always visible structure | Match header, empty Pass-1 grid |
| **Pass 1** | One tagging pass — all agreed Match Review cards | Overview, serve/receive, initial offence, endings, end wing×stroke, miss reasons, **Safe/Agro**, **initiative after FOS** |
| **Studies** | Optional depth beyond Pass 1 | Rally placement, deep serve matrices, multi-reason, pressure |

Pass membership: see [`progressive_dashboards_gap_table.md`](progressive_dashboards_gap_table.md). Mechanism stays: cards own contracts.

---

## What this is not

- Not a second product (“Dashboard Builder”).
- Not gating video play behind complete profiles.
- Not forcing Pass 2 before you can review Pass 1 numbers.
- Not implementing every locked card on day one — framework first, cards as we lock contracts.

---

## Implications for B / A / C

| Phase | Implication |
|-------|-------------|
| **B (now)** | Lock Pass-1 card list + contracts; treat progressive shell as the *definition* of mandatory. |
| **A** | Still ship quick tagging hygiene; doesn’t wait on the shell. |
| **C** | Contextual menus / studies = implementations of blocked-card CTAs, planned after B. |

---

## Open (still B)

- Pass-1 vs 1b: end wing/stroke on first pass or first locked upgrade?
- Miss reasons: Pass 2 card vs later.
- Copy tone for blocked cards (“Needs X” vs “Unlock with study”).
- Whether Match Review is the *home* after upload or a tab beside the tagger.

---

## One-liner

**Dashboards are the roadmap: empty cards are unfinished work; filled cards are earned insight.**
