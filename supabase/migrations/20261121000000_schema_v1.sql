-- Match Analyser schema, version 1: the eight tables of the browser database
-- (app/src/types/db.ts, app/src/data/db.ts), for a later cloud mirror.
-- The app does not use this yet; it stores everything on the device.
--
-- Same rows as the browser: text ids made by the app, camelCase columns in
-- snake_case, times named *_at in whole ms since 1970 (bigint, as the app
-- writes them), *_t and duration_s in seconds in one video. Null means not
-- entered. Enums are check constraints listing the app's values.
--
-- The app validators (app/src/rules/dbValidate.ts) stay the full rule set.
-- Not repeated here: gap-free numbering of videos and rallies (a unique index
-- would block re-ordering in place), birth year up to this year, a rally's
-- video in the set's match, the winner and review parts derived from the
-- shots, contacts 0.05 s apart, and the shape inside demo_script and rally.
--
-- Row level security is on with no policies, so only the service role can
-- read or write. The mirror adds user_id and its policies.

create table public.opponents (
  id text primary key check (id <> '' and id = btrim(id)),
  name text not null check (name <> '' and name = btrim(name)),
  club text check (club <> '' and club = btrim(club)),
  handedness text check (handedness in ('Right', 'Left')),
  style text check (style in ('Attacker', 'Defender', 'Disrupter')),
  birth_year integer check (birth_year >= 1900),
  notes text,
  created_at bigint not null check (created_at >= 0),
  updated_at bigint not null check (updated_at >= created_at)
);
create unique index opponents_name_key on public.opponents (lower(name));

create table public.events (
  id text primary key check (id <> '' and id = btrim(id)),
  name text not null check (name <> '' and name = btrim(name)),
  location text check (location <> '' and location = btrim(location)),
  ranking_status text check (ranking_status in ('Ranking', 'NonRanking')),
  importance text check (importance in ('National', 'Regional', 'Social')),
  created_at bigint not null check (created_at >= 0),
  updated_at bigint not null check (updated_at >= created_at)
);
create unique index events_name_key on public.events (lower(name));

create table public.matches (
  id text primary key check (id <> '' and id = btrim(id)),
  -- An opponent or event linked to a match cannot be removed.
  opponent_id text references public.opponents (id),
  event_id text references public.events (id),
  played_on date,
  category text check (category in ('U13', 'U15', 'Senior', 'Vets')),
  stage text check (stage in ('Group', 'Knockout')),
  round text check (round in ('R64', 'R32', 'R16', 'QF', 'SF', 'F')),
  outcome text check (outcome in ('Win', 'Loss')),
  result_me integer,
  result_them integer,
  created_at bigint not null check (created_at >= 0),
  updated_at bigint not null check (updated_at >= created_at),
  constraint matches_round_knockout check (round is null or stage = 'Knockout'),
  constraint matches_result_pair check ((result_me is null) = (result_them is null)),
  -- A best of 3, 5 or 7 result, and the outcome it gives.
  constraint matches_result_real check (
    result_me is null
    or (
      least(result_me, result_them) >= 0
      and result_me <> result_them
      and greatest(result_me, result_them) in (2, 3, 4)
      and outcome = case when result_me > result_them then 'Win' else 'Loss' end
    )
  )
);
create index matches_created_at_idx on public.matches (created_at);
create index matches_opponent_id_idx on public.matches (opponent_id);
create index matches_event_id_idx on public.matches (event_id);

create table public.videos (
  id text primary key check (id <> '' and id = btrim(id)),
  match_id text not null references public.matches (id) on delete cascade,
  -- Play order among listed videos. A removed video keeps the place it had.
  position integer not null check (position >= 0),
  file_name text not null check (file_name <> ''),
  size_bytes bigint not null check (size_bytes >= 0),
  duration_s double precision not null check (duration_s >= 0 and duration_s < 'infinity'),
  last_modified_ms bigint check (last_modified_ms >= 0),
  fingerprint text check (fingerprint <> '' and fingerprint = btrim(fingerprint)),
  stored_on_device boolean not null,
  archived_at bigint check (archived_at >= 0),
  my_end text check (my_end in ('Near', 'Far')),
  removed_at bigint check (removed_at >= 0),
  -- The scripted stand-in a demo video plays. Null on a file.
  demo_script jsonb check (jsonb_typeof(demo_script) = 'object'),
  -- Lets sets and rallies name a video of their own match.
  unique (match_id, id)
);

