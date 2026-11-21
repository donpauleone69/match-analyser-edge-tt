# Edge TT Match Analyser

Table tennis match tagging and insights. This folder is the app.

## Run

```bash
npm install --legacy-peer-deps
npm run dev
```

Dev server: http://localhost:5174

```bash
npm run build
npm test
npm run check:rules
npm run check:docs
npm run smoke
```

Setup, the smoke baseline, the merge gate, and where the code lives: `AGENTS.md` at the repo root.

## Routes

| Surface | Path |
|---|---|
| Gate | `/` |
| Matches | `/matches` |
| Match Insights, Details, Tag | `/matches/:matchId/...` |
| Set Tagger | `/matches/:matchId/tag/:setId` |
| Insights | `/insights` |
| Account | `/account` |

Any other path opens the gate. Nav is Matches, Insights, Account: a bottom bar in portrait, a left rail in landscape, hidden inside a match.
