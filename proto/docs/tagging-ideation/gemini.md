# 3-Beat Chronological Tagging (Gemini Take)

Interactive prototype: [3-Beat Chronological Tagging Model (Gemini)](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/5b1583d5-4e64-4e1e-ae5e-60db83a169b2)

## 1. The Sequence: Serve -> First Attack -> End

Move strictly forward with the looping video, but jump straight over neutral rally buildup instead of stepping shot by shot.

- **Beat 1 (Serve, Shot 1):** Ask `Serve Length` (`Short`, `Half`, `Long`) and `Serve Spin` (`Back`, `Top/Side`, `Flat`, `Unsure`). If the rally has 1 shot (`N = 1`), ask `Result` (`Ace`, `Net`, `Long`, `Wide`) first; any fault skips Length and Spin and finishes in 1 tap.
- **Beat 2 (First Attack, `N >= 3`):** Show the shot rail (`2..N` plus `None`) and ask "Which shot opened the attack?" One tap skips every earlier push or receive. Tapping a shot opens `Wing` (`FH`, `BH`), `Attack Stroke` (`Flick`, `Loop`, `Drive`, `Smash`), and `Intent` (`Safe`, `Agg`). If `N = 2`, Beat 2 and Beat 3 collapse into a single `Receive & End` card. If `First Attack = N`, Beat 2 also captures `End Result` and finishes immediately.
- **Beat 3 (End, Shot `N`, when `First Attack < N` or `None`):** Ask `End Result` (`Winner`, `Lucky`, `Net`, `Long`, `Wide`), `Wing` (`FH`, `BH`), and `Stroke` (filtered by `Def` or `Attack`).

Every answer row is at most 5 short cells, fits one line on a 393px iPhone with zero scrolling, and uses distinct controls (`Toggle` switch for Coach Flag, pill switch for `Def`/`Attack`, numbered chips on the rail, rectangular cells for answers). Mistake tolerance stays general: `Server` swap and `- Shot` / `+ Shot` adjust `N` and recompute hitter parity without losing compatible answers.

## 2. Fields That Earn Their Place

- **Serve Length & Spin (required on Serve except faults):** Powers the `Serve` and `Receive` Insights tabs and reels ("short backspin serve win rate"). Including `Unsure` prevents camera blind spots from turning into bad spin guesses.
- **First Attack Shot + Wing + Stroke + Intent (`Safe` / `Agg`):** Captures the tactical turning point of the point and powers the `Improve` tab ("my missed aggressive 3rd-ball BH loops vs safe openers").
- **Last Shot Wing + Stroke + End Result (`Winner`, `Lucky`, `Net`, `Long`, `Wide`):** Gives clean execution reels ("BH block errors into net") while isolating net/edge cords under `Lucky`.
- **Coach Flag (single footer switch):** Lets a player build a "show my coach" reel without per-shot tagging friction.

## 3. What Is Inferred or Filtered (Never Asked)

- **Point Winner (0 taps):** Derived from `Server`, contact count `N`, and `End Result` (`Winner`/`Lucky` awards the point to Shot `N`'s hitter; `Net`/`Long`/`Wide` awards it to the opponent).
- **Receive Type (0 taps when `N >= 3`):** If `First Attack = 2`, Shot 2 was an attacking receive; if `First Attack > 2` or `None`, Shot 2 was a non-attacking receive that stayed in play.
- **Error Pressure (0 taps):** Derived structurally from role and attack presence (Shot 1 error = serve fault; Shot 2 defensive error = receive error; `First Attack = N` error = missed opener; `Def` error after an attack = pressure error).
- **Filtered & Parity-Defaulted Strokes:** First Attack shows only attacking strokes. On `None` (no attack), Shot `N` locks to defensive strokes (`Push`, `Block`, `Chop`, `Lob`), with a one-tap escape to promote Shot `N` to First Attack if misclicked. After an attack at `k`, Shot `N` defaults the stroke filter to `Def` when `N - k` is odd and `Attack` when `N - k` is even, clearing stale strokes if flipped.

## 4. What Was Dropped (and Why)

- **Subjective `Forced / Unforced`:** Two coaches disagree constantly. Structural error context gives cleaner data in zero taps.
- **Optional Per-Shot Marks (`High`, `Heavy`, `Review`) & `Initiative`:** Anything optional turns into silent false negatives when a tagger gets tired at rally 150. Making every displayed field required on its branch guarantees zero silent blanks.
- **Middle Shots (`2..FA-1` and `FA+1..N-1`):** Neutral rally filler rarely drives a coaching reel and triples tap counts on long rallies.
- **FA `Contact` (`Over-table / Off-table`):** Largely redundant with `Flick` vs `Loop` for club-level insights.

## 5. The Main Trade-off

You give up stroke-by-stroke history on middle shots (`2..FA-1` and `FA+1..N-1`) and qualitative tags like heavy spin or initiative. In exchange, every rally takes at most 3 stops (1 tap on a serve fault, 5 taps on a 2-shot rally, 6 to 9 taps on any longer rally regardless of length), moves strictly forward in video time, and saves zero ambiguous blanks.
