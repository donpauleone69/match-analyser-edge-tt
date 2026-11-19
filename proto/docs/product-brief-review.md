# Product brief: review note

For [product-brief.md](./product-brief.md). Precedence used: Paul's latest explicit decisions for direction, code on `cursor/mvp-proto-shell-d372` at `7f3b893` (v0.16.1) for what exists. "Transcript #N" means message N in the coordinator transcript (`bc-70b48325-...`, fetched 19 Nov). Store paths are under `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/`.

## Conflicts that matter

| Topic | Older source says | Latest decision and code | Pointer |
|---|---|---|---|
| Question order | End first (last shot, then Serve, Receive, Third, shot 4, End shots); `decisions-log.md` "runs last shot first" | Sequential: Serve, every shot 2 to n, then End. Paul: "go to sequential" | Transcript #5981; `proto/src/features/tagging/bestFlow.ts` `questionOrder`, `routeAfter`; `tagging-ideation/best-fa-main-plan.md` |
| Which shots are asked | Shots 2 to 4 and the last 3; Who attacked first? covers the rest | Every shot asked (`bestAsked` is shot 2 to n), so Who attacked first? never shows | Transcript #5785 item 1; `bestFlow.ts` `bestAsked`, `asksWhoFirst` |
| Mismatch fixes | Delete last, Delete first, Check, More, toss offer | Removed in v0.16.1; Rally Row has server pill, Not a shot, Star, Edit | Transcript #6278, #6281; commit `e625dbd` |
| Flows | Keep Best + FA, Shot by shot, Spine | Best + FA only in the picker; the other two still in code, reachable by URL | Transcript #6092; `proto/src/features/tagging/tagLog.ts`; `decisions-log.md` |
| Point to | Asked on every rally | Derived from server, contact count and End; asked only while the server is unknown (rally one) | `bestFlow.ts` `padFocus`, `settlePoint`; Transcript #5785 item 4 |
| Serve | Short or Long | Four quadrants: length plus landing corner (BH or FH side) | Transcript #6092; v0.16.0, PR #139 |
| Rally phases | Serve, pre-offensive, FOS, continuation, end | Opening, Attack, Rally, End; Attack is first attack + 2, End is last 3 | Transcript #5549, #5571; `bestFlow.ts` `BEST_ATTACK_LEN`, `BEST_END_LEN`; `tagging-rules-and-phase-options.md` |
| Tagging rules source of truth | `preferences.md` names `tagging-rules-and-phase-options.md` | That doc describes `app/` Pass 1 (14 Nov) and is superseded by the proto flow | `preferences.md` "Tagging rules source of truth" |
| IA and terms | Repo Architecture and Glossary: Match Review tabs, Work on, Clips hub, Highlight, Pass 1/2 | Proto: Home, Match (Insights, Details, Tag), global Insights (Summary, Serve, Receive, Improve), reels per section, no Clips hub, Star | `docs-match-analyser-edge-tt/Architecture.md`, `Glossary.md`; `proto/src/App.tsx`; `preferences.md` "Match hub", "Reels" |
| Repo rules | `.cursorrules`: React 18, Zustand persist, Essential/Full modes, Part 1/2 workflow, spec files that no longer exist | Proto uses React 19, no Zustand, no persistence; those modes are obsolete per Glossary | `/agent/repos/match-analyser-edge-tt/.cursorrules`; `proto/package.json` |
| Proto README | "No real tagging, stores, or video" | Real tagging logic and local video files; still no durable match store | `proto/README.md`; `proto/src/data/demoStore.tsx` |
| Persistence | `app/`: Dexie plus OPFS, Supabase foundation | Proto keeps matches and rallies in React state only; localStorage holds settings and a tag log | `demoStore.tsx`; `docs-match-analyser-edge-tt/DataSchema.md` |
| Status docs | `project-context.md` says "route planning, wireframe" phase | Proto is at v0.16.1 and in layout and theme work | Transcript #6092, #6152 to #6189 |

## Judgment calls

- Called the tagging function "agreed" from Paul's "I'm happy with the prototype functionality" (Transcript #6092).
- End listed as Winner, Net, Long: the default corner pad has those three; the Buttons layout also has Wide, and Paul said "I'll think about wide" (Transcript #5917). Marked open.
- Rally parts listed as derived: they come from the stroke tags, not a question.
- Users: Paul, then coach, then club, from `preferences.md` "Users".
- Success line written from Paul's real-match notes (eyes on video, Transcript #5785 item 5) and the no-scroll rule in `preferences.md`. No numeric targets were agreed, so none are given.
- Archive kept as "Later", per `preferences.md` "Video archive" and `product-roadmap.md`.

## Open decisions

- Path from proto to product: port into `app/` (rebuild sequence step 4, "map good existing code") or grow `proto/`. Not decided in any source.
- Durable data and video storage for proto; Supabase timing. `preferences.md` "Cloud tonight".
- Insights content: proto Insights are stubs (`proto/src/features/insights/InsightsScreen.tsx`); the study is in `tagging-ideation/best-fa-insights.md`.
- Wide as an End option; forced or unforced error as the one candidate new field (`best-fa-main-plan.md` section 6).
- Basic and Advanced completeness flags per rally (Transcript #578); not in code or schema.
- Parked ideas affecting future data: left-handers, placement and redirect, serve recovery, after-rally detail, phase-based tagging (`product-ideas.md`).
- Rally window: `preferences.md` says a rally starts 2 s before serve contact; code defaults to 1 s either side of contacts, with Paul's timing defaults (Lead 500, End 300, Transcript #6076). Minor, worth confirming before clip export is built.
