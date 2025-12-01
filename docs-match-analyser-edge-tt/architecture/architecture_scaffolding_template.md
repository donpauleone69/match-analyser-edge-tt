# Architecture

This document describes the high-level architecture for this project.

It is designed to be:

- **Concrete** enough for day-to-day implementation.
- **Generic** enough to reuse across similar projects (Next.js + API/DB backend).
- **Strict** enough about boundaries to keep the codebase understandable over time.

---

## 1. Goals & Principles

### 1.1 Goals

- Clear separation of concerns.
- Easy to navigate by feature.
- Easy to reason about data flow.
- Testable, with pure logic separated from framework code.
- Minimal special cases and “cleverness”.

### 1.2 Principles

- **Feature-first**: organize by domain feature (players, sessions, matches, series, etc.), not by technology (components, hooks).
- **Single responsibility per layer**:
  - UI composition → `features`
  - Domain rules → `rules`
  - Remote data access → `dataStorage`
- **Remote is source of truth**: all persistent data lives in the backend; client-side state is a cache + UI-only state.
- **Small pieces, well named**: filenames & exports should clearly say what they do.

---

## 2. Tech Stack Overview

Core choices (can be adapted for future projects):

- **Framework**: Next.js (App Router, React, TypeScript)
- **Client data orchestration**: TanStack Query (React Query)
- **Backend / DB**: Supabase (Postgres + Auth, optional Realtime & Edge Functions)
- **Hosting / deployment**: Vercel (for the Next.js app), Supabase (managed DB + auth + edge)
- **UI**:
  - Tailwind CSS v4 (uses `@import "tailwindcss"` and `@theme inline` syntax)
  - shadcn/ui primitives in `src/components/ui`
  - Custom app UI kit in `ui-mine/` (wrapping shadcn/Tailwind)
  - `lucide-react` for icons, used **only inside `ui-mine`** (not in features)
  - `clsx` and `tailwind-merge` for the `cn` utility function (required by shadcn components)
- **Language**: TypeScript end-to-end
- **Dev tools**:
  - Cursor as the primary editor/AI assistant
  - GitHub as the central repo and CI trigger
  - Optional: Speckit / other tools for specs & automation

---

## 3. High-Level Folder Structure

Under `src/`:

```txt
src/
  app/           # Next.js App Router: routes & layouts (thin)
  features/      # Feature-specific UI & orchestration (composers, sections, blocks, data, derive, models)
  rules/         # Pure domain logic (no React, no IO)
  dataStorage/   # Remote data access (DB/API clients per entity)
  ui-mine/       # Shared UI kit built on shadcn/Tailwind/lucide
  helpers/       # Generic utilities (formatting, small functions). Use this instead of `src/lib`.
  styles/        # Global styles, theme, fonts
  components/
    ui/          # shadcn-generated primitives (never used directly in features)
```

Route groups in `app/` (Option B - Separate Route Groups):

```txt
app/
  (public)/      # Public pages: login, register, forgot-password
  (player)/      # Player route group (own layout + player nav)
    layout.tsx   # Player role guard, player navigation
    home/        # Dashboard + sub-pages (performance, history, rankings)
    sessions/    # Session list + detail (player view)
    community/   # Club players list + profiles
    profile/     # Own profile view + edit
  (admin)/       # Admin route group (own layout + admin nav)
    layout.tsx   # Admin role guard, admin navigation
    dashboard/   # Admin overview
    sessions/    # Session management (admin view with controls)
    players/     # Player roster management
```

**Key Benefits of Option B:**
- Each route group has its own layout with role-specific navigation
- Role guard at layout level = zero component-level role checks
- Session detail exists in both groups but shows role-appropriate actions
- Clean separation, easier to maintain and reason about

Docs:

```txt
docs/
  architecture.md
  features.md
  rules.md
  data.md
  ui.md
  glossary.md
  roadmap.md
```

Tests can live alongside code or in a dedicated `tests/` tree, as long as they mirror the structure.

---

## 4. Layers & Responsibilities

