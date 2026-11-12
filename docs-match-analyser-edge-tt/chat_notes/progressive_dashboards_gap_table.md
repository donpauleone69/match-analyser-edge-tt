# Progressive dashboards — Match Review

Date: 2026-11-11  
Mode: `/chat` / B-loop — notes only.

Related: [`dashboard_field_matrix.md`](dashboard_field_matrix.md), [`progressive_dashboard_framework.md`](progressive_dashboard_framework.md).

---

## Why this approach

**Goal:** The most valuable dashboards from the easiest first-pass input.

**Effort isn't just clicks.** Some single clicks mean rewatching the rally. Cost = how hard an input is to answer while watching.

**Rally Focus is the Pass 1 baseline.** For each input: is it high value (a dashboard needs it), low value or redundant (remove it), or detail only (move it to Pass 2)?

**Pass 2 is a detail run.** A second run through the same video that adds extra inputs, unlocking more detailed dashboards. Only done when that detail is wanted.

**That's why every section lists its data.** It shows which inputs earn a place in Pass 1.

---

## How to read this

| Level | Meaning |
|-------|---------|
| **Dashboard** | Match Review page |
| **Section** | A group of cards answering one big question |
| **Card** | Related rows that tell one story |
| **Row** | One number in a card (count, %, or score) |

**Template:** Section A is the model for every section — question, story, layout, cards (each with a one-line story and rows), notes, data needed, shortlist.

**Passes:** Pass 1 fills the core sections. Pass 2 (detail run) unlocks detailed dashboards, shown locked until the extra inputs exist.

---

# Dashboard: Match Review

---

## Section A — Match Story

**The question:** Why did the match end with this score?

**The story:** This section explains the result before you get into tactics. It starts with the score. Then it shows how points were lost and won: who missed more, who finished more, and who was gifted points. Then it shows who took the initiative by attacking first, and whether that paid off. Last, it shows when in the rally each player won their points. Read together, the cards should explain why the scoreline went the way it did, for example "won because they attacked first and converted" or "lost because they kept missing".

**Layout (all cards):** Hero on the left, row label in the middle, Villain on the right. Each row compares the two players on the same thing.

### Card A1 — The score

*Story: Who won, by how much, and who held their serve.*

| Row | What it shows |
|-----|---------------|
| Match & set scores | The final score of the match and each set. |
| Total points won | How many points each player took. |
| Points won on serve (n, %) | How often each player won the point when they were serving. |

### Card A2 — How points ended

*Story: Who threw points away, who earned them, and who was handed them.*

| Row | What it shows |
|-----|---------------|
| Errors (n, %) | Points thrown away. The player hit the last ball and it went in the net, long or wide. Shown as a share of all points. |
| Winners (n, %) | Points finished with a clean winner. Shown as a share of all points. |
| Points from opponent error (n, %) | Of the points a player won, how many the opponent gave them by missing. A high number means they're winning on the other player's mistakes, not their own shots. |

### Card A3 — Who attacks

*Story: Who takes the initiative, whether they take it when they can, and whether it pays off.*

| Row | What it shows |
|-----|---------------|
| First aggressive shot (n, %) | How often this player made the first attacking shot of the rally. |
| Win% when I initiate (n, %) | When they did attack first, how often they won the point. |
| Receive without attacking (n, %) | Of the serves that landed, how often they returned without attacking. |
| Attack at first opportunity (n, %) | How often they attack the first ball they could have attacked. On receive that's the return. On serve it's the third ball, but only if the receiver didn't attack first. Points where the opponent attacked first don't count. |

### Card A4 — When points are won

*Story: Where in the rally each player wins: before anyone attacks, on the attack itself, or in the exchange after it.*

Each player's points won, split four ways. The four rows add up to 100%.

