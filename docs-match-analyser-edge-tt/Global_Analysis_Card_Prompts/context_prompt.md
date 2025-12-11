You are designing mobile-first Insight Cards for Table Tennis.

Goal:
Convert match, rally, and shot data into clear, simple, actionable insight cards. Each card has ONE idea, ONE main metric, 2–4 supporting metrics, a tiny visual, and short text. Avoid over-explaining visuals; follow the app’s design system and theme.

Data Available (Phase 1 Production Schema):
- MATCH: players, best_of, date, match_detail_level
- SETS: set_number, winner_id, final scores
- RALLIES: rally_index, server_id, receiver_id, winner_id, point_end_type, scores before/after, timestamps, has_video_data, is_stub_rally
- SHOTS: shot_index, shot_label (serve/receive/third_ball/rally_shot), player_id, shot_result, rally_end_role (winner, forced_error, unforced_error, none), is_rally_end, timestamp_start/end

Example data you can derive:
- rally_duration_sec
- shot_count
- event classification based on point_end_type and rally_end_role
- serve/receive win % per player
- error types
- 3rd ball outcomes
- rally phase outcomes

Your output must define:
1. Metrics needed (simple, unambiguous definitions)
2. Core formula(s)
3. Secondary metrics
4. Threshold model (green/amber/red)
5. Minimal chart suggestion
6. Insight text patterns (1–2 sentences)
7. Coaching action patterns (1 sentence)
8. A simple TypeScript-style interface for computed data + card props
9. A short explanation of what the card achieves

Do NOT generate React components. Do NOT specify colours/sizes. Just define the structure and logic. Keep everything concise and functional.

The agent should infer missing details from intent.