### 4.1 `app/` – Routing & Shell

- Uses the Next.js **App Router**.
- Organised into **three separate route groups** (Option B):

  - `(public)/` – pages that do not require auth (login, register, forgot-password).
  - `(player)/` – authenticated player area (dashboards, personal stats, sessions read-only).
  - `(admin)/` – authenticated admin area (management, configuration, session control).

- Each route group has its own `layout.tsx`:
  - `(player)/layout.tsx` – player navigation, player role guard
  - `(admin)/layout.tsx` – admin navigation, admin role guard

- Each `page.tsx`:
  - Reads route params.
  - Imports a **Composer** component from `features/<feature>/composers`.
  - Renders it.

**Example patterns:**

```tsx
// src/app/(admin)/sessions/[sessionId]/page.tsx
import { SessionDetailAdminComposer } from "@/features/session/composers/SessionDetailAdminComposer";

export default function Page({ params }: { params: { sessionId: string } }) {
  return <SessionDetailAdminComposer sessionId={params.sessionId} />;
}
```

```tsx
// src/app/(player)/home/page.tsx
import { PlayerDashboardComposer } from "@/features/me/composers/PlayerDashboardComposer";

export default function Page() {
  return <PlayerDashboardComposer />;
}
```

```tsx
// src/app/(player)/sessions/[sessionId]/page.tsx
import { SessionDetailPlayerComposer } from "@/features/session/composers/SessionDetailPlayerComposer";

export default function Page({ params }: { params: { sessionId: string } }) {
  return <SessionDetailPlayerComposer sessionId={params.sessionId} />;
}
```

**Auth Flow:**
1. User logs in at `(public)/login`
2. On success, check user role from profile
3. Redirect to `(player)/home` or `(admin)/dashboard` based on role
4. Layout guards prevent wrong role from accessing routes

`app/` is for **routing, layout, and shell**, not business logic. Role checks happen at the layout level, not in individual components.

---


#### 4.1.1 Auth resolution & Supabase client (per request)

For performance and simplicity we follow:

> **One auth resolution per request, one Supabase client per request.**

- In each protected layout (`(player)/layout.tsx` and `(admin)/layout.tsx`), we:
  - Create a **server Supabase client** once, using the incoming cookies/headers.
  - Call `supabase.auth.getSession()` **once** to get the current user and role.
  - Build a small `AuthContext` object, e.g. `{ supabase, userId, role, clubId? }`.
  - **Check role matches route group** (player layout checks for any auth, admin layout checks for admin role).
- This `AuthContext` is then passed down via:
  - a React context provider, or
  - props into server components / loaders that need it.

`app/` is responsible for:

- Deciding whether a route is public, player, or admin.
- Redirecting unauthenticated users out of protected routes.
- Redirecting wrong-role users (e.g., player trying to access admin routes).
- Creating the per-request Supabase client + session **once** and handing that to the lower layers.

All other layers (`features`, `dataStorage`, `rules`) must treat the Supabase client and auth info as **inputs**, not create or resolve them again.

**Role Guard Pattern:**

```tsx
// src/app/(admin)/layout.tsx
export default async function AdminLayout({ children }) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) redirect('/login');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  if (profile?.role !== 'admin') redirect('/home'); // Send to player area
  
  return (
    <AdminNavLayout>
      {children}
    </AdminNavLayout>
  );
}
```

```tsx
// src/app/(player)/layout.tsx
export default async function PlayerLayout({ children }) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) redirect('/login');
  
  // Any authenticated user can access player routes
  // (admins can view player area too if needed)
  
  return (
    <PlayerNavLayout>
      {children}
    </PlayerNavLayout>
  );
}
```

### 4.2 `features/` – Feature UI & Orchestration

Each domain feature has its own folder:

```txt
src/features/<feature>/
  composers/   # Route-level composition components
  sections/    # Page sections (larger UI regions)
  blocks/      # Smaller UI units (rows, cards, items)
  data/        # Feature-level data hooks (TanStack Query)
  derive/      # Glue between data + rules, prepares view models
  models.ts    # View-model types for this feature
```