| Row | What it shows |
|-----|---------------|
| Won without FOS (n, %) | Nobody attacked in the rally. |
| Won on FOS (n, %) | The rally ended on the first attacking shot. |
| Won within FOS+3 (n, %) | The rally ended one to three shots after the first attack. |
| Won in continuation (n, %) | The rally went on more than three shots after the first attack. |

### Worth knowing

- **Errors** are not "unforced errors". We don't tag whether a miss was forced.
- A lucky net or edge doesn't count as a winner.
- There's no "points won on receive" row. Your receive points are the opponent's serve points you won, so their serve row already shows them.

### Data needed for Section A

No stroke, wing, Safe/Agro, initiative, or placement. `winner_id` is stored from the ending plus who hit last (not typed by hand). `receiver_id` is the non-server. `error_wide` is planned on `point_ending` and not in the DB yet.

| Table | Field | How it gets there | Used by |
|-------|--------|-------------------|---------|
| `sets` | `player1_score_final`, `player2_score_final`, `winner_id` | End of set, or from rally scores | Match & set scores |
| `matches` | `winner_id` | When the match is complete | Match & set scores |
| `rallies` | `is_scoring` | Rally saved as a point | Every rate |
| `rallies` | `server_id` | Server pill / service order | Serve hold; attack at first opportunity |
| `rallies` | `receiver_id` | Other player from `server_id` | Receive without attacking; attack at first opportunity |
| `rallies` | `winner_id` | From ending + last hitter | Points, serve, free points, win% when initiating, Won rows |
| `rallies` | `point_ending` | Ending pill. Today: winner, lucky, error_net, error_long | Errors, winners, free points |
| `rallies` | `first_attack_index` | FOS mark, or null for no attack | First attack, win% when initiating, receive, first opportunity, Won rows |
| `rallies` | `player1_score_after`, `player2_score_after` | As points are saved | Scores if set finals are not entered |
| `shots` | `shot_index`, `player_id` | Contact taps; who hit from server + index | Length, last hitter, who attacked |

### Shortlist (not in this section)

| Comparison | Left off because |
|------------|------------------|
| Immediate attack on receive | Same fact as receive-without-attacking, flipped |
| Lost on serve to immediate attack | Covered by Section B |

---

## Section B — Serve

**The question:** Is my serve effective? Does it win points, force mistakes and set up my attack, or does it get punished?

**Layout:** Hero on the left, row label in the middle, Villain on the right. Each side shows that player's own serve points.

B1, B2 and B3 split every serve point between them, so their three totals add up to 100%. Each card shows its total at the top. Splitting misses into net, long and wide shows *how* a serve or return is missing, which points to what to fix.

### Card B0 — Serve summary

*Story: The headline on my serve. Is it working, and where is it leaking points?*

| Row | What it shows |
|-----|---------------|
| Serve worked / punished / neutral (%) | The three totals from B1–B3 side by side. |
| Faults (n, %) | Points given away before the opponent touched the ball. |
| Opponent attacked my serve (%, missed %) | How often they attack it, and how often that attack misses. |
| I attacked first (%, won %) | How often my serve sets up my attack, and whether I convert. |

**Conclusion line (auto):** *"Your serve worked 48% of the time. It was attacked 30% of the time, and they missed 4 in 10 of those. You faulted 3 times."*

### Card B1 — Serve worked (total %)

*Story: My serve won the point, forced a bad return, or set up my attack.*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Opponent missed a passive return (n, %, net / long / wide) | They tried to just get the ball back and couldn't. | **Tap** serve + return. **Pill** In-net, Long or Wide on the return. No first attack marked. |
| Opponent attacked my serve and missed (n, %, net / long / wide) | They went for it and missed. The serve forced a poor attack. | **Tap** serve + return. **Mark** first attack on the return. **Pill** In-net, Long or Wide. |
| I attacked first (n, %, won %) | My serve set up my attack, on the third ball or later. | **Mark** first attack on one of my shots. Won % comes from the ending. |

### Card B2 — Serve punished (total %)

