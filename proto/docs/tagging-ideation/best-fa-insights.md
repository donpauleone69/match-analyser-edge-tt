# Best + FA v0.13.1: insights from the data

Canvas: [Best + FA insights](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/59552445-e705-4aa7-987c-8f67c98602a0). It has seven tabs: Top, Match, Cards, Train, Season, Model and Research.

The data model is the v0.13.1 plan in `best-fa-main-plan.md`. The plan and the comparison doc are read only and were not changed.

**The sample data is simulated.** It is a made-up but realistic season of 12 league matches and 867 rallies, ending with a 2 to 3 loss to Kim on Nov 14. Every rally was tagged exactly as v0.13.1 tags it: shots 2, 3 and 4 plus the last three, End, Point to, serve length, and Who attacked first answered about 60% of the time. Every number is computed from those tags only. A training block starts at match 7. The scratch scripts are in `/tmp/ins` (`sim.py`, `stats.py`, seed 116) and are not deliverables. No number from the sample is evidence. The sample only shows what the displays would say.

## 1. Top 5 insights

Each insight comes with its reel: the rallies behind the number, cut from the contact times.

1. **Where points are decided (three phases).** Each point goes to the phase of Paul's last shot: serve and 3rd ball (shot 1 or 3), receive and 4th ball (shot 2 or 4, or no shot), and rally (5th ball on). For each phase it shows the scoring rate, W/(W+L), and the usage rate, the share of all points. Against Kim, Paul won 59% in the serve phase but only 43% in the receive phase, and the receive phase decided 42% of the points. That tells him which phase to train.
2. **Who attacks first.** It shows Paul's share of first attacks and the win rate each way. Against Kim, Paul opened 22% of known rallies and won 43% of the points when Kim opened first. This needs no extra taps because shots 2 to 4 are always asked.
3. **The 4th ball against their 3rd-ball attack.** Of those rallies, how many ended on shot 3, how many Paul countered and how many he blocked, and what each won. Season: block 32 of 97 (33%), counter 21 of 41 (51%).
4. **The error map.** Errors sorted by wing, stroke and miss (Net, Long or Wide), and split into under attack (the ball before was an asked Attack) or on a free ball. Against Kim, Paul made 32 errors, 20 of them under attack, and 9 were FH control under attack, mostly into the net.
5. **Serve and receive by length.** This shows which serve gets attacked and which receive gets punished, for Paul and for each opponent. Kim attacked 15 of Paul's 17 long serves. Kim served short 34 times and Paul won 12. This feeds the scout card.

Other outputs:

- **Player card (season):** points, serve, receive and first-attack share, with trust chips. It lists what is strong, what to work on and what is moving.
- **Scout card (per opponent):** serve mix, response to long serves, 3rd-ball habit, winners by wing, weak wing, and a three-line plan.
- **Training focus:** three cards, each with why, a drill, a metric to watch with a target, and a reel. In the sample they are:
  1. Receive of the short serve.
  2. FH block under attack.
  3. Counter rather than block on the 4th ball.
- **Shot by shot:** winners and errors for each player on shots 1 to 6 and 7+, using Tamaki's method.
- **Rally length bands, close finishes (8 all on) and serve turns:** useful context, but thin within a single match.

## 2. Metrics over time, and how much data each needs

Trust chips follow binomial width, about ±1/√n:

| Tier | Events | Margin |
|---|---|---|
| Too few | under 30 | wider than ±18 points |
| Early | 30 or more | about ±18 points |
| Fair | 100 or more | about ±10 points |
| Solid | 270 or more | about ±6 points |

To detect a change, compare two blocks of matches. A 10-point change needs about 200 events on each side. A 15-point change needs about 90.

