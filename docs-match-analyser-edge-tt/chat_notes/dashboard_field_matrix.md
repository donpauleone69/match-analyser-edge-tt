# B-loop — Match Review annotation + data map

Date: 2026-11-11  
Mode: brainstorm (`/chat`) — Phase B iteration (dashboards → fields). Not implementation.

Source sketch: Match Review (Overview · Serves · Initial Offence · Point ends · shot success rates).  
**Iter 2 add:** end-shot detail (wing / stroke / outcome / miss reason).

---

## How to read this

For each card: **question → metric → fields** (tagged vs derived) · **thoughts** · **keep / reshape / cut**.

At the end: **missed**, **overkill**, **data union** (pass-1 candidates).

---

## 1. Overview (match-level)

| Card | Coaching question | Metric | Fields | Notes |
|------|-------------------|--------|--------|-------|
| Match & set score | Who won, how close? | Match winner; set scores; set winners | Match/set scores, `winner_id` | Free. Keep. |
| Total points won | Who took more points? | Points won by player | Scoring rallies + `winner_id` | Free. Keep. |
| Points won on serve | Who won more *on their serve*? | Server-won points / serve points (per player) | `server_id`, `winner_id`, `is_scoring` | Free. Keep as headline under Overview. |

**Thoughts:** Strong, cheap spine. Add a twin line **points won on receive** (same fields) so Overview is symmetric — otherwise serve bias sneaks in.

**Verdict:** Keep all three; add receive twin.

---

## 2. Serves (player POV)

Your buckets are the right *idea* (early-point taxonomy). Definitions need sharpening so they don’t overlap.

### Proposed crisp taxonomy (mutually exclusive on *player’s serve points*)

| Your label | Proposed definition | Metric | Fields | Verdict |
|------------|---------------------|--------|--------|---------|
| Direct Errors (Faults) | Point ends on shot 1 with `error_net` / `error_long` | Fault count + % of serves | `point_ending`, last `shot_index`, `server_id` | **Keep.** Already derivable (`service_fault`). |
| Won with serve | **Ambiguous in sketch.** Prefer rename → **Receive miss / fail to return**: ends on shot 2, error ending, server wins | Count + % | same + `winner_id` | **Keep** under this crisp name. Classic coaching. |
| Opponent Failed to return | Parenthetical (“shot is not the first attacking shot, server won”) is **too broad** — includes long no-attack rallies and 3rd-ball wins. Overlaps “Won with serve” and Initial Offence. | — | — | **Reshape or cut.** Fold true fail-to-return into row above. Optional later: **No-attack serve win** (`first_attack_index == null`, server wins, end > 1). |
| Lost to immediate attack | Receive **is** first attack (`first_attack_index == 2`), receiver is attacker, **receiver wins** | Count + % of serves (or of immediate-attack serves) | `first_attack_index`, shot `player_id` at FOS, `winner_id` | **Keep.** Do **not** require “forcing error” as a tag — winner is enough. Optional split: ended on attack (winner/lucky) vs later error by server. |
| Won against immediate attack | Receive is first attack, **server wins**, typically via receiver error (or later server winner) | Count + % | same + `point_ending` | **Keep.** Prefer: “server won after receive attack” then optional sub-split error vs winner. |

**Thoughts:**

- Almost this whole card is **derived** from contacts + server + FOS + ending + winner. No stroke, placement, Safe/Agro required.
- “Forcing error” language is coaching gloss; we do **not** tag forced/unforced. Don’t invent a field for it.
- Missing twin on this card: **3rd-ball attack by server** rate (that lives partly in Initial Offence — link, don’t duplicate).

**Verdict:** Keep 4 exclusive rows: Fault · Receive miss · Lost to imm. attack · Won vs imm. attack. Park “failed to return (broad)” and “won with serve (vague)”.

---

## 3. Initial Offence (per player)