*Story: I gave the point away, or my serve was attacked.*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| I faulted (n, %, net / long / wide) | My serve missed. | **Tap** serve only. **Pill** In-net, Long or Wide on the serve. |
| Opponent attacked my serve for a winner (n, %) | Their return attack won the point outright. | **Mark** first attack on the return. **Pill** Winner. |
| Opponent attacked my serve, rally went on (n, %, won %) | They attacked the serve and it came back. Won % shows whether I survived it. | **Mark** first attack on the return. Won % comes from the final ending. |

### Card B3 — Neutral (total %)

*Story: Points where my serve neither won nor lost the advantage.*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Opponent attacked later (n, %, won %) | They made the first attack, but after the return. | **Mark** first attack on one of their later shots. |
| No attack (n, %, won %) | Nobody attacked. | **No attack** chosen. |
| Lucky net or edge (n, %) | The serve or return was decided by a net or edge. | **Pill** Lucky on the serve or return. |

Serve length analysis has moved to **Advanced Serve Receive** at the end of the document (Pass 2).

### Data needed for Section B

| Table | Field | How it gets there | Used by |
|-------|-------|-------------------|---------|
| `rallies` | `is_scoring`, `server_id`, `receiver_id` | Point saved; server pill | All |
| `rallies` | `winner_id` | From ending + last hitter | Won % |
| `rallies` | `point_ending` | Ending pill: winner, lucky, in-net, long, wide. **Wide not in the DB yet** | B0 faults and attack missed; every ending row |
| `rallies` | `first_attack_index` | First attack mark, or no attack | B0–B3 |
| `shots` | `shot_index`, `player_id` | Contact taps | Who attacked, point length |

### Input value check

| Input | Value | Capture | Verdict |
|-------|-------|---------|---------|
| Extended ending (+ Wide) | High | Easy | Pass 1. Add Wide |
| Serve length | High | Easy | Pass 2 (Advanced Serve Receive) |
| Serve spin | Medium | Hard to spot | Pass 2 |
| Serve placement | Medium | Hard to spot | Pass 2 |
| Weak / High / Heavy on serve | Low | Judgement call | Drop Weak and Heavy. High stays on trial for Section E |

---

## Section C — Receive

**The question:** How do I choose to receive, attack or passive, and how well does each work?

**Layout:** Hero on the left, row label in the middle, Villain on the right. Each side shows that player's own receive points.

The return is read through the receiver's own choice. Points not decided by the return (opponent faulted, lucky net or edge on the serve) are left out of C2 and C3 and shown as one small count in C1.

### Card C1 — Receive summary

*Story: My receive in a few lines: how often I attack, how often I miss, and what happens when I don't attack.*

| Row | What it shows |
|-----|---------------|
| Attacked the return (n, %) | Share of my receives where I attacked. |
| Passive return (n, %) | Share where I just got the ball back. |
| Missed when attacking (%) | Of my attacked returns, how many missed. |
| Missed when passive (%) | Of my passive returns, how many missed. |
| Server attacked after my passive return (%) | How often a passive return handed them the attack. |
| Won % (attack vs passive) | Point win rate after each choice. |
| Not decided by my return (n) | Opponent faulted, or lucky net or edge on the serve. |

**Conclusion line (auto):** *"You attacked 35% of returns and missed 4 in 10 of those. Passive returns let the server attack first 55% of the time. You won 52% after attacking, and 38% after a passive return."*

### Card C2 — When I attack the return

*Story: Is attacking the return paying off, or am I missing too much?*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Winner (n, %) | My return attack won the point outright. | **Mark** first attack on the return. **Pill** Winner. |
| Missed (n, %, net / long / wide) | My return attack missed. | **Mark** first attack on the return. **Pill** In-net, Long or Wide. |
| Rally went on (n, %, won %) | It came back. Won % shows whether I kept the advantage. | **Mark** first attack on the return. Won % comes from the final ending. |

