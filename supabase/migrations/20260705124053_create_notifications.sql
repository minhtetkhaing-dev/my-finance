create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 180),
  title text not null check (char_length(title) between 1 and 160),
  message text not null check (char_length(message) between 1 and 500),
  icon text not null default 'notifications',
  tone text not null default 'primary' check (tone in ('primary', 'success', 'danger')),
  destination text not null check (destination in ('dashboard', 'history', 'categories', 'insights', 'profile')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

grant select, insert, update on public.notifications to authenticated;
revoke all on public.notifications from anon;

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_insert_own"
  on public.notifications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.notifications is
  'Persistent per-user financial alerts with cross-device read state and app destinations.';
