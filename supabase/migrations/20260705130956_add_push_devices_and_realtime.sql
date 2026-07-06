create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null check (char_length(expo_push_token) between 10 and 300),
  platform text not null check (platform in ('ios', 'android')),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index push_devices_user_active_idx
  on public.push_devices (user_id, active)
  where active;

alter table public.push_devices enable row level security;

grant select, insert, update, delete on public.push_devices to authenticated;
revoke all on public.push_devices from anon;

create policy "push_devices_select_own"
  on public.push_devices for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_devices_insert_own"
  on public.push_devices for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "push_devices_update_own"
  on public.push_devices for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "push_devices_delete_own"
  on public.push_devices for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.notifications
  add column push_sent_at timestamptz;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['notifications', 'transactions', 'categories', 'profiles']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

comment on table public.push_devices is
  'Expo push tokens registered by each signed-in mobile installation.';