### Card C3 — When I return passively

*Story: Does my passive return keep me safe, or hand the server the attack?*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Missed (n, %, net / long / wide) | I couldn't get the ball back. | **Tap** serve + return. **Pill** In-net, Long or Wide. No first attack marked. |
| Server attacked next (n, %, won %) | My return let them attack. | **Mark** first attack on one of their shots. |
| I attacked later (n, %, won %) | I took the attack later in the rally. | **Mark** first attack on one of my later shots. |
| No attack (n, %, won %) | Nobody attacked. | **No attack** chosen. |

### Data needed for Section C

Same fields as Section B. No new inputs.

| Table | Field | How it gets there | Used by |
|-------|-------|-------------------|---------|
| `rallies` | `is_scoring`, `server_id`, `receiver_id` | Point saved; server pill | All |
| `rallies` | `winner_id` | From ending + last hitter | Won % |
| `rallies` | `point_ending` | Ending pill: winner, lucky, in-net, long, wide. **Wide not in the DB yet** | Missed rows; winner; not-decided count |
| `rallies` | `first_attack_index` | First attack mark, or no attack | Attack vs passive; who attacked next |
| `shots` | `shot_index`, `player_id` | Contact taps | Who attacked, point length |

### Input value check

No new inputs. Section C reuses Section B's inputs.

---

## Section D — My first attack

**The question:** Is my first attack working for me?

**The story:** When do I attack, how often, and with what? Was it a Safe attack, and does it hold? Then what happens next: I win on it, lose on it, win on their reply, or the rally goes on. If it goes on, who has the initiative and who wins? Read together, this should say "attack more", "attack earlier", or "your attack is too safe, they take it over".

**Layout:** Hero on the left, row label in the middle, Villain on the right. Each side shows that player's own first attacks.

**Initiative pills** (Behind, Level, Ahead) are from the point of view of the player hitting that shot. On the reply to my attack, Behind means they're still under pressure, so I kept the initiative.

### Card D0 — First attack summary

*Story: How often I attack first, and whether it pays off.*

| Row | What it shows |
|-----|---------------|
| I attacked first (n, %) | Share of points where I made the first attack. |
| Attack at first opportunity (%) | How often I attack the first ball I could have attacked. |
| Most common timing | Which ball I usually attack on: return, third ball, or later. |
| Missed the attack (%) | Of my first attacks, how many went straight out. |
| Kept the initiative (%) | Of attacks that came back, how often they were still Behind after their reply. |
| Won % when I attack first | Point win rate on rallies where I attacked first. |

**Conclusion line (auto):** *"You attacked first in 45% of points, mostly on the third ball. 1 in 4 attacks missed. When it came back, you kept the initiative 60% of the time, and you won 58% of the points you opened."*

### Card D1 — When I attack

*Story: Do I attack early or wait, and which timing works?*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| On the return (n, %, won %) | I attacked their serve. | **Mark** first attack on shot 2. |
| Third ball (n, %, won %) | I attacked straight after my serve. | **Mark** first attack on shot 3. |
| Fourth ball or later (n, %, won %) | I waited, then attacked. | **Mark** first attack on shot 4 or later. |
| Opponent attacked first (n, %) | I never got the first attack. See Section E. | **Mark** first attack on one of their shots. |

### Card D2 — What I attack with

*Story: Which attacking shots I use, and which ones work.*

One row per wing and stroke used, for example FH Loop, BH Flick, FH Drive.

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Wing + stroke (n, Safe %, missed %, won %) | How often I open with it, how often it's Safe, how often it misses, and how often I win the point. | **Pill** BH or FH and the stroke on the first attack. |

### Card D3 — Safe or not

*Story: Am I playing the opening attack too safely, and do they take it over?*