| Bucket | Definition | Metric | Fields | Verdict |
|--------|------------|--------|--------|---------|
| None | `first_attack_index == null` | Share of points; win rate when none | FOS null, `winner_id` | **Keep.** |
| Receive (2nd ball) | FOS == 2 | Count; **attacker win rate** | FOS, attacker `player_id`, `winner_id` | **Keep.** |
| 3rd ball | FOS == 3 | same | same | **Keep.** Core coaching. |
| 4th ball | FOS == 4 | same | same | **Keep.** |
| 5th ball | FOS == 5 | same | same | **Keep**, but rare — merge with 6+ if N is tiny. |
| (missing) 6+ | FOS ≥ 6 | same | same | **Add** as catch-all. |
| Did initial attacker win? | Cross-cut on every bucket | Win% for attacker of FOS shot | FOS + winner | **Keep** — this is the money column. |

**“Success / not success” on receive attack:** Define **success = initial attacker won the point** (eventual). Optionally add **immediate**: point ended on the attack shot (winner / error / lucky). Two columns, same fields.

**Thoughts:**

- Again mostly **derived**. Stroke only needed if you show *how* they attacked (loop vs flick vs push).
- Strong card. One table: rows = FOS ball #, columns = count | share | attacker win% | ended-on-attack%.

**Verdict:** Keep table; add 6+; define success as point win (+ optional immediate).

---

## 4. Point ends → End shot (iter 2 upgrade)

The **last contact** should carry enough to coach *how* and *why* the point died — not just net vs long.

### 4a. What to tag on the end shot

| Layer | Choices (draft) | Applies to | Thoughts |
|-------|-----------------|------------|----------|
| **Outcome** | winner · (lucky) · in-net · missed long · missed wide | Every scoring rally | Expand today’s `point_ending`. **Wide is new and worth it.** Keep `lucky` as optional/advanced, not hero. |
| **Wing** | FH · BH | Almost every end (incl. serve fault) | Already on shots; **require on end shot**. |
| **Shot (stroke)** | flick / loop / drive / smash / lob / block / push / chop (serve fault: stroke N/A OK) | End shot | Makes errors/winners-by-stroke real. Justifies push/chop on the end ball. |
| **Reason** | see 4b | **Errors primarily** (net/long/wide). Skip or optional on clean winners. | High value; refine enum before forcing save. |

### 4b. Reason taxonomy — refine (do not ship the raw list as-is)

Your seeds: technical · positioning · risk level · footwork · positioning · timing/late to ball · tactical.

| Item | Issue |
|------|--------|
| positioning ×2 | Duplicate — one bucket. |
| risk level | Not a *miss reason*. **Safe/Agro** = character of the shot *as played* (percentage vs high-risk), not psychology and not parked — **Pass 1 on FOS**. Separate from reason enum. |
| technical vs footwork vs timing | Often stacked on one miss. Pass-1 = **one primary** pick, not a checklist. |
| tactical | Wrong *choice* vs execution — keep as one option beside execution causes. |

**Proposed layers**

1. **Outcome** (always): `winner | lucky | error_net | error_long | error_wide`
2. **Attempt** (always on end): `wing` + `stroke` (stroke N/A on serve-only fault OK)
3. **Safe / Agro** (Pass 1 on FOS): shot character as played — *not* a miss reason
4. **Primary miss reason** (errors only, single choice):

| Reason | Means |
|--------|--------|
| `technical` | Bat angle / contact / spin read — hand skill miss |
| `timing` | Early or late to the ball |
| `footwork` | Didn’t move / wrong recovery step |
| `positioning` | Stood in the wrong place before the ball |
| `tactical` | Wrong shot or wrong target for the situation |

**Later / study:** opponent pressure / forced, equipment, mental, multi-reason.

### 4c. Cards this unlocks

| Card | Question | Metric | Fields | Verdict |
|------|----------|--------|--------|---------|
| Ending mix | How do points die? | winner / lucky / net / long / **wide** | expanded `point_ending` | **Keep + add wide.** |
| Own errors by phase | Where in the rally do I miss? | Errors × phase of last shot | ending + FOS + index | **Keep.** |
| Errors by wing × stroke | What shot am I missing? | Count / % | end wing + stroke + error | **Add** — honest replacement for vague shot success rates. |
| Winners by wing × stroke | What finishes points? | Count / % | same on winners | **Add** (thin). |
| Miss reasons | Why am I missing? | Reason share (± phase/stroke) | `point_miss_reason` (name TBD) | **Add once enum locked.** |

