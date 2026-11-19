# Overnight UX — nested borders assessment (MA-158)

**Surface tip now:** `f32ee22` (`main`, clean)  
**Yesterday tip:** `1316612`  
**Status:** De-frame capped. No more taste/polish PRs until you decide.

Hard-refresh: http://localhost:5173/

---

## What went wrong

Overnight density + token agents stacked **borders around borders** — Panel → row → list → badge, and Cards that already use shadow also got `border-border`. Result felt boxed-in and uglier than yesterday, even where behavior was fine.

Separately, Clips white-screened after “Loading…” because MA-86 put a `useMemo` after the loading early-return (Rules of Hooks). Build-only merge gate never caught that.

---

## What we fixed (merged)

| PR | Fix |
|----|-----|
| [#124](https://github.com/donpauleone69/match-analyser-edge-tt/pull/124) | Clips white-screen — score HUD no longer a hook after early returns |
| [#126](https://github.com/donpauleone69/match-analyser-edge-tt/pull/126) | De-frame Home / Find / Summary headlines |
| [#127](https://github.com/donpauleone69/match-analyser-edge-tt/pull/127) | De-frame Match Review (Work on, Rallies, Details, storage, chips) |
| [#128](https://github.com/donpauleone69/match-analyser-edge-tt/pull/128) | De-frame Clips lists/stage, Pass 1 set picker, Account/Settings |

Approach: remove nested decorative frames only (wash / divide-y / shadow-sm). **Not** more density polish.

---

## What may still feel worse than yesterday

De-frame cuts the “boxes in boxes.” It does **not** make the app look like `1316612`.

Still different on purpose / leftover overnight:

- Tighter padding / denser type (we did not re-expand spacing)
- BrowseDisclosure + playlist trails (new control chrome — kept)
- Compare cards still have **one** outer border each
- Global paint tokens (`border-border` instead of old neutrals)

If it still feels wrong after a poke, **rollback** beats another polish loop.

---

## Worth keeping from overnight (if you roll back)

- Browse shell + Work-on / Summary → Clips trails  
- Serve/Receive glance + evidence  
- Pass 1 contacts / Save row / Leave behavior  
- Score HUD / video overlay  
- Always keep Clips crash fix: `e75802d`

Do **not** revive wholesale Track B “quiet chrome / density” token churn.

---

## Rollback recipe (only if you say so)

```powershell
cd c:\Dev\match-analyser-edge-tt
git fetch origin
git checkout main
git pull --ff-only origin main

git branch backup/pre-rollback-overnight-$(Get-Date -Format yyyyMMdd) HEAD

git reset --hard 1316612
git cherry-pick e75802d

# Only if you explicitly want remote main rolled back:
# git push --force-with-lease origin main
```

Then cherry-pick only the overnight ideas you liked (browse trails, Serve/Receive glance, Pass 1 pad, etc.).

---

## Your call when back

1. Poke Home → Find → Review → Clips → Pass 1 set list → Account  
2. Say one of: **keep tip** / **selective reverts** / **full rollback to `1316612` + cherry-picks**

Agents stay idle on taste until that verdict.