One toggle. On = Safe. Off = a normal attack.

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Safe attacks (n, %, missed %, won %) | Controlled attacks, and how they turn out. | **Toggle** Safe on the first attack. |
| Normal attacks (n, %, missed %, won %) | Attacks not marked Safe. | Safe left off. |
| Safe, and they took over (n, %) | A Safe attack the opponent counter-attacked. The "too safe" signal. | Safe + **Pill** Ahead on their reply. |

### Card D4 — What happened next (total 100%)

*Story: Did I win on my attack, on their reply, later, or did they turn it round?*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Won on the attack (n, %) | My attack was a winner. | **Pill** Winner on the first attack. |
| Missed the attack (n, %, net / long / wide) | I lost the point straight away. | **Pill** In-net, Long or Wide on the first attack. |
| They missed the reply (n, %) | I won on the next ball. | **Pill** In-net, Long or Wide on their reply. |
| Their reply won the point (n, %) | They counter-hit a winner. | **Pill** Winner on their reply. |
| Rally went on, I kept the initiative (n, %, won %) | They only got it back. | **Pill** Behind on their reply. |
| Rally went on, level (n, %, won %) | Their reply neutralised my attack. | **Pill** Level on their reply. |
| Rally went on, they took over (n, %, won %) | Their reply turned the rally round. | **Pill** Ahead on their reply. |

Lucky nets and edges are counted on their own and left out of these rows.

### Data needed for Section D

| Table | Field | How it gets there | Used by |
|-------|-------|-------------------|---------|
| `rallies` | `first_attack_index`, `server_id`, `winner_id`, `point_ending` | As in Sections A–C | All |
| `shots` | `shot_index`, `player_id` | Contact taps | Who attacked, the reply |
| `shots` | `shot_wing`, `shot_stroke` (first attack) | Pills on the first attack | D2 |
| `shots` | `shot_is_safe` (first attack) | Safe toggle. Default false. **Replaces Good / Normal / Poor** | D3 |
| `shots` | `shot_initiative` (reply) | Behind, Level or Ahead on the reply | D0, D3, D4 |

### Input value check

| Input | Value | Capture | Verdict |
|-------|-------|---------|---------|
| First attack wing + stroke | High (D2) | Easy | Pass 1 |
| Safe toggle on the first attack | High (D3) | Judgement call, clear cases only | Pass 1 |
| Initiative on the reply | High (D0, D3, D4) | Judgement call | Pass 1 |
| Initiative on the shot after the reply | Low | Judgement call | Drop. The reply already tells the story |
| Over / Off table on the attack | Low | Judgement call | Drop |

---

## Section E — When they attack first

**The question:** When my opponent attacks first, how do I respond, and do I get back into the point?

**The story:** Where do they attack me, and did I hand them the chance with a high ball? What do I reply with, and does it work? Do I lose straight away, get it back but stay behind, or turn it round?

**Layout:** Hero on the left, row label in the middle, Villain on the right. Each side shows the points where the *other* player attacked first.

### Card E0 — Defending summary

*Story: How often I'm on the back foot, and how often I survive it.*

| Row | What it shows |
|-----|---------------|
| They attacked first (n, %) | Share of points where the opponent attacked first. |
| I gave them a high ball (%) | How often the ball before their attack was marked High. |
| Lost straight away (%) | Their attack won, or I missed my reply. |
| Turned it round (%) | My reply was a winner, or I was Ahead after it. |
| Won % when they attack first | Point win rate on rallies where they attacked first. |

**Conclusion line (auto):** *"They attacked first in 55% of points, and 1 in 3 of those came off a high ball from you. You lost 40% straight away, turned 15% round, and won 35% overall."*

### Card E1 — Where they attack me

*Story: Which of my balls gets attacked, and whether I handed them the chance.*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| They attacked my serve (n, %, won %) | Their return was an attack. | **Mark** first attack on shot 2. |
| They attacked my return (n, %, won %) | A third-ball attack off my receive. | **Mark** first attack on shot 3. |
| They attacked later (n, %, won %) | They attacked on shot 4 or later. | **Mark** first attack on shot 4 or later. |
| Off a high ball from me (n, %, won %) | My ball before their attack sat up. | **Toggle** High on the ball before the attack. |