#### 4.2.1 `composers/` – Route-Level Composition

- These are what `app/**/page.tsx` imports.
- File naming: `<Thing>Composer.tsx`, e.g.:
  - `SessionDetailComposer.tsx`
  - `SeriesListComposer.tsx`
  - `UserDashboardComposer.tsx`
- Responsibilities:
  - Call feature data hooks (`features/*/data`).
  - Call feature derive hooks (`features/*/derive`) to prepare view models.
  - Compose one or more Sections and pass them data.
  - Hold top-level local UI state (filters, active tabs, etc.) when needed.

These are **not** Next.js “pages” in routing terms; they are **React composition units** for features.

#### 4.2.2 `sections/` – Page Sections

- Major parts of a composer.
- File naming: `<Thing>Section.tsx`, e.g.:
  - `SessionOverviewSection.tsx`
  - `SessionMatchesSection.tsx`
  - `SessionLeaderboardSection.tsx`
  - `PlayerAvailabilitySection.tsx`
- Responsibilities:
  - Define layout for a zone of the page.
  - Often laid out in grids/flex to form “bento” style dashboards.
  - Receive view models via props from Composers or call derive hooks directly (when scoped to that section).

Sections should avoid direct data access where possible; prefer deriving view models in Composers or derive hooks.

#### 4.2.3 `blocks/` – UI Building Blocks

- Small, reusable UI components bound to the feature.
- Examples:
  - `MatchCardBlock.tsx`
  - `SeriesStandingRow.tsx`
  - `PlayerStatsBlock.tsx`
  - `PlayerAvailabilityBlock.tsx`
- Responsibilities:
  - Presentational; props in → JSX out.
  - No backend calls.
  - No global state (aside from minor UI-only state like “is this expanded”).

Blocks should rely on `ui-mine` primitives (e.g. `Card`, `Button`, `MatchCard`, `Icon`) for visuals, not raw shadcn or `lucide-react`.

#### 4.2.4 `data/` – Feature Data Hooks (TanStack Query)

- Hooks that connect React components to the backend via `dataStorage`.
- Use TanStack Query for:
  - querying (read)
  - mutations (write)
  - caching
  - invalidation
  - optional optimistic updates

**Naming pattern:**

- Reads:

  - File: `readDataFrom<Entity><Context>.ts`  
  - Hook: `useReadDataFrom<Entity><Context>()`

- Writes (create/update/delete):

  - File: `writeDataTo<Entity>.ts`  
  - Hook: `useWriteDataTo<Entity>()`

Inside a write file, you can still expose granular helpers (`create<Entity>`, `update<Entity>`, `delete<Entity>`) if useful, but the exported hook name stays consistent.

**Examples:**

- `readDataFromSessionMatches.ts` → `useReadDataFromSessionMatches()`
- `readDataFromSeriesList.ts` → `useReadDataFromSeriesList()`
- `writeDataToMatch.ts` → `useWriteDataToMatch()`
- `writeDataToSession.ts` → `useWriteDataToSession()`

These hooks **never** call Supabase directly; they call `dataStorage` functions.

#### 4.2.5 `derive/` – View Model Derivation

This layer derives **UI-ready view models** by combining:

- Raw data from feature `data` hooks.
- Pure domain logic from `rules/` (which uses `calculate*` functions).
- UI-level decisions such as:
  - which rows to highlight,
  - what display mode a card should be in,
  - whether the layout should be compact vs full.

**Naming:**

- Files: `derive<Entity><Thing>.ts`
- Hooks: `useDerive<Entity><Thing>()`

Examples:

- `deriveSessionStandingsViewModel.ts` → `useDeriveSessionStandingsViewModel()`
- `deriveSessionOverview.ts` → `useDeriveSessionOverview()`
- `derivePlayerDashboard.ts` → `useDerivePlayerDashboard()`

Internally, derive hooks may call domain-level calculate functions from `rules/`:

```ts
import { calculateSeriesStandings } from "@/rules/standings/calculateSeriesStandings";
```

This keeps a clear distinction:

- **`rules/`** → `calculate*` (pure domain logic)
- **`features/*/derive`** → `derive*` (assemble data & domain logic into view models)

#### 4.2.6 `models.ts` – View Models

- Contains TypeScript types/interfaces representing the shape of data the UI needs.
- Example types:
  - `MatchViewModel`
  - `SessionOverviewViewModel`
  - `SeriesStandingRowViewModel`
  - `PlayerDashboardViewModel`
- Not DB row types (those belong in `dataStorage` or generated DB typings).

---

### 4.3 `rules/` – Pure Domain Logic

```txt
src/rules/
  standings/
  elo/
  stats/
  matchmaking/
  validation/
  statuses.ts      # central status type definitions
```

- Contains **pure, deterministic functions** (no IO, no side effects).
- Function naming:

  - Calculations: `calculateSomething(...)`
  - Validation: `validateSomething(...)`

Examples:

- `calculateSeriesStandings(...)`
- `calculateEloRating(...)`
- `calculatePlayerStats(...)`
- `calculateHeadToHead(...)`
- `calculateSessionPairings(...)`
- `validateMatchScores(...)`

These are:

- Independent of UI and React.
- Consumed by `features/*/derive` hooks.
- The heart of the domain logic and should be stable + heavily unit-tested.

#### 4.3.1 Domain Statuses & State Machines

Domain entities use explicit status fields to represent their lifecycle. For example:

- **Sessions**: `"upcoming" | "active" | "complete"`
- **Matches**: `"upcoming" | "ready" | "active" | "complete"`
- **Tables**: `"available" | "unavailable"`
- **Session players**: `"registered" | "confirmed" | "playing" | "finished"`

These statuses are:

- Defined as TypeScript string unions in the `rules` layer (e.g. `rules/statuses.ts`).
- Stored as `text` columns in the database (optionally constrained or converted to DB enums later).
- Interpreted and validated via pure functions in `rules`, such as:
  - `calculateSessionStatus(...)`
  - `validateMatchStatusTransition(from, to)`

The `features/*/derive` layer maps domain statuses into view models, including:

- UI variants (e.g. card colours, badges, pills).
- UI layout modes (e.g. `"activeEditing"` vs `"completedSummary"`).

All writes that change status flow through `dataStorage` and `useWriteDataTo*` hooks, and should respect the allowed transitions defined in `rules`.

---

### 4.4 `dataStorage/` – Remote Data Access

```txt
src/dataStorage/
  playersDataStorage.ts
  matchesDataStorage.ts
  sessionsDataStorage.ts
  seriesDataStorage.ts
```

- Single responsibility: **talk to the backend** (Supabase or any other API).
- Functions are plain `async` operations using the backend SDK (e.g. Supabase JS SDK):

  - `getPlayerById(id)`
  - `listPlayersForClub(clubId)`
  - `createPlayer(...)`
  - `updatePlayer(...)`
  - `deletePlayer(...)`
  - `getMatchesForSession(sessionId)`
  - `updateMatchScore(matchId, scoreA, scoreB)`
  - `createMatch(...)`

**Rules:**

- No React.
- No TanStack Query.
- No UI logic.
- No domain-specific decisions (just IO).
- This is the **only layer** that communicates with Supabase directly.

All database writes (creates/updates/deletes) flow through `dataStorage` functions, triggered by `useWriteDataTo*` hooks in `features/*/data`.

---

### 4.5 `ui-mine/` – Shared UI Kit

- Wraps shadcn/Tailwind into app-specific UI components.
- Uses a **folder-per-component hierarchy** (one folder per visual primitive).
- shadcn primitives live in `src/components/ui/*` (generated by the shadcn CLI) and MUST NOT be used directly in features.
- `ui-mine` components wrap these primitives and may also use `lucide-react` icons internally.

Examples of component folders:

- `src/ui-mine/Button/`
- `src/ui-mine/Card/`
- `src/ui-mine/MatchCard/`
- `src/ui-mine/Pill/`
- `src/ui-mine/PageContainer/`
- `src/ui-mine/Icon/` (optional wrapper around `lucide-react` icons)

**Typical structure per component:**

```txt
src/ui-mine/Button/
  Button.tsx        # Component
  buttonStyles.ts   # CVA/Tailwind styles & variants
  buttonTypes.ts    # TypeScript props/types
```

For more complex components (like `MatchCard`), you may also have:

```txt
src/ui-mine/MatchCard/
  MatchCard.tsx
  matchCardStyles.ts
  matchCardTypes.ts
  parts/
    Header.tsx
    Body.tsx
    Footer.tsx
```

Icon usage:

- `lucide-react` should be imported **only inside `ui-mine`** (e.g. `ui-mine/Icon` or specific components).
- Features/blocks/sections should use icon components exposed from `ui-mine` instead of importing `lucide-react` directly.
- **When new icons are needed**: Add them to the export list in `src/ui-mine/Icon/Icon.tsx` so features can import them from `@/ui-mine/Icon/Icon` instead of directly from `lucide-react`.

Rules:

- `ui-mine` must contain **only visual components** (no domain logic, no IO).
- UI is **component-organised**, not feature-organised.
- Features import from `ui-mine`, not from `shadcn/ui` or `lucide-react` directly.

---


### 4.6 Theme & Design Tokens

- All styling must use Tailwind CSS tokens (`bg-background`, `text-foreground`, `font-sans`, etc.).
- Global design tokens (colors, fonts, radii, shadows) are defined once in `src/styles/globals.css` 
  via CSS variables and `@theme inline`.
- Components **must not** hard-code colors or font families; always use theme-driven tokens.
- Themes (including typography changes) are swapped by replacing the CSS variable block,
  ensuring site-wide consistency without touching components.

### 4.6 `helpers/` – Generic Utilities

- Pure utility functions with no domain semantics.
- Examples:
  - `formatDate.ts`
  - `formatScore.ts`
  - `clampNumber.ts`
  - `createSlug.ts`
- No React, no Supabase, no stateful logic.

---

### 4.7 `styles/` – Global Styling

- `src/app/globals.css`:
  - Tailwind import (`@import "tailwindcss"` for v4).
  - **All shadcn CSS variables must be defined here** (background, foreground, primary, secondary, muted, accent, destructive, border, input, ring, radius).
  - Dark mode CSS variables.
  - Tailwind v4 `@theme inline` mapping for color variables.
  - App-wide global styles.
  - See `setupProject.md` Section 5.2 for the complete CSS variables setup.
- `styles/theme.ts` (optional):
  - Design tokens (colors, spacing, radii, etc.).
- `styles/fonts.ts` (optional):
  - Font setup (e.g. `next/font`), exporting CSS variables.

---

## 5. Data & State Flow

**End-to-end flow for a typical operation (e.g. session detail view):**

```txt
Backend (Supabase Postgres)
  ⇅  via dataStorage/<entity>DataStorage.ts (Supabase JS SDK)
Feature data hooks in features/<feature>/data (TanStack Query: readDataFrom*/writeDataTo*)
  ⇅
Feature derive hooks in features/<feature>/derive (combine data + rules into view models)
  ⇅
Blocks & Sections render view models
  ⇅
Composer components compose Sections & Blocks
  ⇅
app/ route (page.tsx) renders the Composer
```

**Remote state** (DB) is the **source of truth**.  
**TanStack Query** cache is the **current best-known copy**.  
**Local state** (React `useState`) is for **UI-only concerns** like open/closed panels, selected items, temporary inputs.

Only `dataStorage` communicates with the database; all other layers remain IO-free.

---

## 6. Client Data & TanStack Query

- **Query hooks** (`useReadDataFrom*`):
  - Implemented in `features/*/data/*`.
  - Use `useQuery` with meaningfully named keys.
  - Example keys:
    - `["session-matches", sessionId]`
    - `["session-standings", sessionId]`
    - `["player-profile", playerId]`

