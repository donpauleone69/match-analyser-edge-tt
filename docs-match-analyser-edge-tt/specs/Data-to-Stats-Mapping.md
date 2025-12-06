# Data-to-Stats Mapping & Inference Model

> **Purpose:** Maps our captured rally and shot data to Analysis Engine statistics.  
> **Version:** 1.0.0  
> **Date:** 2025-12-06

This document details:
1. What data we capture (raw)
2. What we can infer (Level 1 = Direct, Level 2 = Multi-point, Level 3 = Deep)
3. Which Analysis Engine stats we can compute
4. Accuracy expectations for each stat

---

## 1. Raw Captured Data

### 1.1 Per Match
- `player1_id`, `player2_id`, `match_date`
- `first_server_id`, `game_structure`, `service_rule`
- `video_source`, `has_video`
- `tagging_mode` ('essential' | 'full')

### 1.2 Per Set
- `set_number`, `player1_final_score`, `player2_final_score`
- `winner_id`
- `set_first_server_id`
- Video coverage metadata

### 1.3 Per Rally
- `rally_index`, `is_scoring`, `winner_id`
- `server_id`, `receiver_id`
- `player1_score_after`, `player2_score_after`
- `point_end_type` ('serviceFault' | 'receiveError' | 'forcedError' | 'unforcedError' | 'winnerShot')
- `luck_type`, `opponent_luck_overcome`

### 1.4 Per Shot (Recorded Data)
**Serves (shot_index = 1):**
- `serve_spin_family` ('under' | 'top' | 'no_spin' | 'side')
- `serve_length` ('short' | 'half_long' | 'long')

**Rally Shots (shot_index > 1):**
- `wing` ('FH' | 'BH')
- `intent` ('defensive' | 'neutral' | 'aggressive')

**All Shots:**
- `shot_result` ('good' | 'average' | 'in_net' | 'missed_long')
- `shot_origin` (where player hits from: 'left' | 'mid' | 'right')
- `shot_destination` (where ball lands: 'left' | 'mid' | 'right' | null for errors)
- `is_rally_end` (boolean)
- `rally_end_role` ('winner' | 'forced_error' | 'unforced_error' | 'none')

---

## 2. Inference Model (Three Levels)

### Level 1: Direct Inference (Deterministic from Single Shot)

**Input:** Single shot data  
**Confidence:** High (95-100%)  
**Examples:**

| Inference | From | Logic |
|-----------|------|-------|
| `inferred_shot_type` (basic) | `intent` + `wing` + `shot_index` | shot_index=1 → 'serve'; intent='aggressive' + wing='FH' → 'FH_loop' |
| `inferred_spin` (basic) | `intent` + `serve_spin_family` | aggressive → topspin; defensive → backspin; serve family |
| `inferred_distance_from_table` | `intent` + `shot_index` | shots 1-2 = 'close'; aggressive = 'close'/'mid'; defensive after aggressive = 'far' |
| `inferred_is_third_ball_attack` | `shot_index` + `intent` | shot_index=3 AND intent='aggressive' |
| `inferred_is_receive_attack` | `shot_index` + `intent` | shot_index=2 AND intent='aggressive' |
| `landing_zone_category` | `shot_destination` | left='BH zone', mid='body', right='FH zone' |

**Functions:**
```typescript
inferShotType(shot, previousShots) → string
inferSpin(shot) → string  
inferDistanceFromTable(shot, previousShots) → 'close' | 'mid' | 'far'
isThirdBallAttack(shot) → boolean
isReceiveAttack(shot) → boolean
```

### Level 2: Multi-Point Inference (From Shot + Context)

**Input:** Current shot + previous 1-3 shots + rally context  
**Confidence:** Medium (70-85%)  
**Examples:**

| Inference | From | Logic |
|-----------|------|-------|
| `inferred_player_position` | `shot_origin` + `wing` | FH from left = 'wide_fh'; BH from right = 'wide_bh'; FH from right = pivot |
| `inferred_pressure_level` | Rally length + intent sequence + shot_result | rally_length > 10 = 'high'; 3 consecutive aggressive = 'high' |
| `initiative_holder` | First aggressive shot in rally | Player who attacks first has initiative |
| `initiative_stolen` | Defensive → Aggressive transition | Player who counters aggressive shot steals initiative |
| `opening_quality` | shot_index=3 + shot_result + opponent's shot_index=4 result | good 3rd ball + opponent error = 'excellent' |
| `rally_phase` | shot_index + intent pattern | 1-2='serve/receive', 3-4='3rd/4th ball', 5+='open rally' |