### Card E2 — How I responded (total 100%)

*Story: Did I lose on their attack, on my reply, survive, or take over?*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Their attack won (n, %) | I couldn't get it back. | **Pill** Winner on their first attack. |
| Their attack missed (n, %) | I won without replying. | **Pill** In-net, Long or Wide on their first attack. |
| I missed my reply (n, %, net / long / wide) | I got a bat on it but missed. | **Pill** In-net, Long or Wide on my reply. |
| My reply won the point (n, %) | A counter winner. | **Pill** Winner on my reply. |
| Rally went on, still behind (n, %, won %) | I got it back but stayed under pressure. | **Pill** Behind on my reply. |
| Rally went on, level (n, %, won %) | I neutralised their attack. | **Pill** Level on my reply. |
| Rally went on, I took over (n, %, won %) | I turned the rally round. | **Pill** Ahead on my reply. |

### Card E3 — What I reply with

*Story: Which replies hold up against their attack, and which let me take over.*

One row per wing and stroke used on my reply, for example BH Block, FH Loop, BH Chop.

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Wing + stroke (n, missed %, took over %, won %) | How often I use it, how often it misses, how often it puts me Ahead, and how often I win the point. | **Pill** BH or FH and the stroke on my reply. |

### Data needed for Section E

| Table | Field | How it gets there | Used by |
|-------|-------|-------------------|---------|
| `rallies` | `first_attack_index`, `server_id`, `winner_id`, `point_ending` | As in Sections A–C | All |
| `shots` | `shot_index`, `player_id` | Contact taps | Who attacked, my reply |
| `shots` | `shot_is_high` (ball before the attack) | High toggle | E0, E1 |
| `shots` | `shot_initiative` (my reply) | Behind, Level or Ahead | E0, E2, E3 |
| `shots` | `shot_wing`, `shot_stroke` (my reply) | Pills on the reply. **Needs Push and Chop** | E3 |

### Input value check

| Input | Value | Capture | Verdict |
|-------|-------|---------|---------|
| High on the ball before the attack | To be proven (E0, E1) | Judgement call, quick | Pass 1 on trial. Keep High, drop Weak and Heavy |
| Reply wing + stroke | High (E3) | Easy | Pass 1 |
| Push / Chop strokes | Medium (E3, F2) | Easy | Pass 1 |

---

## Section F — How points finish

**The question:** Can I finish points, and can I survive when they're finishing?

**The story:** Which shots win me points, and which lose them? At what stage of the rally? When the opponent is in control, do I scramble back or just lose the point? Read together, this says whether I'm a finisher, a scrambler, or giving points away, and why I miss.

**Layout:** Hero on the left, row label in the middle, Villain on the right.

Lucky nets and edges are not winners or errors. They're shown as one count in F0.

### Card F0 — Finishing summary

*Story: Do I end points on my terms?*

| Row | What it shows |
|-----|---------------|
| Winners vs errors (n, ratio) | Points I finished against points I gave away. |
| Best finishing shot | The wing and stroke with the most winners. |
| Most costly shot | The wing and stroke with the most errors. |
| Main miss reason | The most common reason for my errors. |
| Won while behind (%) | Points I won after being behind on the initiative. |
| Lucky (n) | Points decided by a net or edge. |

**Conclusion line (auto):** *"You hit 14 winners and made 22 errors, mostly timing. FH Loop finished 8 points, and BH Block gave away 7. You won 1 in 4 points where you were behind."*

### Card F1 — When points end

*Story: At what stage do I win and lose, and is it by winners or errors?*