| Metric | Events a match | Matches to Fair | Matches to Solid |
|---|---|---|---|
| Points won | 72 | 2 | 4 |
| Serve won, or receive won | 36 | 3 | 8 |
| Each phase | 20 to 27 | 4 to 6 | 10 to 14 |
| First attack, each way | 25 to 32 | 4 | 9 to 11 |
| Receive of a short serve | 25 | 4 | 11 |
| 3rd ball after a control receive | 22 | 5 | 13 |
| Rallies of 7 or more shots | 15 | 7 | 18 |
| Block or counter, 4th ball | 11 | 9 | 24 |
| Long serve | 10 | 10 | 26 |
| Close finishes, 8 all on | 6 | 17 | 45 |

Counts per 100 rallies move faster than win rates. In the sample, BH errors under attack fell from 10.0 to 5.9 per 100 rallies (first 6 matches vs last 6). That change is likely real (z about 2.1), and a halving like this shows after about 6 matches on each side.

The block win rate rose from 27% to 40%. That is probably better but not proven: there were about 50 blocks on each side, and a change this size needs about 120.

The research agrees on scale: racket-sport profiles settle after 3 to 10 matches, and finer detail needs more (Hughes, Evans and Wells 2001).

**Display rule:** show a trend as a pooled rolling line over the last 4 matches, with a 95% band and a marker where training started. Give a plain verdict: no change, probably, or likely real.

## 3. Displays

All displays are on the canvas, which is 393 px wide for an iPhone 15:

- Split bars, each showing "won of total" with a trust chip.
- A first-attack strip.
- A shot-by-shot grid with the hot cells tinted.
- A 3 by 2 error grid with the Net, Long and Wide split.
- Player and scout cards.
- Focus cards with a reel pill.
- A rolling trend with a band.
- Bars per match with first-6 and last-6 reference lines.
- The data-needs table.

Every number on a card links to its rallies.

## 4. Strengths and weaknesses for insight

**Strengths**

- **Complete rally records.** Every rally has a checked winner, shot count, last hitter and End type. That alone runs the three-phase and shot-number methods with no gaps.
- **The first-attack window is covered.** Shots 2 to 4 are always asked, and 95 to 97% of elite first attacks happen there. In the sample, first attack was unknown on only 2.2% of rallies.
- **The finish is captured.** The last three shots give the finish and the ball before it. That gives a free proxy for forced vs unforced errors, plus counters.
- **Wing for both players** on every asked shot, which feeds the error maps, winner maps and the scout card.
- **Fixed slots**, so every rate has a clean base. Contact times give a reel for every insight.

**Weaknesses**

- **No placement.** Placement is the strongest winning tactic in elite Markov models.
- **Stroke detail is coarse.** Attack or Control only, so flick and topspin are not split, nor push and block. Context recovers part of this.
- **Serve detail is coarse.** Serve is Short or Long only: no half-long and no spin. Aces and faults have no length.
- **Long rallies have a gap.** On 8+ shot rallies (15% of the sample), shots 5 to n-3 are blank.
- **No opponent level or hand**, so trends mix easy and hard matches. In the sample, Paul won 61% of points against weaker players and 45% against stronger ones.
- **Self-tagging is subjective.** Attack or Control is a judgment. Re-tag one set a month to check consistency; research uses kappa for this.
- **One match is Early at best** for most rates.

## 5. What could come out

Taps are measured on the tour mix: 80 rallies and 760 taps, 9.5 a rally.

| Item | Taps saved | Insight lost | Verdict |
|---|---|---|---|
| Who attacked first? | about 0.02 a rally, 0 when skipped | First attack on about 2% more rallies, all long ones. Removes the most complex rule. | Could go |
| Shot n-2 on 7+ shot rallies | 0.14 a rally (11 of 80) | The set-up ball before the finish on long rallies, and the Counter read on n-1. On 7-shot rallies, shot 5 becomes unasked. | Could go, small loss |
| Point to | 1 a rally (10.5% of taps) | No information, since End plus the contacts give the winner. But the contact check goes, and one missed contact flips the winner and every hitter. | Keep |
| Their serve length | 0.44 a rally | Receive by serve length, and the scout serve mix | Keep |
| Ball before the last, 5+ shots | 0.31 a rally | The forced-error proxy, and Counter on the last shot | Keep |
| Shot 4 on 7+ shot rallies | 0.14 a rally | The 4th ball, the key shot, on long rallies | Keep |