**Functions:**
```typescript
inferPlayerPosition(shot) → 'wide_fh' | 'normal' | 'wide_bh' | 'very_wide_fh' | 'very_wide_bh'
inferPressureLevel(shot, rally, allRallyShots) → 'low' | 'medium' | 'high'
inferInitiativeHolder(rally) → player_id
inferInitiativeSteal(rally) → { stolen: boolean, by_player: player_id }
inferOpeningQuality(shot3, shot4) → 'excellent' | 'good' | 'poor'
inferRallyPhase(shot_index) → 'serve' | 'receive' | 'thirdBall' | 'fourthBall' | 'openRally'
```

### Level 3: Deep Inference (From Shot Sequence 2+ Shots Deep)

**Input:** Current shot + full rally history + opponent's shots + score context  
**Confidence:** Low-Medium (50-75%)  
**Examples:**

| Inference | From | Logic |
|-----------|------|-------|
| `pivot_to_forehand` | shot[n-1].wing='BH' + shot_origin='left' + shot[n].wing='FH' + shot_destination='right' | Player moved wide left, pivoted FH, hit crosscourt |
| `out_of_position` | shot_origin='left' + shot_destination='right' (diagonal) + opponent_shot_destination='left' | Player hit crosscourt, opponent exploited open court |
| `forced_wide` | Previous shot landed wide + current shot_origin indicates wide position | Opponent forced player wide |
| `recovery_delay` | Time between shots < 0.8s + defensive intent | Player late recovering |
| `tactical_pattern` | Serve spin + receive direction + 3rd ball direction | E.g., "pendulum serve → BH receive → FH attack wide" |
| `weakness_exploitation` | Opponent repeatedly targets zone where player errors | E.g., opponent serves long to BH 5 times, player errors 4 times |

**Functions:**
```typescript
inferPivotMovement(shot, prevShot, prevPrevShot) → { pivoted: boolean, to_wing: Wing, position: string }
inferOutOfPosition(shot, prevShot, opponentShot) → { out_of_position: boolean, severity: 'slight' | 'significant' }
inferForcedWide(shot, prevOpponentShot) → boolean
inferRecoveryQuality(shot, prevShot, timeBetween) → 'excellent' | 'good' | 'late'
inferTacticalPattern(serve, receive, thirdBall) → string
inferWeaknessExploitation(playerShots, opponentShots) → { zone: string, count: number, error_rate: number }
```

---

## 3. Analysis Engine Statistics Coverage

### ✅ 1. Match-Level Performance (HIGH ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| Points won/lost on serve (per side) | rally.server_id + rally.winner_id | Direct | 100% |
| Points won/lost on receive | rally.receiver_id + rally.winner_id | Direct | 100% |
| Point streaks | Sequential rally.winner_id | Direct | 100% |
| Clutch points (9-9+, deuce, game points) | rally.player_scores + rally.winner_id | Direct | 100% |
| Game-to-game momentum shifts | Set.winner_id sequence | Direct | 100% |
| Win % when rally > 5 shots | Count(shots) > 5 + rally.winner_id | Direct | 100% |
| **Serve efficiency** | % points won on serve | Direct | 100% |
| **Receive efficiency** | % points won on receive | Direct | 100% |
| **Serve error rate** | point_end_type='serviceFault' count | Direct | 100% |

**Implementation:** `rules/stats/matchPerformance.ts`

### ✅ 2. Tactical Statistics (MEDIUM-HIGH ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| **3rd ball attack success** | shot_index=3 + intent='aggressive' + rally.winner_id | Level 2 | 85% |
| **3rd ball winner rate** | shot_index=3 + rally_end_role='winner' | Direct | 95% |
| **3rd ball forced error rate** | shot_index=3 + shot_result='good' + opponent shot_index=4 error | Level 2 | 80% |
| **4th ball counter-attack success** | shot_index=4 + intent='aggressive' + rally.winner_id | Level 2 | 85% |
| **4th ball blocking success** | shot_index=4 + intent='defensive'/'neutral' + shot_result | Level 2 | 75% |
| **Opening quality** | shot_index=3 + shot_result + opponent response | Level 2 | 70% |
| Opening loop to different zones | shot_index=3 + shot_destination | Direct | 90% |
| % openings that provoke weak balls | shot_index=3 + opponent shot_index=4.shot_result='weak' | Level 2 | 75% |
| **Initiative win rate** | First aggressive player wins | Level 2 | 80% |
| **Initiative steal rate** | Counter-attacker wins | Level 2 | 75% |

