# Tip-of-main @390 Playwright smoke

Reusable phone-width regression covering the MA-44 path (Home → Find → Tag → Done → Summary incomplete → Work on → Clips → Rallies Incomplete → Fix → Details → Account/Training).

**Not wired as mandatory CI** — run locally or on demand before merge.

## Fixture

Video fixture (checked in):

```
app/public/fixtures/smoke-set.mp4
```

Override with `SMOKE_FIXTURE=/path/to/file.mp4` if needed.

## Prereqs

```bash
cd app
npm install --legacy-peer-deps
```

Needs a Chromium/Chrome binary (`CHROME_PATH` or a common system path). Uses `playwright-core` (no Playwright browser download required when system Chrome is present).

## Run

Terminal 1 — start the app:

```bash
cd app
npm run dev
# default http://127.0.0.1:5173
```

Terminal 2 — smoke:

```bash
cd app
npm run smoke:390
```

Help:

```bash
npm run smoke:390 -- --help
```

### Useful env

| Env | Default | Meaning |
|-----|---------|---------|
| `SMOKE_BASE_URL` | `http://127.0.0.1:5173` | Running app origin |
| `SMOKE_FIXTURE` | `public/fixtures/smoke-set.mp4` | Local mp4 for Pass 1 upload |
| `SMOKE_OUT` | `app/smoke-artifacts` | Screenshots + `results.json` |
| `CHROME_PATH` | auto-detect | Chrome/Chromium executable |

Example against preview on another port:

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
SMOKE_BASE_URL=http://127.0.0.1:4173 npm run smoke:390
```

## Exit code

- `0` — all checks passed  
- non-zero — one or more fails (see console + `smoke-artifacts/results.json`)