create table public.sets (
  id text primary key check (id <> '' and id = btrim(id)),
  match_id text not null references public.matches (id) on delete cascade,
  set_number integer not null check (set_number between 1 and 7),
  entered_me integer check (entered_me between 0 and 99),
  entered_them integer check (entered_them between 0 and 99),
  first_server text not null check (first_server in ('me', 'them')),
  finished_at bigint check (finished_at >= 0),
  mark_from_video_id text,
  mark_from_t double precision check (mark_from_t >= 0 and mark_from_t < 'infinity'),
  mark_to_video_id text,
  mark_to_t double precision check (mark_to_t >= 0 and mark_to_t < 'infinity'),
  mark_complete boolean,
  unique (match_id, set_number) deferrable initially deferred,
  foreign key (match_id, mark_from_video_id) references public.videos (match_id, id),
  foreign key (match_id, mark_to_video_id) references public.videos (match_id, id),
  constraint sets_mark_all_or_none check (
    num_nulls(mark_from_video_id, mark_from_t, mark_to_video_id, mark_to_t, mark_complete) in (0, 5)
  ),
  constraint sets_mark_order check (
    mark_from_video_id is distinct from mark_to_video_id or mark_from_t <= mark_to_t + 1e-6
  )
);

create table public.rallies (
  id text primary key check (id <> '' and id = btrim(id)),
  set_id text not null references public.sets (id) on delete cascade,
  video_id text not null references public.videos (id),
  kind text not null check (kind in ('rally', 'point')),
  -- Order in the set. Deleted rallies have their own order.
  position integer not null check (position >= 0),
  server text not null check (server in ('me', 'them')),
  start_t double precision not null check (start_t >= 0 and start_t < 'infinity'),
  end_t double precision not null check (end_t >= 0 and end_t < 'infinity'),
  ending text check (ending in ('Winner', 'Net', 'Long', 'Wide')),
  winner text not null check (winner in ('me', 'them')),
  -- The user kept Point to against End ("Check the point").
  point_kept boolean not null,
  review_parts text[] not null check (review_parts <@ array['opening', 'attack', 'rally', 'end']),
  left_marks text[] not null check (left_marks <@ array['serve', 'gap']),
  created_at bigint not null check (created_at >= 0),
  deleted_at bigint check (deleted_at >= 0),
  constraint rallies_end_after_start check (start_t <= end_t + 1e-6),
  constraint rallies_rally_ending check (kind = 'point' or ending is not null),
  constraint rallies_point_shape check (
    kind = 'rally'
    or (ending is null and start_t = end_t and cardinality(review_parts) = 0 and not point_kept)
  )
);
create index rallies_set_id_idx on public.rallies (set_id);
create index rallies_video_id_idx on public.rallies (video_id);

create table public.shots (
  id text primary key check (id <> '' and id = btrim(id)),
  rally_id text not null references public.rallies (id) on delete cascade,
  shot_number integer not null check (shot_number >= 1),
  contact_t double precision not null check (contact_t >= 0 and contact_t < 'infinity'),
  wing text check (wing in ('BH', 'FH')),
  depth text check (depth in ('Short', 'Long')),
  stroke text check (stroke in ('Attack', 'Control', 'Defence')),
  unique (rally_id, shot_number) deferrable initially deferred
);

-- The open rally of one set.
create table public.drafts (
  set_id text primary key references public.sets (id) on delete cascade,
  rally jsonb not null check (jsonb_typeof(rally) = 'object')
);

alter table public.opponents enable row level security;
alter table public.events enable row level security;
alter table public.matches enable row level security;
alter table public.videos enable row level security;
alter table public.sets enable row level security;
alter table public.rallies enable row level security;
alter table public.shots enable row level security;
alter table public.drafts enable row level security;