- **Mutation hooks** (`useWriteDataTo*`):
  - Implemented in `features/*/data/*` with `useMutation`.
  - Call `dataStorage` functions to perform writes.
  - On success, invalidate relevant queries:
    - Updating a match might invalidate:
      - `["session-matches", sessionId]`
      - `["session-standings", sessionId]`
      - `["player-availability", sessionId]`
      - etc.

- **Optimistic Updates** (optional):
  - Can be used in mutation hooks to make UI feel instant.
  - Use `onMutate` / `onError` / `onSettled` patterns for rollback.

There should be **no ad-hoc `fetch` or Supabase calls in components**; always go through `dataStorage` via feature data hooks.

---

## 7. UI Composition & “Bento” Layouts

Pages (via Composers) are built as a **grid of sections and cards**:

- Use a `PageContainer` from `ui-mine` to provide consistent padding and max-width.
- Inside:
  - Top sections (header, overview).
  - Flexible grid sections with nested cards/blocks.

Example:

```tsx
export function SessionDetailComposer({ sessionId }: { sessionId: string }) {
  return (
    <PageContainer>
      <SessionHeaderSection sessionId={sessionId} />

      <SessionOverviewSection sessionId={sessionId} />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <SessionMatchesSection sessionId={sessionId} />
        <div className="grid gap-4">
          <SessionLeaderboardSection sessionId={sessionId} />
          <PlayerAvailabilitySection sessionId={sessionId} />
        </div>
      </div>
    </PageContainer>
  );
}
```

Blocks inside sections often sit within `ui-mine/Card` or specialized variants like `MatchCard`. The “bento” feel comes from using responsive CSS grid and consistent card styling.

---

## 8. Backend, Auth & Edge Functions (Supabase)

- **Supabase Postgres**:
  - Stores all persistent data (players, sessions, matches, stats, ratings, etc.).
  - Protected with Row-Level Security (RLS).

- **Supabase Auth**:
  - Handles user sign-in/sign-up and session tokens.
  - Client uses Supabase JS SDK with the anon key in the browser.
  - Sensitive operations may rely on server-side logic or edge functions using a service role key.

- **Supabase JS SDK**:
  - Used in `dataStorage/*` for:
    - `.from(...).select(...)`, `.insert(...)`, `.update(...)`, `.delete(...)`
    - calling RPCs
    - accessing storage (if needed)

- **Edge Functions** (optional):
  - Used for trusted backend logic that:
    - requires secrets
    - must run close to users
    - is too heavy/complex for the client
  - Examples:
    - complex rating recalculation
    - batch operations over many matches/sessions
    - premium admin operations or exports

Edge Functions still write back to Supabase; they do not alter the architecture’s data flow pattern.

### 8.1 Supabase client lifecycle & RLS

- **Client creation**
  - On the server (layouts, route handlers, server actions), we create **one Supabase client per request** using the incoming cookies/headers.
  - On the client, we reuse a single browser Supabase client via a provider (no per-component `createClient` calls).

- **Auth resolution**
  - We call `supabase.auth.getSession()` at most **once per request** to obtain `userId` and high-level role/claims.
  - An `AuthContext` object (client + user/role/club info) is passed into the layers that need it.

- **dataStorage functions**
  - Do **not** create their own Supabase client or call `auth.getUser()` / `auth.getSession()`.
  - Instead, they receive a Supabase client or `AuthContext` as a parameter and only perform:
    - `.from(...).select/insert/update/delete`
    - RPC calls
    - storage operations

- **RLS**
  - All calls use the current user’s access token, so Postgres Row-Level Security (RLS) is the primary enforcement for who can see or modify which rows.
  - Any operation that must bypass RLS (e.g. cross-club admin exports, batch rating recalcs) is implemented in a Supabase Edge Function using the service role key, not in the Next.js app.

---

## 9. Realtime (Optional, Later)

