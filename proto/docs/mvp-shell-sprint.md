# MVP shell sprint — overnight / unattended

**Status:** Ready to leave running.  
**Map SoT:** [`current-pages-map.md`](./current-pages-map.md)  
**Date locked:** 2026-11-14

---

## Decision locked

**Build a new nav/layout wireframe prototype + unified theme** from existing `ui-mine` / shadcn tokens.

**Do NOT** rework the current product app into the thin IA overnight. Current `app/` stays **reference only**.

**Proposed shell (from map):** Gate · Home · Match · Insights · Account.

### Why

Thinner IA is a rewrite of information architecture. Grafting it onto overnight-bloated `main` risks more mess. Proto proves UX; theme pack defines elements once; then map good existing code onto the agreed shell.

---

## Ordered gates (stop at each)

### 1. Freeze IA

- Source: [`current-pages-map.md`](./current-pages-map.md) (already mostly done).
- Checklist sign-off **defaulted to Paul’s “layout makes sense”** — no further IA debate overnight.
- Locked surface: Gate → Home (cards) → Match (3 tabs) → Insights (3 areas) → Account.

### 2. Scaffold proto

- New Vite + React + TS app: `proto/` or `app-proto/` (pick one; prefer `proto/` if repo root is free).
- **Routes only** with stub content — no real tagging, stores, video, or analytics.
- Routes:
  - **Gate** — login / register / device session stubs
  - **Home** — cards (Next/Continue · Matches · Insights tease)
  - **Match** — 3 tabs: Match Insights · Details · Tag
  - **Insights** — 3 areas: Story/Work on · Reels · Scope
  - **Account** — profile / reviewing-as / import-export stubs
- Bottom nav: Home · Insights · Account (Match entered from Home/Find).

### 3. Theme pack

- Define CSS variables from existing shadcn + `ui-mine` tokens.
- **Icons:** `@/ui-mine/Icon` only (no direct `lucide-react` in features).
- Light default; kill ad-hoc paint in the proto.
- Document tokens in `proto/README.md` (or `app-proto/README.md`).

### 4. Browser smoke (required before merge)

- Click through Gate → Home → Match (all 3 tabs) → Insights (all 3) → Account.
- Confirm bottom nav + Match entry paths work; no white screens / broken routes.
- Build alone is **not** enough (see preferences).

### 5. STOP for Paul

- Deliver a **clickable proto** for Paul to review when he returns.
- **Do NOT** migrate product code, rewrite `app/` IA, or graft proto into live tagging until Paul signs off.

---

## Success criteria

- [ ] Clickable proto implements Gate · Home · Match (3) · Insights (3) · Account with stub UI
- [ ] Theme tokens documented; light default; ui-mine Icon + shared CSS variables only
- [ ] Browser smoke passed and noted on the PR
- [ ] Thin PRs; current product `app/` unchanged (reference)
- [ ] Stopped before product migration — waiting on Paul

---

## Out of scope

- Reworking live Pass 1 / tagging / clips / stores
- Migrating real match data or video into proto
- Dark mode as a deliverable (tokens may leave room; light ships)
- New npm deps beyond Vite+React+TS scaffolding needs
- Account/cloud auth implementation
- Rewriting Architecture / DataSchema for the proto

---

## Worker rules

1. **No product rework** — do not reshape `app/` into the thin IA this sprint.
2. **Browser smoke required** before claiming done / merging proto PRs.
3. **Thin PRs** — scaffold → theme → smoke; keep diffs reviewable.
4. Follow `.cursorrules` for any shared UI patterns copied into proto.
5. Prefer proto + theme before any product rework (preferences).
6. On merge: post PR link + update `test-snapshots.md` if that process still applies; otherwise note in PR body.

---

## Links

| Doc | Path |
|-----|------|
| Current + proposed IA map | [`current-pages-map.md`](./current-pages-map.md) |
| Project preferences | [`preferences.md`](../preferences.md) |
| Project context | [`project-context.md`](./project-context.md) |