**Verdict:** End-shot package is now a first-class mandatory cluster. Retract earlier “net/long enough / cut missed-winner story” for this layer — **winner + net + long + wide** with wing/stroke is in; reason in-direction pending enum lock.

---

## 5. Shot success rates (“etc.”)

| Idea | Question | Needs | Verdict |
|------|----------|-------|---------|
| Global stroke success on every contact | Loop win% etc. | stroke on many shots | **Still overkill.** |
| **End-shot** wing × stroke × outcome | What am I missing / finishing with? | end wing + stroke + ending | **In via §4** — this is the right scope. |
| First-attack stroke mix | What do they open with? | stroke on FOS | Optional later card. |
| Safe vs Agro outcomes | Intent vs result | safe/agro | Optional; separate from miss reason. |

**Verdict:** No all-contact success board. End-shot board yes.

---

## Missed (would help a player)

1. **Receive POV early breakdown** (mirror of Serves): receive fault / fail, serve+1 pressure, own immediate attack win/loss. Same fields as Serves; different filter (`receiver_id`). Huge coaching value; almost free.
2. **Points won on receive** in Overview (symmetry).
3. **Who initiates offence** — share of FOS by server vs receiver + win% when *you* initiate. Derived. Answers “do I start or wait?”
4. **Immediate conversion** on FOS (ended on attack) vs **eventual** win — you asked “did attacker win”; coaches also ask “did the attack finish it?”
5. **Serve patterns × outcome** (spin / short-half-long / BH-middle-FH) — high coaching value, **slow to tag** → **study**, not pass-1 mandatory.
6. **After first attack** — held / lost initiative (needs `shot_initiative` on reply). Your sketch jumps to Point ends; initiative is the natural bridge. Candidate: one small card or study.
7. **Set-by-set** serve/receive win% — same fields, sliced by set. Helps “fell off in set 3”.
8. **Error by phase** (serve / receive / attack / continuation) — fits under Point ends.
9. **End-shot package** (iter 2): outcome incl. wide · wing · stroke · primary miss reason — see §4. This is now a first-class Match Review need, not an afterthought.

Still not missing for v1: player-type menus, anti, placement everywhere, ups, initiative *quality*.

---

## Overkill (cut or defer)

| Item | Why |
|------|-----|
| Broad “Opponent failed to return” | Overlaps; unclear; inflates serve wins that are really 3rd-ball/rally. |
| Forced vs unforced language as data | Not tagged; don’t invent. |
| Full shot success rates on *every* contact | Tagging cost ≫ value; **end-shot** wing/stroke + outcome is the right scope instead. |
| Multi-select miss reasons | Too slow live; one primary reason. |
| Risk level inside the reason enum | Wrong axis — keep as Safe/Agro (or end risk), separate from why. |
| Forced/unforced as its own field | Still don’t invent; tactical/pressure can wait. |
| Separate full cards for every ball 2–5 with stroke breakdowns | One Initial Offence **table** is enough. |
| Initiative *quality* / ups / multi-reason on Match Review v1 | Deeper than Pass 1; study later. (Safe/Agro + initiative standing are Pass 1.) |
| Rally placement (BH/Middle/FH) on live pass | Study. |
| Lucky as its own coaching card | Keep in ending mix; no hero card. |

---

## Data requirements map (union)

### Pass-1 floor (derived spine — still required)

| Field | Used by |
|-------|---------|
| Contacts (`shot_index`, times, `player_id`) | Everything |
| `server_id` / `receiver_id` | Overview, Serves, Receive twin, who initiates |
| `winner_id`, `is_scoring` | All win rates |
| `first_attack_index` | Serves imm. attack, Initial Offence, who initiates |
| `point_ending` (expand with `error_wide`) | Faults, receive miss, point ends |
| Set scores / winners | Overview |