Columns: my winners · my errors · their winners · their errors.

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Before any attack | Serve, receive and push rallies. | **No attack**, or the end comes before the first attack. Ending pill. |
| On the first attack | The point ended on the attack. | The end is on the first attack. |
| On the reply | The point ended one shot after the attack. | The end is on the reply. |
| In the exchange | The point ended two or more shots after the attack. | The end is later. |

### Card F2 — My end shots

*Story: Which shots finish points for me, and which give them away.*

One row per wing and stroke on the last shot I hit.

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Wing + stroke (winners, errors net / long / wide, ratio) | Finishers against leakers. | **Pill** BH or FH and the stroke on the end shot. **Asked on every end shot**, whatever phase it's in. |

### Card F3 — Under pressure

*Story: When they're in control, do I scramble back or just lose the point?*

"Behind" means they attacked first and I was Behind after my reply, or they took over after mine.

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Behind, they finished (n, %) | They hit a winner while ahead. | Initiative + **Pill** Winner on their shot. |
| Behind, I missed (n, %) | I made an error under pressure. | Initiative + error on my shot. |
| Behind, I scrambled back and won (n, %) | I won from behind. | Initiative + who won. |

### Card F4 — Why I missed

*Story: What kind of error am I making?*

| Row | What it shows | How captured |
|-----|---------------|--------------|
| Technical (n, %) | Bad stroke. | **Pill**, one pick, on error endings only. |
| Timing (n, %) | Too early or too late. | Same. |
| Footwork (n, %) | Didn't get to the ball. | Same. |
| Positioning (n, %) | In the wrong place before the shot. | Same. |
| Tactical (n, %) | Wrong shot choice. | Same. |

### Data needed for Section F

| Table | Field | How it gets there | Used by |
|-------|-------|-------------------|---------|
| `rallies` | `point_ending`, `winner_id`, `first_attack_index` | As in Sections A–C | All |
| `shots` | `shot_wing`, `shot_stroke` (end shot) | Pills on the end shot | F0, F2 |
| `shots` | `shot_initiative` (reply) | Reply pill | F0, F3 |
| `rallies` | `point_miss_reason` | Pill after an error. **Not in the DB yet** | F0, F4 |

### Input value check

| Input | Value | Capture | Verdict |
|-------|-------|---------|---------|
| End shot wing + stroke | High (F0, F2) | Easy | Pass 1, asked on every end shot |
| Wing + stroke on shots that aren't the attack, reply or end | Low | Easy, but many clicks | Drop |
| Miss reason | High (F0, F4) | Judgement call, may need a rewatch | Pass 1 |

---

## Pass 2 detail dashboards (locked until a detail run)

| Dashboard | Story | Pass 2 inputs |
|-----------|-------|---------------|
| Advanced Serve Receive | Which serve lengths work, and how each length is received | Serve length |
| Serve types | Which spin, length and placement combinations work | Serve spin, serve placement |
| Placement | Where balls land in the rally, and what works | Rally placement |

---

## Open questions

1. **High toggle:** on trial in Pass 1. Review after a few tagged matches and drop it if E0 and E1 aren't telling us anything.

---

## Phase A (ship now)

1. Push / Chop
2. End-back truncate. **Keep the reply initiative** (D4, E2)
3. Hide non-serve placement
4. Safe toggle on the first attack (shot character as played)

**Follow-on:** add Wide ending, add miss reason, ask wing + stroke on every end shot, remove the inputs marked Remove below, and move serve length, spin and placement to Pass 2.

---

## Tagging by shot — Pass 1

What the Pass 1 Focus tagger asks on each shot. Nothing else.

