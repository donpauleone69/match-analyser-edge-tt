/**
 * Field Configuration - Documents all database fields and their Phase 1 status
 */

import type { FieldConfig, FieldCategory } from './models'

// =============================================================================
// MATCH TABLE FIELDS
// =============================================================================

// Fields NOT TOUCHED by Phase 1 (ALL match fields are prepopulated)
export const MATCH_PREPOPULATED_FIELDS: FieldConfig[] = [
  { key: 'id', header: 'ID', category: 'prepopulated',
    defaultValue: 'Auto-generated', description: 'Slug: {p1}-vs-{p2}-{date}-{id}' },
  { key: 'tournament_id', header: 'Tournament ID', category: 'prepopulated',
    defaultValue: 'null or ID', description: 'FK to tournament (optional)' },
  { key: 'round', header: 'Round', category: 'prepopulated',
    defaultValue: 'null or round', description: 'Tournament round (groups, final, etc.)' },
  { key: 'player1_id', header: 'Player 1 ID', category: 'prepopulated',
    defaultValue: 'From match creation', description: 'FK to player 1' },
  { key: 'player2_id', header: 'Player 2 ID', category: 'prepopulated',
    defaultValue: 'From match creation', description: 'FK to player 2' },
  { key: 'first_server_id', header: 'First Server ID', category: 'prepopulated',
    defaultValue: 'From match creation', description: 'Who served first in match' },
  { key: 'winner_id', header: 'Winner ID', category: 'prepopulated',
    defaultValue: 'null or ID', description: 'Match winner (set during match setup or finalization)' },
  { key: 'player1_sets_final', header: 'P1 Sets Final', category: 'prepopulated',
    defaultValue: '0', description: 'Final set count for player 1' },
  { key: 'player2_sets_final', header: 'P2 Sets Final', category: 'prepopulated',
    defaultValue: '0', description: 'Final set count for player 2' },
  { key: 'best_of', header: 'Best Of', category: 'prepopulated',
    defaultValue: '1, 3, 5, or 7', description: 'Match format (best of N sets)' },
  { key: 'match_date', header: 'Match Date', category: 'prepopulated',
    defaultValue: 'ISO date', description: 'Date match was played' },
  { key: 'tagging_mode', header: 'Tagging Mode', category: 'prepopulated',
    defaultValue: 'essential or full', description: 'Tagging detail level' },
  { key: 'match_detail_level', header: 'Detail Level', category: 'prepopulated',
    defaultValue: 'result_only', description: 'Auto-detected data depth' },
  { key: 'has_video', header: 'Has Video', category: 'prepopulated',
    defaultValue: 'false', description: 'True if any video exists' },
  { key: 'video_count', header: 'Video Count', category: 'prepopulated',
    defaultValue: '0', description: 'Number of video segments' },
  { key: 'total_coverage', header: 'Coverage', category: 'prepopulated',
    defaultValue: 'partial', description: 'Full or partial video coverage' },
  { key: 'step1_complete', header: 'Step 1 Complete', category: 'prepopulated',
    defaultValue: 'false', description: 'Phase 1 tagging done (NOT set by Phase 1)' },
  { key: 'step2_complete', header: 'Step 2 Complete', category: 'prepopulated',
    defaultValue: 'false', description: 'Phase 2 tagging done' },
  { key: 'created_at', header: 'Created At', category: 'prepopulated',
    defaultValue: 'ISO timestamp', description: 'When match record was created' },
]

// =============================================================================
// SET TABLE FIELDS
// =============================================================================