Already free: Counter, parts, review marks, the star, wing, and the Net, Long or Wide split.

## 6. Model changes worth making

1. **Opponent hand and level, once a match.**
   - **What:** Left or Right, and Weaker, Similar or Stronger, entered in Details.
   - **Cost:** 2 taps a match, about 0.03 a rally.
   - **Unlocks:** fair trends, and cards split by opponent type.
   - **Research:** quality of opposition shifts serve and receive results (Gómez et al. 2017). Same vs opposite handedness changes which patterns win (Yu, Cui and Xiao 2022).
2. **Short or long on control receives, on the Receive page only.**
   - **What:** the grid becomes three rows: Attack, Control short and Control long.
   - **Cost:** 0 extra taps, one more choice. The page grows from 101 px to about 140 to 146 px of 263. It does not go on the End page, which is already about 231 px.
   - **Unlocks:** whether Paul's push hands the server a 3rd-ball attack. Kim attacked 29 of Paul's 37 control receives.
   - **Research:**
     - Senior women push short more than juniors (32.5% vs 26%) and flick more (22.2% vs 14.7%) (Malagoli Lanzoni et al.).
     - In a Wang Chuqin case study, half-long vs short receive length changed who opened (preprint, so cite with care).
3. **Where a winner landed: BH, Middle or FH.**
   - **What:** asked after End is Winner.
   - **Cost:** +1 tap on about 3 in 10 rallies, about +0.3 a rally (9.5 becomes 9.8, +3%).
   - **Unlocks:** where each player wins points, which feeds footwork work, serve plans and both cards.
   - **Research:** the long backhand zone and the BH to BH diagonal are the top winning tactics in a Markov model of top 50 men (Pfeiffer, Zhang and Hohmann 2010). Elite servers aim at the middle toward the BH (Djokic et al. 2020).

**Not worth adding**

- **Forced or unforced.** The ball before already covers most of it: 45% of errors in the sample came straight after an attack.
- **Spin, or placement on every shot.** Too many taps for a self-tagger.
- **Serve length on aces and faults.** +1 tap on about 12% of rallies, for little gain.

**Free, no new taps (derive in analysis)**

- **Name the attack from the ball before.** A shot-2 attack on a short serve reads as a flick, on a long serve as a topspin. This matters because flick first attacks win under 50% and topspin ones over 50% (Fuchs and Lames 2021).
- **Error under attack or on a free ball.**
- **Serve turns:** won both, split, lost both.
- **Close finishes** from the score.
- **Rest time** between rallies, from the contact times.
- **A reel behind every number.**

## 7. Research grounding

**Value** means the research ties the metric to winning or losing and it can be trained (High), it is a benchmark or a single study (Medium), or it only frames a number (Context).

