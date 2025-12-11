# DATA AVAILABLE AFTER PHASE 1 TAGGING

## SHOTS table (per shot)

**Core Identity & References:**
- `id` (string) — Shot slug ID
- `rally_id` (string) — Parent rally FK
- `shot_index` (number) — 1-based position in rally (1 = serve, 2 = receive, 3+ = rally shots)
- `player_id` (string) — Player who hit the shot (FK)
- `video_id` (string | null) — Video segment reference (FK)

**Timing:**
- `timestamp_start` (number) — Shot contact time in seconds
- `timestamp_end` (number | null) — End of shot / start of next shot (null after Phase 1, calculated in batch)

**Shot Classification (Auto-Derived):**
- `shot_label` (enum) — `"serve" | "receive" | "third_ball" | "rally_shot"`
- `shot_type` (string | null) — `"serve"` for serves, `null` for all other shots
- `is_rally_end` (boolean) — `true` if this shot ended the rally

**Rally End Data (Populated):**
- `rally_end_role` (enum) — `"winner" | "forced_error" | "unforced_error" | "none"`
- `shot_result` (enum) — `"in_play" | "in_net" | "missed_long" | "fault"` fault is for forced errors

---

## RALLIES table (per rally)

**Core Identity:**
- `id` (string) — Rally slug ID
- `set_id` (string) — Parent set FK
- `rally_index` (number) — Rally number within set (1-based)
- `video_id` (string | null) — Video segment reference (FK)

**Participants:**
- `server_id` (string) — Player who served (FK)
- `receiver_id` (string) — Player who received (FK)

**Outcome:**
- `is_scoring` (boolean) — `true` for scoring rallies, `false` for lets - currently always true
- `winner_id` (string | null) — Player who won the rally (FK)
- `point_end_type` (enum) — `"serviceFault" | "receiveError" | "forcedError" | "unforcedError" | "winnerShot" | null`
  - Auto-derived from shot count + end condition

**Score Progression (Populated):**
- `player1_score_before` (number) — Player 1 score before this rally
- `player2_score_before` (number) — Player 2 score before this rally
- `player1_score_after` (number) — Player 1 score after this rally
- `player2_score_after` (number) — Player 2 score after this rally

**Timing (Populated):**
- `timestamp_start` (number) — First shot's timestamp
- `timestamp_end` (number) — Rally end timestamp
- `end_of_point_time` (number | null) — Legacy field (same as timestamp_end)

**Workflow Status:**
- `has_video_data` (boolean) — `true` for video-covered rallies
- `framework_confirmed` (boolean) — `true` (Phase 1 complete)
- `detail_complete` (boolean) — `false` (Phase 2 pending)
- `is_stub_rally` (boolean) — `false` for Phase 1-tagged rallies - where sets were started midway datawise
- `is_highlight` (boolean) — `false` (not yet marked)


---

## SETS table (per set)

**Core Identity:**
- `id` (string) — Set slug ID
- `match_id` (string) — Parent match FK
- `set_number` (number) — Set number in match (1-based)

**Final Scores (Populated):**
- `player1_score_final` (number)
- `player2_score_final` (number)
- `winner_id` (string | null) — Set winner (FK)

**Set Progression:**
- `player1_sets_before` (number)
- `player1_sets_after` (number)
- `player2_sets_before` (number)
- `player2_sets_after` (number)

**Server:**
- `set_first_server_id` (string) — First server of the set (FK)


---

## MATCH table

**Core Identity:**
- `id` (string) — Match slug ID
- `player1_id` (string) — Player 1 (FK)
- `player2_id` (string) — Player 2 (FK)
- `first_server_id` (string) — First server of match (FK) - not accurate!

**Match Configuration:**
- `best_of` (number) — `1 | 3 | 5 | 7`
- `match_date` (string) — ISO date string
- `tagging_mode` (enum | null) — `"essential" | "full" | null`

**Final Result (Populated):**
- `winner_id` (string | null) — Match winner (FK)
- `player1_sets_final` (number)
- `player2_sets_final` (number)
- `match_detail_level` (enum) — `"result_only" | "sets" | "rallies" | "shots"`



---

## DERIVED METRICS (Computable from Phase 1 Data)

These are **not stored** but can be **calculated** from the above fields:

**Per Rally:**
- `rally_duration_sec` = `timestamp_end - timestamp_start`
- `shot_count` = count of shots with matching `rally_id`

**Per Match/Set:**
- `total_points` = count of rallies where `is_scoring = true`
- `total_rallies` = count of all rallies
- `player_points_won` = count of rallies where `winner_id = player_id` and `is_scoring = true`

**Per Player:**
- `serve_points_won` = count where `server_id = player_id` and `winner_id = player_id`
- `receive_points_won` = count where `receiver_id = player_id` and `winner_id = player_id`
- `winners` = count of shots where `rally_end_role = "winner"` and `player_id = player_id`
- `forced_errors` = count of shots where `rally_end_role = "forced_error"` and `player_id = player_id`
- `unforced_errors` = count of shots where `rally_end_role = "unforced_error"` and `player_id = player_id`

