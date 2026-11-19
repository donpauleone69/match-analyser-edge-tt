# Test snapshots (merged to main)

Pull `main` and run the app. Each PR is a review point; tip of main includes all below.

| When (UTC) | PR | What to try |
|------------|-----|-------------|
| 2026-11-14 | [#129](https://github.com/donpauleone69/match-analyser-edge-tt/pull/129) | **MVP proto shell:** `cd proto && npm i --legacy-peer-deps && npm run dev` → :5174. Click Gate → Home → Match (3 tabs) → Insights (3) → Account. `app/` unchanged. |
| 2026-11-14 | [#100](https://github.com/donpauleone69/match-analyser-edge-tt/pull/100) | **MA-122 evidence↔playlist:** tap number → drawer + Focus sync; switch Focus clears evidence; linked rows soft-highlight |
| 2026-11-14 | [#94](https://github.com/donpauleone69/match-analyser-edge-tt/pull/94) | **MA-115 stats cards:** denser Serve/Receive cards; % + detail; headline→focus; under-tabs shell |
| 2026-11-14 | [#86](https://github.com/donpauleone69/match-analyser-edge-tt/pull/86) | **MA-106 Serve/Receive shell:** Focus chip = PlaylistBrowseShell; Summary/Clips trail; same chrome as Clips |
| 2026-11-14 | [#78](https://github.com/donpauleone69/match-analyser-edge-tt/pull/78) | **Serve/Receive deep-link (MA-98):** `?cat=B&focus=…` sticky playlist; evidence scroll; glance story dedupe; MA-100 BrowseDisclosure |
| 2026-11-14 | [#83](https://github.com/donpauleone69/match-analyser-edge-tt/pull/83) | **MA-104 playlist chrome:** BrowseDisclosure tokens; Serve/Receive phone Focus full-width; rally modal = Clip header |
| 2026-11-14 | [#77](https://github.com/donpauleone69/match-analyser-edge-tt/pull/77) | **MA-100 Browse + scrub:** phone Clips Playlists above stage; Serve/Receive focus picker; stage scrub marks + overlay |
| 2026-11-14 | [#72](https://github.com/donpauleone69/match-analyser-edge-tt/pull/72) | **Serve/Receive polish (MA-94):** Focus disclosure; evidence→playlist sync; Clips CTA; quieter chrome |
| 2026-11-14 | [#75](https://github.com/donpauleone69/match-analyser-edge-tt/pull/75) | **MA-97 Home/nav:** denser Home; h-12 nav; list border/callout tokens |
| 2026-11-14 | [#73](https://github.com/donpauleone69/match-analyser-edge-tt/pull/73) | **Mute + HUD cohesion (MA-95):** tagging mute-on-enter; Clips/Review unmute; showSets + shortPlayerName on scorebug |

| 2026-11-14 | [#69](https://github.com/donpauleone69/match-analyser-edge-tt/pull/69) | **Overlay cohesion (MA-90):** shared overlay icon chips; Clips/Review no clock badge; first-name HUD |
| 2026-11-14 | [#66](https://github.com/donpauleone69/match-analyser-edge-tt/pull/66) | **Serve/Receive Data (MA-82):** Summary → Serve Data / Receive Data; headlines + ≤2 cards; focus → playlist → watch / Clips |
| 2026-11-14 | [#64](https://github.com/donpauleone69/match-analyser-edge-tt/pull/64) | **Overlay on Clips/Rallies (MA-86):** scorebug + transport on video; Work on→Clips stage; Review rally modal; Rally edit HUD |
| 2026-11-14 | [#60](https://github.com/donpauleone69/match-analyser-edge-tt/pull/60) | **Shared overlay spine (MA-85):** `MatchScoreHud` + `MatchVideoOverlayBar`; Pass 1 / Simple adopt |
| 2026-11-14 | [#62](https://github.com/donpauleone69/match-analyser-edge-tt/pull/62) | **MA-88 Clips chrome:** phone sticky-only export; thin Work on→Clips back row; quieter stage header |
| 2026-11-14 | [#61](https://github.com/donpauleone69/match-analyser-edge-tt/pull/61) | **MA-87 Work on/Rallies:** no tutorial card; quiet filters; icon-only pattern actions |
| 2026-11-14 | [#59](https://github.com/donpauleone69/match-analyser-edge-tt/pull/59) | **Pass 1 rules sync (MA-77):** phase markers on rail; dialog below (amber→green); ★ on rail; no Change FA; select_fa/post-FA panel closed; mute default; rally loop when no shot; Lob end=2 → No Attack; optionals = Spin/Depth/Ball, FA Contact+Safe/Aggressive (no placement/Weak/Quality) |
| 2026-11-14 | [#57](https://github.com/donpauleone69/match-analyser-edge-tt/pull/57) | **Pass 1 No Attack restyle (MA-76):** select FA stage — No/Atk idle (not red) until tapped; tap → red selected; tap again → clear back to select FA |
| 2026-11-14 | [#56](https://github.com/donpauleone69/match-analyser-edge-tt/pull/56) | **Pass 1 optional RF + Basic/Advanced:** optional stage shows serve spin/placement/depth/Weak·Heavy; pre wing/placement/depth; FA contact/quality; later wing/stroke/initiative; Save Basic (`framework_confirmed`) with Advanced incomplete until RF choices filled (`detail_complete`) |
| 2026-11-13 | [#55](https://github.com/donpauleone69/match-analyser-edge-tt/pull/55) | **Pass 1 FA undo + auto-skip:** wrong FA in fa_details → tap FA caption / re-tap shot clears; other shot reassigns; Save needs FA wing+stroke; end=2 Push → No Attack skip; end=2 Flick → FA=2 skip; serve-only unchanged |
| 2026-11-13 | [#54](https://github.com/donpauleone69/match-analyser-edge-tt/pull/54) | **Pass 1 logic/layout (MA-71):** Result→locked End Wing/Stroke→FA/No Attack (red rail cell)→FA details→optional; single info above Rally; rally / from-shot-to-end loops; mute on shot loops; no Rally\|Shot; no fake optional checklist |
| 2026-11-13 | [#53](https://github.com/donpauleone69/match-analyser-edge-tt/pull/53) | **Pass 1 staged flow (MA-70):** info stages contacts→end→select FA/No→FA details→optional green; no sticky QUICK TAGS; optional in shot detail; End colour blue not grey; FA rail paint only after FA chosen |
| 2026-11-13 | [#52](https://github.com/donpauleone69/match-analyser-edge-tt/pull/52) | **Pass 1 labels:** checklist above rail (green when done); RALLY + QUICK TAGS; Show all below detail; Result no extra SHOTS |
| 2026-11-13 | [#51](https://github.com/donpauleone69/match-analyser-edge-tt/pull/51) | **Pass 1 flow:** always-select End; quick-mark End/FA/Review/★; FA 2nd tap=No; selected-only detail; End→Result→rally+FA; Rally\|Shot in transport; no Simple\|Pass1 overlay |
| 2026-11-13 | [#50](https://github.com/donpauleone69/match-analyser-edge-tt/pull/50) | **Pass 1:** Simple compact HUD + transport lift; form Serve·Let/Discard/Save. **Simple:** restored own bar (reverts #49). Pass 1 tagging IA kept |
| 2026-11-13 | [#49](https://github.com/donpauleone69/match-analyser-edge-tt/pull/49) | ~~Simple←Pass1 chrome~~ **inverted — superseded by MA-67** |
| 2026-11-13 | [#48](https://github.com/donpauleone69/match-analyser-edge-tt/pull/48) | Simple detail card = Pass 1 ShotRow (pastel wash, left stripe, role badges); matrix IA unchanged |
| 2026-11-13 | [#47](https://github.com/donpauleone69/match-analyser-edge-tt/pull/47) | Mute on shared transport (Simple+Pass1); matrix Off/End/Rev gaps = DetailPill `--control-gap` |
| 2026-11-13 | [#46](https://github.com/donpauleone69/match-analyser-edge-tt/pull/46) | Simple density: no FA/End under shot#; tighter matrix gaps; HUD lifted off progress bar |
| 2026-11-13 | [#45](https://github.com/donpauleone69/match-analyser-edge-tt/pull/45) | Simple Phase 2.5: Let before Discard; Pass1 colours (idle/pressed/shot#/detail); Rally\|Shot on video; row labels above matrix sections |
| 2026-11-13 | [#44](https://github.com/donpauleone69/match-analyser-edge-tt/pull/44) | Simple Phase 2.4: square tag-control cells; no outer grid; RALLY None + cycle Rally/Shot + ★; score/transport shared h-7 baseline |
| 2026-11-13 | [#43](https://github.com/donpauleone69/match-analyser-edge-tt/pull/43) | Simple Phase 2.3 layout: smaller score; RALLY column (No Atk / Rally\|Shot / ★); matrix grid; one Serve+Discard/Save row; no Redo/Leave |
| 2026-11-13 | [#42](https://github.com/donpauleone69/match-analyser-edge-tt/pull/42) | Simple Phase 2.2 polish: framed shots + green underline; mode overlay; transport fit; action row above matrix; Rally\|Shot by shot #s |
| 2026-11-13 | [#41](https://github.com/donpauleone69/match-analyser-edge-tt/pull/41) | Simple Phase 2.1: No-atk on Offensive row; End auto + wing/shot; Rally\|Shot loop; pinned matrix; HUD bottom-left; gold ★ left |
| 2026-11-13 | [#40](https://github.com/donpauleone69/match-analyser-edge-tt/pull/40) | Simple tagging UX: CNT-style Off/End/Rev matrix; ★ on Save; More flattened; FOS/End detail |
| 2026-11-13 | [#39](https://github.com/donpauleone69/match-analyser-edge-tt/pull/39) | **Simple tagging** Phase 1: mode bar Simple vs Pass 1; matrix Off/End/★/Rev; miss-reason on errors |
| 2026-11-13 | [#38](https://github.com/donpauleone69/match-analyser-edge-tt/pull/38) | Desktop Clips: one Download on export strip |
| 2026-11-13 | [#37](https://github.com/donpauleone69/match-analyser-edge-tt/pull/37) | Work on→Clips `?clip=` expands phone Playlists |
| 2026-11-13 | [#36](https://github.com/donpauleone69/match-analyser-edge-tt/pull/36) | Gap before first contact seeks prev-set +10s |
| 2026-11-13 | [#35](https://github.com/donpauleone69/match-analyser-edge-tt/pull/35) | Mid-rally Leave: Keep draft / Discard / Stay |
| 2026-11-13 | [#34](https://github.com/donpauleone69/match-analyser-edge-tt/pull/34) | Mid-rally Leave with confirm; draft kept for resume |
| 2026-11-13 | [#33](https://github.com/donpauleone69/match-analyser-edge-tt/pull/33) | `npm run smoke:390` tip Playwright script (22/22) |
| 2026-11-13 | [#32](https://github.com/donpauleone69/match-analyser-edge-tt/pull/32) | Pass 1 Leave vs Done labels/aria (soft exit ≠ finish set) |
| 2026-11-13 | [#31](https://github.com/donpauleone69/match-analyser-edge-tt/pull/31) | Incomplete badge→filter; Gap hide &lt;15s; Summary Fix copy |
| 2026-11-13 | [#30](https://github.com/donpauleone69/match-analyser-edge-tt/pull/30) | Tip regression 22/22; Pass 1 soft-exit Pause→Leave |
| 2026-11-13 | [#29](https://github.com/donpauleone69/match-analyser-edge-tt/pull/29) | Pass 1 Gap jump (set≥2); Rallies Incomplete badge |
| 2026-11-13 | [#28](https://github.com/donpauleone69/match-analyser-edge-tt/pull/28) | Phone Clips one Download; Summary incomplete → Rallies |
| 2026-11-13 | [#27](https://github.com/donpauleone69/match-analyser-edge-tt/pull/27) | Jump 1st seek-only; Details markers; phone Trim/Archive |
| 2026-11-13 | [#26](https://github.com/donpauleone69/match-analyser-edge-tt/pull/26) | Find matches phone filters + soft optional context |
| 2026-11-13 | [#25](https://github.com/donpauleone69/match-analyser-edge-tt/pull/25) | What’s left Fix incomplete → Edit → Save fix; Incomplete filter deep-link |
| 2026-11-13 | [#24](https://github.com/donpauleone69/match-analyser-edge-tt/pull/24) | Flag → Work on → Clips → Download; phone Rallies/Work on/Clips copy |
| 2026-11-13 | [#23](https://github.com/donpauleone69/match-analyser-edge-tt/pull/23) | Phone E2E nits: load-video CTA, Training back, F-codes hidden, smoke fixture |
| 2026-11-13 | [#22](https://github.com/donpauleone69/match-analyser-edge-tt/pull/22) | Pass 1: draft resume; Incomplete badges; phone strokes; rail FA/End |
| 2026-11-13 | [#21](https://github.com/donpauleone69/match-analyser-edge-tt/pull/21) | Pass 1: mandatory FA/End; sticky ✓ affordance; phone shot wrap |
| 2026-11-13 | [#20](https://github.com/donpauleone69/match-analyser-edge-tt/pull/20) | Bottom nav: Home · Clips · Account; Training via Account |
| 2026-11-13 | [#19](https://github.com/donpauleone69/match-analyser-edge-tt/pull/19) | Review header: single Tag/Clips action; denser phone chrome |
| 2026-11-13 | [#18](https://github.com/donpauleone69/match-analyser-edge-tt/pull/18) | Backup/sync status on Find + Details; Account sync blurb |
| 2026-11-13 | [#17](https://github.com/donpauleone69/match-analyser-edge-tt/pull/17) | Nav: Matches demoted; Find matches from Home |
| 2026-11-13 | [#16](https://github.com/donpauleone69/match-analyser-edge-tt/pull/16) | Match-file export/import polish |
| 2026-11-13 | [#15](https://github.com/donpauleone69/match-analyser-edge-tt/pull/15) | Optional context polish / opponent nudge |
| 2026-11-13 | [#14](https://github.com/donpauleone69/match-analyser-edge-tt/pull/14) | Pass 1 phone speed chrome |
| 2026-11-13 | [#13](https://github.com/donpauleone69/match-analyser-edge-tt/pull/13) | No duplicate match tagging guard |
| 2026-11-13 | [#12](https://github.com/donpauleone69/match-analyser-edge-tt/pull/12) | Incomplete points out of stats |
| 2026-11-13 | [#11](https://github.com/donpauleone69/match-analyser-edge-tt/pull/11) | Trim/archive + jump markers (1st serve / set end) |
| 2026-11-13 | [#10](https://github.com/donpauleone69/match-analyser-edge-tt/pull/10) | Edit/re-tag: Fix from Work on, Save fix, Fix saved |
| 2026-11-13 | [#9](https://github.com/donpauleone69/match-analyser-edge-tt/pull/9) | Work on → Clips deepen |
| 2026-11-13 | [#8](https://github.com/donpauleone69/match-analyser-edge-tt/pull/8) | Home What’s left / resume; Matches Find |
| 2026-11-13 | [#7](https://github.com/donpauleone69/match-analyser-edge-tt/pull/7) | Pass1 More menu; Clips reel export |
| 2026-11-13 | [#6](https://github.com/donpauleone69/match-analyser-edge-tt/pull/6) | Day UX flow / export / scope |
| 2026-11-13 | [#5](https://github.com/donpauleone69/match-analyser-edge-tt/pull/5) | Dead UI removed |
| 2026-11-13 | [#4](https://github.com/donpauleone69/match-analyser-edge-tt/pull/4) | Overnight Pass1 / playlists |
| 2026-11-13 | [#3](https://github.com/donpauleone69/match-analyser-edge-tt/pull/3) | Foundation / main promote |

Next expected: clip windows (Phase 3) after Paul confirms Phase 2.2 polish