**Implementation:** `rules/stats/tacticalStats.ts`

### ⚠️ 3. Shot-Level Quality (MEDIUM ACCURACY - Needs More Data)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| Shot type frequency | inferred_shot_type | Level 1-2 | 70% |
| FH loop / BH loop count | wing + intent | Level 1 | 85% |
| Flicks (FH/BH) | shot_index=2 + intent='aggressive' | Level 1 | 80% |
| Push count | intent='defensive' + shot_index < 5 | Level 1 | 70% |
| Counter-loop count | shot_index > 3 + intent='aggressive' + prev_intent='aggressive' | Level 2 | 65% |
| Spin category inferred | inferred_spin | Level 1 | 75% |
| **Serve spin profile** | serve_spin_family distribution | Direct | 95% |
| Return-of-serve spin adaptation | shot_index=2 result vs serve_spin_family | Level 2 | 60% |

**Implementation:** `rules/stats/shotQualityStats.ts`

### ⚠️ 3.3 Placement Zones (MEDIUM ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| Deep vs short | shot_destination + serve_length | Direct | 70% |
| Wide FH / Wide BH | shot_destination | Direct | 85% |
| Body shots | shot_destination='mid' | Direct | 80% |
| Winner rate by zone | shot_destination + rally_end_role='winner' | Direct | 90% |
| Error rate by zone | shot_destination + rally_end_role error | Direct | 90% |

**Implementation:** `rules/stats/placementStats.ts`

### ❌ 3.4 Trajectory & Contact Quality (LOW ACCURACY - Future AI)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| Ball speed estimate | Time between shots | Level 3 | 40% |
| Shot quality index | intent + result + context | Level 2 | 55% |
| Recovery time / footwork delay | Time between consecutive player shots | Level 3 | 45% |

**Status:** Defer to AI/CV phase. Current data insufficient.

### ✅ 4. Error Statistics (HIGH ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| **Serve unforced errors** | point_end_type='serviceFault' | Direct | 100% |
| **Receive unforced errors** | point_end_type='receiveError' | Direct | 100% |
| **Open attack unforced errors** | point_end_type='unforcedError' + shot_index >= 3 | Direct | 95% |
| **Rally unforced errors** | point_end_type='unforcedError' | Direct | 95% |
| **Forced errors** | point_end_type='forcedError' | Direct | 95% |
| **Shot-type error profile** | inferred_shot_type + rally_end_role | Level 2 | 75% |
| Error % by shot type | Count errors / Count attempts per inferred_shot_type | Level 2 | 75% |
| Winner % by shot type | Count winners / Count attempts per inferred_shot_type | Level 2 | 75% |

**Implementation:** `rules/stats/errorStats.ts`

### ✅ 5. Rally Structure (HIGH ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| Rally length distribution | Count(shots per rally) | Direct | 100% |
| Who wins long vs short rallies | Count(shots) + rally.winner_id | Direct | 100% |
| Touch vs Power shots ratio | intent='defensive'/'neutral' vs 'aggressive' | Direct | 90% |
| Touch exchanges | Count defensive/neutral shots | Direct | 90% |
| Attack exchanges | Count aggressive shots | Direct | 90% |

**Implementation:** `rules/stats/rallyStructureStats.ts`

### ⚠️ 6. Positional & Footwork (MEDIUM-LOW ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| Distance from table distribution | inferred_distance_from_table | Level 1 | 75% |
| FH/BH positional balance | wing distribution | Direct | 90% |
| Footwork patterns (in-out, lateral) | shot_origin sequence + wing changes | Level 3 | 50% |
| **Win % when forced wide** | inferred_player_position='wide_*' + rally.winner_id | Level 2 | 70% |
| Points lost due to late recovery | inferred recovery_delay + rally.winner_id | Level 3 | 45% |

**Implementation:** `rules/stats/positionalStats.ts`

### ✅ 7. Opponent Scouting (MEDIUM-HIGH ACCURACY)