Initial versions **do not require** Supabase Realtime.

Updates are handled by:

- Mutations → query invalidation → refetch.

This already provides smooth UI updates for the user performing the action on their device.

Realtime can be added **later**, and only where needed, e.g.:

- TV scoreboard screens.
- Multi-admin live views where one user’s changes must instantly appear for others without refresh.

When added, the pattern is:

- Subscribe to change events (e.g. Supabase Realtime channels).
- Use those events to:
  - Invalidate relevant queries, or
  - Patch the TanStack Query cache directly.

---

## 10. Testing Strategy (High Level)

- **`rules/`**:
  - Unit tests for pure functions:
    - ELO calculations
    - standings logic
    - stats aggregation
    - matchmaking/pairing
    - validation (e.g. legal scores)
  - No mocks needed beyond simple inputs.

- **`dataStorage/`**:
  - Integration tests against a test DB or mocked Supabase client.
  - Ensure queries and writes behave as expected.

- **`features/*/data` hooks**:
  - Tests focusing on:
    - correct use of query keys
    - invalidation behavior
    - optimistic update behavior (if used)

- **`features/*/composers`, `sections`, `blocks`**:
  - React Testing Library tests focusing on:
    - what is rendered for a given view model
    - interactions and events
    - expected text and elements appearing

Avoid over-mocking domain logic; test rules in isolation in `rules/` and keep feature tests focused on behavior.

---

## 11. Coding & Naming Conventions

- **Components (UI)**:
  - Filenames: PascalCase (`SeriesDetailComposer.tsx`, `MatchCardBlock.tsx`, `SessionOverviewSection.tsx`).
  - Exports: same PascalCase name.

- **Hooks (React)**:
  - Filenames: lowerCamelCase (`readDataFromSessionMatches.ts`, `deriveSessionStandingsViewModel.ts`).
  - Exports: `use` + PascalCase (`useReadDataFromSessionMatches`, `useDeriveSessionStandingsViewModel`).

- **Domain logic (rules)**:
  - Functions like `calculateSomething`, `validateSomething`.
  - Pure, deterministic.

- **Data storage functions**:
  - `get*`, `list*`, `create*`, `update*`, `delete*`.
  - Async, IO-focused, no UI or domain logic.

- Prefer descriptive names:
  - `calculateSeriesStandings` > `calcStandings`
  - `readDataFromSessionDetail` > `getStuff`
  - `deriveSessionOverview` > `buildData`

---

## 12. Deployment & Tooling

- **GitHub**:
  - Main repository and version control.
  - Triggers CI/CD workflows.
  - Used for PRs, code review, and branch management.

- **Vercel**:
  - Hosts the Next.js app.
  - Integrates directly with GitHub.
  - Provides preview deployments for branches and PRs.
  - Handles build, SSR, and edge network for the frontend.

- **Supabase**:
  - Hosts the Postgres database and Auth.
  - Exposes APIs consumed by `dataStorage/*`.
  - Optionally hosts Edge Functions.

- **Cursor (editor)**:
  - Primary development environment.
  - Uses `.cursorrules` to encode this architecture and naming conventions.
  - Can integrate with tools like Speckit to keep specs and implementation aligned.

---

## 13. Roadmap Awareness (Very High Level)

While not a full product roadmap, architecture decisions should respect:

- **MVP**:
  - Core flows working end-to-end.
  - Focus on data correctness and stable UI.
  - No Realtime required.
  - Minimal necessary features to run sessions, record matches, and show basic stats.

- **v1**:
  - Polished screens and user experience.
  - More advanced stats and player views.
  - Possibly first Edge Functions for heavier logic (e.g. rating recalcs, exports).

- **v2+**:
  - Realtime experiences where truly valuable (live scoreboards, multi-admin views).
  - Advanced pairing logic, historical analytics, richer dashboards.
  - Potential offline-friendly enhancements and richer mobile UX.

The architecture is intended to support these phases **without major rewrites**, by keeping responsibilities clearly separated from the start and using stable, well-defined layers.
