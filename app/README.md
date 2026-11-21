# Match Analyser — IA shell proto

Clickable **nav/layout wireframe** for the proposed MVP shell (Gate · Home · Match · Insights · Account).  
## Run

```bash
cd app
npm install --legacy-peer-deps
npm run dev
```

- Dev server: **http://localhost:5174**
- Build: `npm run build`
- Preview: `npm run preview` (also port **5174**)

## Routes

| Surface | Path |
|---------|------|
| Gate (login / register / device) | `/` |
| Matches | `/matches` |
| Old Home and Find | `/home` and `/find` redirect to `/matches` |
| Match Insights | `/matches/:id/insights` |
| Match Details | `/matches/:id/details` |
| Match Tag | `/matches/:id/tag` |
| Insights Story / Work on | `/insights/story` |
| Insights Reels | `/insights/reels` |
| Insights Scope | `/insights/scope` |
| Account | `/account` |

Nav (shell): **Matches · Insights · Account**. A bottom bar in portrait, a left rail in landscape. Hidden inside a match.

## Theme tokens

Light default. CSS variables in `src/index.css` (`@theme`):

| Token | Role |
|-------|------|
| `--color-brand-primary` / `-hover` / `-muted` | Brand teal |
| `--color-text` / `--color-text-muted` / `--color-text-on-accent` | Ink |
| `--color-bg-app` / `-shell` / `-surface` / `-card` / `-elevated` | Surfaces |
| `--color-border` / `-border-strong` | Dividers |
| `--color-pill-idle` / `-border` | Control chrome |
| `--color-success` / `-warning` / `-danger` / `-info` | Semantic |
| `--font-sans` | Plus Jakarta Sans |
| `--radius-*` / `--shadow-*` / `--animate-micro` | Shape / motion |
| `--control-*` | Compact control density |

Icons: `@/ui-mine/Icon` only — features must not import `lucide-react`.

## Scope stop

Stop at clickable stubs. Do not migrate product features here until IA sign-off.
