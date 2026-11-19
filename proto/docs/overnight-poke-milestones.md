# Overnight poke milestones (local only)

Nine frozen overnight points — **run all at once** on different ports.

**What’s new in each build (what to look at):** [overnight-poke-whats-new.md](overnight-poke-whats-new.md)  
Also: [overnight-deframe-assessment.md](overnight-deframe-assessment.md).

| # | Label | Port | URL | Folder |
|---|--------|------|-----|--------|
| 0 | yesterday | **5200** | http://localhost:5200/ | `c:\Dev\match-analyser-pokes\0-yesterday` |
| 1 | overlay | **5201** | http://localhost:5201/ | `c:\Dev\match-analyser-pokes\1-overlay` |
| 2 | browse | **5202** | http://localhost:5202/ | `c:\Dev\match-analyser-pokes\2-browse` |
| 3 | density | **5203** | http://localhost:5203/ | `c:\Dev\match-analyser-pokes\3-density` |
| 4 | theme | **5204** | http://localhost:5204/ | `c:\Dev\match-analyser-pokes\4-theme` |
| 5 | Serve/Receive | **5205** | http://localhost:5205/ | `c:\Dev\match-analyser-pokes\5-serve` |
| 6 | Pass 1 pad | **5206** | http://localhost:5206/ | `c:\Dev\match-analyser-pokes\6-pass1` |
| 7 | overnight tip | **5207** | http://localhost:5207/ | `c:\Dev\match-analyser-pokes\7-overnight-tip` |
| 8 | de-frame tip | **5208** | http://localhost:5208/ | `c:\Dev\match-analyser-pokes\8-deframe` |

(Ports **5200–5208** so they don’t fight your normal app on **5173**.)

---

## Start all (concurrent)

```powershell
powershell -File c:\Dev\match-analyser-pokes\start-all.ps1
```

Opens 9 PowerShell windows. Click the URLs above in browser tabs.

Stop:

```powershell
powershell -File c:\Dev\match-analyser-pokes\stop-all.ps1
```

---

## Notes

- Main checkout stays at `c:\Dev\match-analyser-edge-tt` on `main` — keep using http://localhost:5173/ for “current” if that Vite is already running.
- Each port has its **own** browser storage (separate from 5173), so libraries look empty until you use that port.
- **Clips is alive on all ports (5200–5208).** Ports **5201–5207** carry a **local poke-only** commit (`poke-only: Clips hooks fix…`) — same plain-`clipScoreHud` fix as #124 — so Paul can judge UI with Clips open. Historical overnight SHAs are still the parent; tip of each poke branch is that SHA + the patch. **5200** never had the bug; **5208** already had the fix in history.
- Local only — poke branches / patches are not pushed.
