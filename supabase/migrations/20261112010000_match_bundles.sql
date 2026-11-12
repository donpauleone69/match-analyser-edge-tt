-- Match Analyser cloud sync — v1
--
-- One row per match per user. The bundle is the same JSON document as the
-- portable match archive (analysis + video asset manifest), so cloud sync and
-- file export/import share one format. Single editor per match; the client
-- resolves conflicts with revision + updated_at (last writer wins per match).

create table if not exists public.match_bundles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  match_id text not null,
  schema_version integer not null,
  revision bigint not null default 1,
  title text not null,
  match_date date,
  summary jsonb not null default '{}'::jsonb,
  bundle jsonb not null,
  device_id text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, match_id)
);

create index if not exists match_bundles_user_updated_idx
  on public.match_bundles (user_id, updated_at desc);

alter table public.match_bundles enable row level security;

create policy "match_bundles_select_own" on public.match_bundles
  for select to authenticated using (user_id = auth.uid());
create policy "match_bundles_insert_own" on public.match_bundles
  for insert to authenticated with check (user_id = auth.uid());
create policy "match_bundles_update_own" on public.match_bundles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "match_bundles_delete_own" on public.match_bundles
  for delete to authenticated using (user_id = auth.uid());

-- Private video bucket. Object keys: {user_id}/{match_id}/{asset_id}.{ext}
insert into storage.buckets (id, name, public)
values ('match-videos', 'match-videos', false)
on conflict (id) do nothing;

create policy "match_videos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "match_videos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "match_videos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "match_videos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'match-videos' and (storage.foldername(name))[1] = auth.uid()::text);