// Fields SET during Phase 1
export const SET_PHASE1_FIELDS: FieldConfig[] = [
  // Setup Phase
  { key: 'setup_starting_score_p1', header: 'Setup P1 Score', category: 'setup' },
  { key: 'setup_starting_score_p2', header: 'Setup P2 Score', category: 'setup' },
  { key: 'setup_next_server_id', header: 'Setup Next Server', category: 'setup' },
  { key: 'setup_completed_at', header: 'Setup Completed', category: 'setup',
    render: (v) => v ? new Date(v).toLocaleString() : '—' },
  
  // Tagging Phase (first rally)
  { key: 'tagging_phase', header: 'Phase', category: 'tagging' },
  { key: 'phase1_last_rally', header: 'Last Rally', category: 'tagging' },
  { key: 'has_video', header: 'Has Video', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  
  // Completion (Save Set button)
  { key: 'player1_score_final', header: 'P1 Final', category: 'tagging' },
  { key: 'player2_score_final', header: 'P2 Final', category: 'tagging' },
  { key: 'winner_id', header: 'Winner', category: 'tagging' },
]

// Fields NOT TOUCHED by Phase 1 (shown in reference section only)
export const SET_PREPOPULATED_FIELDS: FieldConfig[] = [
  { key: 'id', header: 'ID', category: 'prepopulated',
    defaultValue: 'Auto-generated', description: 'Slug format: {match_id}-s{num}' },
  { key: 'match_id', header: 'Match ID', category: 'prepopulated',
    defaultValue: 'From match creation', description: 'Foreign key to match' },
  { key: 'set_number', header: 'Set #', category: 'prepopulated',
    defaultValue: '1, 2, 3...', description: 'Set number in match' },
  { key: 'set_first_server_id', header: 'Set First Server', category: 'prepopulated',
    defaultValue: 'From match setup', description: 'Who serves first point of set' },
  { key: 'player1_sets_before', header: 'P1 Sets Before', category: 'prepopulated',
    defaultValue: '0', description: 'Set count before this set' },
  { key: 'player1_sets_after', header: 'P1 Sets After', category: 'prepopulated',
    defaultValue: '0', description: 'Set count after this set' },
  { key: 'player2_sets_before', header: 'P2 Sets Before', category: 'prepopulated',
    defaultValue: '0', description: 'Set count before this set' },
  { key: 'player2_sets_after', header: 'P2 Sets After', category: 'prepopulated',
    defaultValue: '0', description: 'Set count after this set' },
  { key: 'video_segments', header: 'Video Segments', category: 'prepopulated',
    defaultValue: '[]', description: 'Array of video IDs (multi-video support)' },
  { key: 'video_contexts', header: 'Video Contexts', category: 'prepopulated',
    defaultValue: 'null', description: 'Per-video context data' },
  { key: 'end_of_set_timestamp', header: 'Set End Time', category: 'prepopulated',
    defaultValue: 'null', description: 'Timestamp of set end' },
  { key: 'is_tagged', header: 'Is Tagged', category: 'prepopulated',
    defaultValue: 'false', description: 'Set to true after Phase 2 complete' },
  { key: 'tagging_started_at', header: 'Started At', category: 'prepopulated',
    defaultValue: 'null', description: 'ISO timestamp when tagging began' },
  { key: 'tagging_completed_at', header: 'Completed At', category: 'prepopulated',
    defaultValue: 'null', description: 'ISO timestamp when Phase 2 done' },
  { key: 'phase1_total_rallies', header: 'Total Rallies', category: 'prepopulated',
    defaultValue: 'null', description: 'Expected total for progress tracking' },
  { key: 'phase2_last_shot_index', header: 'Phase2 Last Shot', category: 'prepopulated',
    defaultValue: 'null', description: 'Last shot detailed in Phase 2' },
  { key: 'phase2_total_shots', header: 'Phase2 Total', category: 'prepopulated',
    defaultValue: 'null', description: 'Total shots for progress tracking' },
  { key: 'inference_complete', header: 'Inference Done', category: 'prepopulated',
    defaultValue: 'null', description: 'Phase 3 complete flag' },
  { key: 'inference_completed_at', header: 'Inference At', category: 'prepopulated',
    defaultValue: 'null', description: 'ISO timestamp for Phase 3 completion' },
]

// =============================================================================
// RALLY TABLE FIELDS
// =============================================================================

// Fields SET during Phase 1
export const RALLY_PHASE1_FIELDS: FieldConfig[] = [
  { key: 'set_id', header: 'Set ID', category: 'tagging' },
  { key: 'rally_index', header: 'Rally #', category: 'tagging' },
  { key: 'timestamp_start', header: 'Start (s)', category: 'tagging',
    render: (v) => v?.toFixed(2) ?? '—' },
  { key: 'timestamp_end', header: 'End (s)', category: 'tagging',
    render: (v) => v?.toFixed(2) ?? '—' },
  { key: 'end_of_point_time', header: 'End Time', category: 'tagging',
    render: (v) => v?.toFixed(2) ?? '—' },
  { key: 'server_id', header: 'Server', category: 'tagging' },
  { key: 'receiver_id', header: 'Receiver', category: 'tagging' },
  { key: 'is_scoring', header: 'Scoring', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'winner_id', header: 'Winner', category: 'tagging' },
  { key: 'player1_score_before', header: 'P1 Before', category: 'tagging' },
  { key: 'player2_score_before', header: 'P2 Before', category: 'tagging' },
  { key: 'player1_score_after', header: 'P1 After', category: 'tagging' },
  { key: 'player2_score_after', header: 'P2 After', category: 'tagging' },
  { key: 'first_attack_index', header: 'FOS #', category: 'tagging' },
  { key: 'point_ending', header: 'Ending', category: 'tagging' },
  { key: 'point_miss_reason', header: 'Miss Reason', category: 'tagging' },
  { key: 'has_video_data', header: 'Has Video', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'is_highlight', header: 'Highlight', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'framework_confirmed', header: 'Basic✓', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'detail_complete', header: 'Advanced✓', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'server_corrected', header: 'Server Fixed', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'score_corrected', header: 'Score Fixed', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
  { key: 'correction_notes', header: 'Notes', category: 'tagging' },
  { key: 'is_stub_rally', header: 'Stub', category: 'tagging',
    render: (v) => v ? '✓' : '—' },
]

// Fields NOT TOUCHED by Phase 1
export const RALLY_PREPOPULATED_FIELDS: FieldConfig[] = [
  { key: 'id', header: 'ID', category: 'prepopulated',
    defaultValue: 'Auto-generated', description: 'Slug: {set_id}-r{num}' },
  { key: 'video_id', header: 'Video ID', category: 'prepopulated',
    defaultValue: 'null', description: 'Which video segment (multi-video support)' },
]

// =============================================================================
// SHOT TABLE FIELDS
// =============================================================================

// Fields SET during Phase 1
export const SHOT_PHASE1_FIELDS: FieldConfig[] = [
  { key: 'rally_id', header: 'Rally ID', category: 'tagging' },
  { key: 'player_id', header: 'Player', category: 'tagging' },
  { key: 'shot_index', header: '#', category: 'tagging' },
  { key: 'timestamp_start', header: 'Start (s)', category: 'tagging',
    render: (v) => v?.toFixed(2) ?? '—' },
  { key: 'shot_spin', header: 'Spin', category: 'tagging' },
  { key: 'shot_wing', header: 'Wing', category: 'tagging' },
  { key: 'shot_stroke', header: 'Stroke', category: 'tagging' },
  { key: 'shot_placement', header: 'Placement', category: 'tagging' },
  { key: 'shot_depth', header: 'Depth', category: 'tagging' },
  { key: 'shot_contact', header: 'Contact', category: 'tagging' },
  { key: 'shot_initiative', header: 'Initiative', category: 'tagging' },
  { key: 'shot_quality', header: 'Quality', category: 'tagging' },
  { key: 'shot_is_weak', header: 'Weak', category: 'tagging',
    render: (v) => (v ? '✓' : '—') },
  { key: 'shot_is_high', header: 'High', category: 'tagging',
    render: (v) => (v ? '✓' : '—') },
  { key: 'shot_is_heavy', header: 'Heavy', category: 'tagging',
    render: (v) => (v ? '✓' : '—') },
  { key: 'shot_is_safe', header: 'Safe', category: 'tagging',
    render: (v) => (v ? '✓' : '—') },
  { key: 'shot_is_pivot', header: 'Pivot', category: 'tagging',
    render: (v) => (v ? '✓' : '—') },
  { key: 'shot_review_kind', header: 'Review', category: 'tagging' },
]

// Identity only
export const SHOT_PREPOPULATED_FIELDS: FieldConfig[] = [
  { key: 'id', header: 'ID', category: 'prepopulated',
    defaultValue: 'Auto-generated', description: 'Slug: {rally_id}-sh{num}' },
  { key: 'video_id', header: 'Video ID', category: 'prepopulated',
    defaultValue: 'null', description: 'Which video segment' },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getFieldsByCategory(
  fields: FieldConfig[], 
  category: FieldCategory
): FieldConfig[] {
  return fields.filter(f => f.category === category)
}

export function formatValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return `[${value.length} items]`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