| Stat | Data Source | Inference Level | Accuracy |
|------|-------------|----------------|----------|
| **Serve tendencies by score** | score_state + serve_spin_family/serve_length | Direct | 95% |
| **Preferred 3rd ball zone** | shot_index=3 + shot_destination distribution | Direct | 90% |
| Weak zones on receive | shot_index=2 + shot_result errors by serve zone | Level 2 | 75% |
| Preferred rally patterns | Sequence patterns of intent + wing | Level 2 | 65% |
| Shot-type overuse habits | inferred_shot_type frequency deviation | Level 2 | 70% |
| **Pressure behaviour** | Clutch point performance | Direct | 90% |

**Implementation:** `rules/stats/opponentScoutingStats.ts`

---

## 4. Statistics Dashboard Structure

### 4.1 Raw Data Display (Per Set)

**Purpose:** Show unprocessed data for validation

- Rally list with server, receiver, score, winner, point_end_type
- Shot list per rally with shot_index, player, wing, intent, result, origin, destination
- Timeline view with rally boundaries

### 4.2 Match Summary

**Filters:** All matches | By specific match | By opponent | By date range

**Metrics:**
- Overall W-L record
- Sets won/lost
- Points won/lost
- Serve/receive efficiency
- Error rates (serve, receive, rally)
- Rally length averages

### 4.3 Serve & Receive Analysis

**Serve Stats:**
- Serve win %
- Serve fault %
- Spin family distribution (under/top/side/no_spin)
- Length distribution (short/half_long/long)
- Serve effectiveness by spin type
- Serve tendencies by score situation (0-0, 9-9, game point, etc.)

**Receive Stats:**
- Receive win %
- Receive error %
- Aggressive receive % (shot_index=2 + intent='aggressive')
- Receive effectiveness vs spin type

### 4.4 3rd & 4th Ball Analysis

**3rd Ball (Server's Opening):**
- 3rd ball attack frequency
- 3rd ball winner rate
- 3rd ball forced error rate
- Target zone distribution
- Success rate by zone

**4th Ball (Receiver's Counter):**
- 4th ball counter-attack frequency
- 4th ball block/defensive success
- 4th ball winner rate

### 4.5 Rally Patterns

- Initiative win rate (first attacker wins)
- Initiative steal rate (counter-attacker wins)
- Win % by rally length (1-2, 3-5, 6-9, 10+ shots)
- Touch vs power balance
- Defensive/neutral/aggressive distribution

### 4.6 Error Analysis

- Unforced error breakdown (serve/receive/rally)
- Forced error count
- Error rate by inferred shot type
- Error rate by position (wide FH, wide BH, normal)
- Error rate by pressure level

### 4.7 Positional Analysis

- FH/BH usage ratio
- Wide position frequency
- Win rate by position
- Shot origin heatmap (left/mid/right)
- Shot destination heatmap

### 4.8 Opponent Scouting Report

**For selected opponent:**
- Head-to-head record
- Serve patterns (by score, by game)
- Preferred attack zones
- Weak zones (high error rate)
- Pressure performance (clutch points)
- Shot overuse tendencies

---

## 5. Implementation Priority

### Phase 1: High-Accuracy Stats (Implement First) ✅
- Match-level performance (serve/receive efficiency)
- Error statistics
- Rally structure
- Raw data display

### Phase 2: Tactical Stats (Medium Priority) ⚠️
- 3rd/4th ball analysis
- Initiative control
- Opening quality

### Phase 3: Advanced Inference (Lower Priority) ⚠️
- Positional analysis
- Opponent scouting
- Pattern recognition

### Phase 4: AI-Enhanced (Future) ❌
- Shot speed estimation
- Recovery time analysis
- Advanced footwork patterns
- Shot quality index

---

## 6. Inference Confidence Display

**UI Strategy:** Show confidence levels to user

- ✅ **High (85-100%):** Display as fact, green badge
- ⚠️ **Medium (65-84%):** Display with "Estimated" label, yellow badge
- ❌ **Low (<65%):** Display with "Inferred (low confidence)" label, red badge, or hide

**Example:**
```
Serve Efficiency: 67% ✅
3rd Ball Attack Success: ~78% ⚠️ (Estimated)
Footwork Delay Impact: 12% ❌ (Low confidence, hidden by default)
```

---

## 7. Next Steps

1. **Build Inference Engine:** Create `rules/stats/` folder with all inference functions
2. **Build Stats Calculators:** Create `rules/stats/calculators/` for each stat category
3. **Build Stats Feature:** Create `features/stats/` with composers, sections, blocks
4. **Create Dashboard:** Build UI to display all stats with filtering

---

*End of Data-to-Stats Mapping & Inference Model*

