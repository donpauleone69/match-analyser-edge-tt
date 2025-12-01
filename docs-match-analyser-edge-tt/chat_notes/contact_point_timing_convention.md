# Contact Point Timing Convention

> Brainstorming session: 2025-12-01

---

## The Question

When marking "contacts" in Step 1, should we tag:
- **A) Shot preparation** (backswing/wind-up) — easier to see, better to watch
- **B) Actual ball contact** — more analytically precise
- **C) Hybrid** — tag prep, refine to contact later

---

## Current Practice (User's Approach)

| Shot Type | Currently Tagged At |
|-----------|---------------------|
| Serve | Ball toss (start of motion) |
| All other shots | Shot preparation (backswing) |

---

## Analysis: What Are We Optimizing For?

### Primary Use Cases (MVP)

1. **Video Review** — Watch rallies, review technique
2. **Shot Tagging (Step 2)** — Add Q1-Q5 metadata to each shot
3. **Basic Stats** — Win %, shot distribution, etc.
4. **Highlight Export** — Cut videos from serve to winner

### Secondary Use Cases (Future)

1. **Ball Speed Estimation** — Time between contacts ÷ estimated distance
2. **Reaction Time Analysis** — Time from opponent contact to player prep
3. **AI Training Data** — Frame-accurate contact detection

---

## Option A: Tag at Contact Point

**Workflow:**
- User scrubs to exact frame of racket-ball contact
- System adds automatic buffer (e.g., -0.3s) for viewing

**Pros:**
- ✅ Analytically precise
- ✅ Consistent convention across all shots
- ✅ Better for future AI/analytics features
- ✅ Can always add buffer programmatically

**Cons:**
- ❌ Harder to spot exact contact frame (especially at 30fps)
- ❌ Slower tagging workflow
- ❌ More cognitive load during Step 1

---

## Option B: Tag at Preparation (Current)

**Workflow:**
- User tags when player starts backswing
- This IS the viewing start point

**Pros:**
- ✅ Natural viewing experience
- ✅ Easier/faster to spot visually
- ✅ More intuitive tagging flow
- ✅ Preparation is part of the "shot" perceptually

**Cons:**
- ❌ Inconsistent timing (prep duration varies by shot type)
- ❌ Less useful for speed/timing analytics
- ❌ Harder to compare across players

---

## Option C: Hybrid Approaches

### C1: Two Timestamps Per Shot

```typescript
interface Contact {
  id: string
  prepTime: number      // When player starts preparation
  contactTime?: number  // Refined in Step 2 (optional)
}
```

**Pros:** Best of both worlds
**Cons:** More work, more complexity

### C2: Tag Prep + Auto-Detect Contact

Use AI/heuristics to estimate actual contact from prep timestamp:
- Serve: prep + ~1.5s
- Forehand: prep + ~0.3s
- Backhand: prep + ~0.3s

**Pros:** User only tags once, system refines
**Cons:** Requires shot type info first (chicken-egg with Step 2)

### C3: Tag Prep, Refine in Step 2

Step 1: Quick tagging at preparation (speed over precision)
Step 2: Optional "fine-tune contact frame" control

**Pros:** Fast Step 1, precision available when needed
**Cons:** Extra step for analytics use case

---

## My Recommendation: **Option B (Preparation) with C3 escape hatch**

### Rationale

1. **Primary use case is VIDEO REVIEW** — prep timing is perfect for this
2. **Ball speed from timestamps is imprecise anyway** — would need:
   - Camera calibration
   - 3D position estimation
   - Higher frame rate (120fps+)
3. **Tagging speed matters** — faster Step 1 = more matches tagged
4. **Prep is perceptually the "shot"** — when you watch slow-mo, you watch from prep

### Convention to Document

| Shot | Tag At | Notes |
|------|--------|-------|
| Serve | Ball toss | Start of service motion |
| Return | Prep/backswing | When returner loads |
| Rally shots | Prep/backswing | When player loads for shot |

### Future Enhancement (Step 2)

Add optional "Contact Frame" refinement:

```
┌──────────────────────────────────┐
│ Shot 3: Forehand                 │
├──────────────────────────────────┤
│ Prep Time:    0:14.233          │
│ Contact Time: [0:14.467] [±]    │  ← Optional refinement
│                                  │
│ [Auto-detect contact]            │  ← Future AI feature
└──────────────────────────────────┘
```

---

## Constrained Playback Implications

If tagging at preparation, the playback bounds work naturally:

```
Shot N playback:
  START: contact[N].time (prep for shot N)
  END:   contact[N+1].time (prep for shot N+1)
```

This shows:
1. Player N preparing
2. Player N hitting
3. Ball traveling
4. **Stops just as opponent starts their prep**

This is actually ideal for reviewing "what did this player do" — you see their full shot without bleeding into opponent's response.

---

## Impact on Analytics

### What We CAN Calculate

| Metric | From Prep Timestamps | Accuracy |
|--------|---------------------|----------|
| Rally length (shots) | ✅ Exact | Perfect |
| Rally duration | ✅ Good | Good |
| Shot distribution | ✅ Exact | Perfect |
| Points won by shot type | ✅ Exact | Perfect |

### What We CAN'T Calculate Precisely

| Metric | Issue |
|--------|-------|
| Ball speed | Would need contact point + distance |
| Reaction time | Prep ≠ reaction start |
| Time pressure | Needs contact-to-contact |

### Mitigation

For analytics features, we could:
1. Add optional contact refinement in Step 2
2. Use shot-type-specific offsets (forehand prep → contact = ~0.3s)
3. Accept "relative" metrics (faster/slower than average)

---

## Decision

**✅ Tag at preparation for MVP**

Document this clearly:
> **Convention:** Contacts are tagged at shot preparation (backswing), not ball contact. Serves are tagged at ball toss. This optimizes for video review workflow.

Add to `specAddendumMVP.md`:
- Contact timing convention
- Future: optional contact refinement in Step 2

---

## Summary

| Question | Answer |
|----------|--------|
| Tag at prep or contact? | **Prep** (current approach) |
| Why? | Video review > analytics precision |
| What about ball speed? | Not feasible without more data anyway |
| Future option? | Add contact refinement in Step 2 |

---

*Last updated: 2025-12-01*

