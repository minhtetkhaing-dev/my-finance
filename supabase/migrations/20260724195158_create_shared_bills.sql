create table public.shared_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  total_amount numeric(14,2) not null check (total_amount > 0),
  description text not null check (char_length(description) between 1 and 120),
  people_count integer not null check (people_count > 0),
  amount_per_person numeric(14,2) not null check (amount_per_person > 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.shared_bill_paybacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shared_bill_id uuid not null references public.shared_bills(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  payer_name text not null check (char_length(payer_name) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index shared_bills_user_occurred_idx on public.shared_bills(user_id, occurred_at desc);
create index shared_bill_paybacks_bill_idx on public.shared_bill_paybacks(shared_bill_id, paid_at desc);
create index shared_bill_paybacks_user_idx on public.shared_bill_paybacks(user_id, paid_at desc);

alter table public.shared_bills enable row level security;
alter table public.shared_bill_paybacks enable row level security;

grant select, insert, update, delete on public.shared_bills, public.shared_bill_paybacks to authenticated;
revoke all on public.shared_bills, public.shared_bill_paybacks from anon;

create policy "shared_bills_select_own"
  on public.shared_bills for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "shared_bills_insert_own"
  on public.shared_bills for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "shared_bills_update_own"
  on public.shared_bills for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "shared_bills_delete_own"
  on public.shared_bills for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "shared_bill_paybacks_select_own"
  on public.shared_bill_paybacks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "shared_bill_paybacks_insert_own"
  on public.shared_bill_paybacks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "shared_bill_paybacks_update_own"
  on public.shared_bill_paybacks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "shared_bill_paybacks_delete_own"
  on public.shared_bill_paybacks for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.validate_shared_bill_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.transactions t
    where t.id = new.transaction_id
      and t.user_id = new.user_id
      and t.kind = 'expense'
  ) then
    raise exception 'Shared bill must link to the user expense transaction';
  end if;

  if new.category_id is not null and not exists (
    select 1
    from public.categories c
    where c.id = new.category_id
      and c.user_id = new.user_id
      and c.kind = 'expense'
  ) then
    raise exception 'Shared bill category must belong to the user and be an expense category';
  end if;

  return new;
end;
$$;

create function public.validate_shared_bill_payback_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.shared_bills b
    where b.id = new.shared_bill_id
      and b.user_id = new.user_id
  ) then
    raise exception 'Payback must belong to one of the user shared bills';
  end if;

  if not exists (
    select 1
    from public.transactions t
    where t.id = new.transaction_id
      and t.user_id = new.user_id
      and t.kind = 'income'
  ) then
    raise exception 'Payback must link to the user income transaction';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_shared_bill_links() from public, anon, authenticated;
revoke all on function public.validate_shared_bill_payback_links() from public, anon, authenticated;

create trigger validate_shared_bill_links_trigger
  before insert or update on public.shared_bills
  for each row execute function public.validate_shared_bill_links();

create trigger validate_shared_bill_payback_links_trigger
  before insert or update on public.shared_bill_paybacks
  for each row execute function public.validate_shared_bill_payback_links();