| Shot | Pass 1 asks | Cards fed | Condition |
|------|-------------|-----------|-----------|
| Rally | Server, contact taps, first attack mark (or No attack), end marker, ending (Winner, Lucky, In-net, Long, Wide), miss reason on errors, Highlight | All | Every rally |
| Serve | High toggle | E0, E1 | Only when the first attack is on shot 2 |
| Before the attack | High toggle | E0, E1 | Only on the ball just before the attack |
| Before the attack (end shot) | Wing + stroke (Push, Chop, Block) | F0, F2 | When the end comes before any attack |
| First attack | Wing + stroke (Flick, Loop, Drive, Smash, Lob), Safe toggle | D2, D3, F2 | Always on the first attack |
| Reply | Wing + stroke (Block, Loop, Drive, Smash, Lob, Push, Chop), Initiative (Behind, Level, Ahead) | D0, D3, D4, E0, E2, E3, F0, F3 | Initiative only while the point continues |
| Shot after reply / later | Nothing | — | Unless it's the end shot |
| End shot (any phase) | Ending (+ Wide), wing + stroke (full list), miss reason on errors | F0, F2, F4 | Every end shot |

**Removed from Pass 1:** serve spin, length and placement; placement, length and wing before the attack; Weak and Heavy; Over / Off table; Good / Normal / Poor; Agro; initiative on the shot after the reply; wing + stroke on non-end later shots.

### Data usage count (Pass 1 rows)

Approximate rows fed out of about 100 Pass 1 rows.

| Input | Rows fed | Cards | Weight |
|-------|----------|-------|--------|
| Contact taps, server, first attack mark, ending | ~75–95 each | All | Core |
| Wide ending | ~9 | A2, B, C, D4, E2, F | Core |
| Reply initiative | ~14 | D0, D3, D4, E0, E2, E3, F0, F3 | Core |
| Safe toggle | ~3 | D3 (plus D2 Safe %) | High |
| Miss reason | ~6 | F0, F4 | High |
| End shot wing + stroke | ~3 | F0, F2 | High |
| First attack wing + stroke | 1 card | D2 (also F2 when attack ends) | High |
| Reply wing + stroke | 1 card | E3 (also F2 when reply ends) | High |
| High toggle | 2 | E0, E1 | Trial |
| Set score | 1 | A1 | Core (optional when full sets tagged) |
| Serve length / spin / placement; Weak / Heavy; Over / Off; Good / Normal / Poor; Agro; initiative after reply | 0 | — | None — remove or Pass 2 |

### Slim-down ranking (fewest rows lost)

1. Zero-row inputs — remove now.
2. High toggle — 2 rows, on trial.
3. Set score — optional when full sets are tagged.
4. First-attack / reply wing + stroke — 1 card each (F2 still works from the end shot).
5. Miss reason — 6 rows, highest effort.
6. Keep core inputs, reply initiative and Safe.

---

## Advanced Serve Receive (Pass 2)

**The question:** Which serve lengths work, and how does each player handle each length on the receive?

**Why Pass 2:** It needs serve length on every serve, which no Pass 1 section uses. Tag it in the detail run when it's wanted.

**Layout:** Hero on the left, row label in the middle, Villain on the right.

### Card — Serve length

*Story: Which lengths work for me, and how they respond to each.*

| Length | Served (n, %) | Serve worked % | Attacked it % | Their attack missed % | Won % |
|--------|---------------|----------------|---------------|-----------------------|-------|
| Short | | | | | |
| Half | | | | | |
| Long | | | | | |

**How captured:** **Pill** Short, Half or Long on the serve. Every other column reuses the Section B inputs.

### Card — Receive by serve length

*Story: Which lengths I attack, and which ones I handle well.*

| Length faced | Faced (n, %) | Attacked % | Attack missed % | Passive missed % | Won % |
|--------------|--------------|------------|-----------------|------------------|-------|
| Short | | | | | |
| Half | | | | | |
| Long | | | | | |

**How captured:** **Pill** Short, Half or Long on the serve. Every other column reuses the Section C inputs.

### Data needed

Everything Sections B and C use, plus:

| Table | Field | How it gets there | Used by |
|-------|-------|-------------------|---------|
| `shots` | `shot_depth` (shot 1) | Serve length pill | Both cards |