### New — end-shot cluster (iter 2; coaching-critical)

| Field | Where stored (draft) | Used by | Mandatory? |
|-------|----------------------|---------|------------|
| Expanded ending incl. **wide** | Rally `point_ending` | Ending mix, fault defs | **Yes — pass-1** |
| **Wing on end shot** | Last `DBShot.shot_wing` | Errors/winners by wing | **Yes — pass-1** |
| **Stroke on end shot** | Last `DBShot.shot_stroke` (N/A on bare serve fault if we allow) | Errors/winners by stroke | **Yes — pass-1** (except serve-fault exception) |
| **Primary miss reason** | New rally field *or* last-shot field, e.g. `point_miss_reason` | Miss reason card | **Direction yes; lock enum before forcing save** |
| End risk safe/agro | Reuse quality or end-only flag | Risk × miss | **Optional** — not inside reason |

### Still optional / not forced by these cards

| Field | Useful for |
|-------|------------|
| Wing/stroke on FOS (non-end) | Opener mix |
| Serve spin/depth/placement | Serve pattern study |
| Safe/Agro on first attack | Pass 1 — shot character card |
| Initiative on reply | Held/lost initiative |
| Rally placement | Placement study |
| Forced/unforced | **Do not add** |

### Phase A vs this

- **Push/chop** now also justified by **end-shot stroke** (not only menus).
- **Safe/Agro** is Pass 1 on FOS (shot character). End-ball Safe/Agro still optional.
- End truncate remains hygiene.
- Hide non-serve placement unchanged (study).

---

## Pass-1 mandatory vs optional vs study (iter 2 draft)

**Pass-1 mandatory:**  
contacts · server/receiver · winner · first_attack_index · **expanded `point_ending` (+ wide)** · **end-shot wing** · **end-shot stroke** (serve-fault exception OK) · scoring · set scores.

**Pass-1 pending enum lock (treat as in-scope, don’t implement until names stick):**  
**primary miss reason** on errors only — `{ technical, timing, footwork, positioning, tactical }`.

**Optional:**  
wing/stroke on non-end shots beyond what’s already shown · serve spin/depth/placement emphasis · lucky · end-ball Safe/Agro

**Study:**  
rally placement · deep serve matrices · initiative *quality* / ups · multi-reason / pressure · stroke success beyond the end shot

**Pass 1 also includes:** FOS Safe/Agro · initiative after FOS · miss reason · end wing/stroke · wide — see gap table (no separate 1b/2).

---

## Proposed Match Review card list (iter 2)

**Match**

1. Score overview (match + sets)
2. Points won (total · on serve · on receive)

**Player POV**

3. Serve early outcomes (Fault · Receive miss · Lost imm. attack · Won vs imm. attack)
4. Receive early outcomes (mirror of 3)
5. Initial offence table (None / 2 / 3 / 4 / 5 / 6+ × attacker win% × ended-on-attack%)
6. Who initiates (server vs receiver share + win% when you initiate)
7. Ending mix (winner / lucky / net / long / **wide**; own errors by phase)
8. **End shot: errors & winners by wing × stroke**
9. **Miss reasons** (once enum locked)

**Deferred off Match Review v1**

- Full stroke boards on every contact  
- Initiative held/lost  
- Serve pattern × placement boards  
- Deep serve / placement studies (Safe/Agro + initiative standing are Pass 1, not deferred)

---

## Next B-loop step

Confirm or edit:

1. Outcome set: add **missed wide**; keep lucky?  
2. End shot always requires **wing + stroke** (stroke skipped only on serve fault)?  
3. Miss reason enum: `technical | timing | footwork | positioning | tactical` — rename/add/cut?  
4. Reason **errors only**, single primary — agree?  
5. Risk/Safe-Agro **separate** from reason — agree?  
6. Earlier open items still open: serve row names · receive mirror · who initiates · Initial Offence success def.

Then lock enum → update plan B outcomes again → only then schema/UI work (not inside this B note loop).