| Finding | Source | What it backs | Value |
|---|---|---|---|
| Three-phase method: scoring and usage rates for serve and 3rd, receive and 4th, and rally. China's coaches use it, and winners beat losers in all three phases. | Wu et al. 1988; Zhang et al. 2014, J Sports Sci 32(1):70 to 77; Yu, Cui and Xiao 2022, Kinesiology 54(1), [doi](https://doi.org/10.26582/k.54.1.8) | Insight 1 | High |
| China and Japan use shot-number and phase analysis as coaching practice to prepare for majors. | Fuchs et al. 2018 review, J Sports Sci 36(23):2653 to 2662, [doi](https://doi.org/10.1080/02640414.2018.1450073) | Insights 1 and 3 | High |
| First-attack advantage. 95 to 97% of first attacks come on shots 2 to 4. Topspin first attacks win over 50%, flicks mostly under. The edge fades unless the follow-up finishes it. | Fuchs and Lames 2021, IJRSS 3(1), Rio 2016, 7,449 rallies, [link](https://journal.racketsportscience.org/index.php/ijrss/article/view/48) | Insight 2, focus 3, asking shot 4 | High |
| The key shot is the 4th. The key point is 8 for men and 7 for women, and the winning point is 9. | Li and Yang 2026, PLOS One 21(4):e0338203, [doi](https://doi.org/10.1371/journal.pone.0338203) | Insight 3, close finishes | High |
| China's men's biggest edge was the 4th shot. Shot-number profiling uses a minimum of 5 shots per cell. | Tamaki, Yoshida and Yamada 2017, J Hum Kinet 55:7 to 18, [link](https://pmc.ncbi.nlm.nih.gov/articles/PMC5304271/) | Insight 3, focus 1, shot grid | High |
| The serve bias is low at shot 2, high at shot 3 and trivial after. Losers lose on missed shots after the serve. | Tamaki and Yoshida 2020, IJRSS, [link](https://journal.racketsportscience.org/index.php/ijrss/article/view/16) | Insights 4 and 5 | High |
| Errors are 14 to 20% of shots and winners 3 to 9%. | Wheelchair Paralympic notational study 2023, IJERPH, [link](https://pmc.ncbi.nlm.nih.gov/articles/PMC10001092/) (a different population, so a cautious read) | Insight 4 | High |
| Racket-sport profiles stabilise after 3 to 10 matches, depending on the data type. | Hughes, Evans and Wells 2001, IJPAS 1(1), [doi](https://doi.org/10.1080/24748668.2001.11868245) | Trust chips, data needs | High |
| Servers win about 55% (London 2012, 12,428 rallies, mode 3 shots). At Rio 2016, serve points were only slightly above 50%, and the quality of opposition shifts this. | Yoshida et al. 2014, Japan J Coaching Studies 28(1):65 to 74, [link](https://www.jstage.jst.go.jp/article/jcoaching/28/1/28_65/_article/-char/en); Gómez et al. 2017, IJPAS 17(6):919 to 933 | Insight 5 benchmark, opponent level | Medium |
| 77% of serves are short FH serves. 11.6% of points are won straight off the serve and 22.4% on the 3rd ball. Winners serve short better. | Djokic et al. 2020, IJRSS 2(1), [link](https://journal.racketsportscience.org/index.php/ijrss/article/download/22/3/) | Insight 5, scout card | Medium |
| A 3rd-ball attack after a control receive won 55.7%, against 49.7% for a control. A receive attack won 56.9%. | Wang Chuqin first-three-strokes case study, Research Square preprint, [doi](https://doi.org/10.21203/rs.3.rs-10719122/v1) | Insights 2 and 3 | Medium |
| The long BH zone, the BH to BH diagonal and topspin are the key winning tactics. | Pfeiffer, Zhang and Hohmann 2010, IJSSC 5(2):205 to 222, [doi](https://doi.org/10.1260/1747-9541.5.2.205) | Winner placement change | Medium |
| Senior women push short 32.5% vs 26% for juniors, and flick 22.2% vs 14.7%. Senior rallies average 4.46 shots vs 3.93. | Malagoli Lanzoni et al., [link](https://cris.unibo.it/handle/11585/837771) | Receive length change, focus 1 | Medium |
| World-level rallies have a median of 4 shots (IQR 3 to 6). | Leite et al. 2017, J Hum Kinet, [link](https://pmc.ncbi.nlm.nih.gov/articles/PMC5304269/) | Rally length card | Context |

**What makes an insight worth training.** The research ties three-phase scoring, first attack, the 4th ball and errors after the serve directly to who wins. Each can be changed in practice with a specific drill, so those four lead the focus cards.

Serve win rate, rally length and close finishes are benchmarks or context. They help frame a number but should not drive a training plan on their own.

## 8. Ideas for the coordinator

New product ideas, not logged:

- Opponent hand and level.
- Receive short or long.
- Winner landing.
- The 0-tap derived reads: attack type from context, under attack vs free, serve turns, rest time.
- A trust chip on every number.
- A reel pill on every card.
