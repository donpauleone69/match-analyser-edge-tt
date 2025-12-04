# Player Profile User Guide

Filename: `PlayerProfile_UserGuide.md`  

Audience: **Coaches, parents, club admins**  
Purpose: Explain how to fill in Player Profiles in Edge TT Match Analyser, and what the system does with that information.

---

## 1. What is the Player Profile?

The Player Profile tells the app:

- What a player is **technically capable** of.
- How **consistent** they are.
- How well they handle **spin** and **difficult positions**.
- Whether their **decisions in matches** are:
  - correct,
  - too aggressive,
  - or too passive.

You **do not** need to assign “levels” (beginner/intermediate/etc.).  
Instead, you **describe what the player can do**, and the app calculates their level automatically.

---

## 2. Who fills it in?

- **Coach** – ideal for initial setup and updates.  
- **Parent or Player** – can help with basic info if a coach isn’t available.  
- The **app itself** – gradually refines some fields using match data.

You can fill in a useful profile in **about 1–2 minutes**.

---

## 3. Important: You Choose Descriptions, Not Numbers

You will never be asked to say:

> “Is this player a 4 or a 7?”

Instead, for each skill, you choose a **sentence** that best describes the player, e.g.:

- “Can do it in practice, not in matches yet”  
- “Functional but unreliable in matches”  
- “Strong and match-stable; clear strength”  
- “High-level weapon; regularly creates pressure”  

The app converts these into internal scores from **0 to 10**.  
Those numbers are used by the analytics engine, not by you.

---

## 4. What the System Derives for You

From your descriptions, the app will automatically derive:

- **System Level**:
  - `beginner` / `intermediate` / `advanced` / `performance` / `elite`
  - A numeric score (0–100) showing progress inside that band.

- **Decision Bias** over time:
  - `tooPassive`, `tooAggressive`, `spinMisread`, `overFH`, `overBH`, or `balanced`.

- **Intent quality** per shot:
  - Was the decision correct for this player’s skills?

You never have to choose those manually.

---

## 5. Sections of the Player Profile

The Player Profile page is grouped into clear sections. You can stop at any point; more detail simply improves accuracy.

### 5.1. Core Identity

- **Style** – choose one:
  - Attacker
  - Allround
  - Defender

- **Handedness** – choose:
  - Right
  - Left

> These often mirror what you already know and may match what you set in the player’s basic details.

---

### 5.2. Technical Skills

For each of these, you choose a description:

- **FH Loop vs Underspin**  
- **BH Loop vs Underspin**
- **FH Flick** (over-table flick vs short serve)  
- **BH Flick / Banana**  
- **FH Counter-topspin** (vs loops / open balls)  
- **BH Counter-topspin**

#### Descriptive options (examples)

For any technical skill, you’ll see options like:

- “Cannot do it at all”  
- “Very weak – almost always fails”  
- “Can do in practice, not in matches yet”  
- “Can use in controlled matches only”  
- “Functional but unreliable in matches”  
- “Reliable under normal match pressure”  
- “Strong and match-stable; clear strength”  
- “High-level weapon; regularly creates pressure”  
- “Outstanding weapon at club/league level”  
- “Elite / signature skill for this player”  

You simply pick the **closest match** for each skill.

> You do **not** need to be perfect. The system learns and can be updated later.

---

### 5.3. Consistency

Fields:

- FH consistency  
- BH consistency  
- Receive consistency  
- Push / touch game consistency  

Descriptive options include things like:

- “Very inconsistent – cannot rally reliably”  
- “Can rally in simple drills only”  
- “Short rallies in matches; often breaks down”  
- “Medium stability – 4–8 ball rallies in matches”  
- “Match-stable under moderate pressure”  
- “Very consistent – hard to break down”  
- “Elite consistency – almost never misses routine balls”  

Again: pick the best description.  
The app maps these to a 0–10 consistency score internally.

---

### 5.4. Spin Handling

Fields:

- Strength vs **backspin (underspin)**  
- Strength vs **topspin**  
- Strength vs **no-spin / float balls**  

Descriptive options include:

- “Misreads this spin type most of the time”  
- “Can handle only very obvious balls”  
- “Functional vs normal club-level spin”  
- “Reliable vs this spin; rarely misreads”  
- “High-level spin understanding”  
- “Outstanding; can exploit opponent’s spin patterns”  

This helps the system decide when aggressive play vs different spins is realistic or not.

---

### 5.5. Positional / Footwork Comfort

Fields:

- Pivot comfort (step-around FH from BH corner)  
- Wide FH stability  
- Wide BH stability  
- Close-to-table comfort  
- Far-from-table comfort (2–3m back, lob/chop/fish)  

Descriptions include:

- “Collapses completely from here”  
- “Can reach but only play a weak/passive ball”  
- “Can produce a neutral ball”  
- “Can continue rallies comfortably”  
- “Can attack or counter from this position”  
- “Turns defence into attack from here”  

These help the app understand when aggressive choices in wide or awkward positions are realistic vs over-aggressive.

---

## 6. How the App Uses This in Analysis (Examples)

### Example 1 – Long underspin to FH

- Player has **FH Loop vs Under = ‘Reliable under normal match pressure’** (internal score ~6).  
- Player style = **Attacker**.  

When they receive a **long underspin to FH**:

- The app expects **Aggressive intent** (loop).  
- If they choose **Neutral** (safe push), it may mark this as **too passive**.  
- If they choose **Aggressive** but miss, it may mark:
  - **correct decision, poor execution**.

---

### Example 2 – Short no-spin to BH

- Player’s **BH Flick = ‘Can do in practice, not in matches’** (internal score ~3).  

When they receive a **short no-spin to BH**:

- The app treats both **Defensive** (push) and **Neutral** as acceptable.  
- An **Aggressive** banana that constantly fails may be flagged as **over-aggressive for current skill**.

---

### Example 3 – Wide FH counter-attack

- Player has **wide FH stability = ‘Can produce a neutral ball’** (internal score ~5).  

When they try to hit a **wild attacking counter wide FH** and miss:

- The system is likely to flag this as **over-aggressive**.  
- If they instead block or roll the ball back, that could be considered **correct**.

---

## 7. Do You Have to Fill Everything?

No.

### Minimum useful setup:

- Style (attacker / allround / defender)  
- Handedness  
- A **few key skills**, for example:
  - FH Loop vs Under  
  - BH Loop vs Under  
  - BH Flick  
  - FH consistency  

Even with just these, the app can start giving you meaningful decision-quality insights.

You can always add more detail later.

---

## 8. Juniors vs Adults

You **do not** choose “Junior” as a level.  

- Age is inferred from **date of birth**.  
- Skill level is derived from **skills + results**, not age.

This means:

- A strong junior can be rated **“performance” or “elite”**.  
- A weaker adult might be **“intermediate”**, even if older.

The system treats **age and level separately**, which is fairer and more accurate.

---

## 9. How Often Should You Update Profiles?

- When a player clearly improves a skill (e.g. BH flick has jumped a tier).  
- At the start of a new season.  
- After a period of focused technical training.

You do **not** need to change it every week.

---

## 10. Summary for Coaches

- You pick **descriptions**, not numbers.  
- You do **not** assign levels; the app calculates them.  
- Partial profiles are OK – more detail just makes analysis better.  
- Over time, the app will learn:
  - where the player is too passive,  
  - where they are over-aggressive,  
  - and which technical skills will unlock better decisions.

This makes Edge TT Match Analyser a **decision-making coach**, not just a stats tracker.
