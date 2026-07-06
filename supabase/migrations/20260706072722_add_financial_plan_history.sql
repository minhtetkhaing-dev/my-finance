create table public.monthly_limit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_month date not null,
  spending_limit numeric(14,2) not null check (spending_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, effective_month),
  check (effective_month = date_trunc('month', effective_month)::date)
);

create table public.yearly_goal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_year integer not null check (effective_year between 2000 and 2200),
  savings_goal numeric(14,2) not null check (savings_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, effective_year)
);

create table public.category_budget_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  effective_month date not null,
  monthly_budget numeric(14,2) not null check (monthly_budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, effective_month),
  check (effective_month = date_trunc('month', effective_month)::date)
);

create index monthly_limit_history_user_month_idx
  on public.monthly_limit_history (user_id, effective_month desc);
create index yearly_goal_history_user_year_idx
  on public.yearly_goal_history (user_id, effective_year desc);
create index category_budget_history_user_month_idx
  on public.category_budget_history (user_id, effective_month desc);
create index category_budget_history_category_month_idx
  on public.category_budget_history (category_id, effective_month desc);

alter table public.monthly_limit_history enable row level security;
alter table public.yearly_goal_history enable row level security;
alter table public.category_budget_history enable row level security;

grant select
  on public.monthly_limit_history, public.yearly_goal_history,
  public.category_budget_history to authenticated;
revoke all
  on public.monthly_limit_history, public.yearly_goal_history,
  public.category_budget_history from anon;

create policy "monthly_limit_history_select_own"
  on public.monthly_limit_history for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "yearly_goal_history_select_own"
  on public.yearly_goal_history for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "category_budget_history_select_own"
  on public.category_budget_history for select to authenticated
  using ((select auth.uid()) = user_id);
create function public.record_profile_plan_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_date date := timezone('Asia/Yangon', now())::date;
  record_monthly boolean := true;
  record_yearly boolean := true;
begin
  if tg_op = 'UPDATE' then
    record_monthly := new.monthly_spending_cap is distinct from old.monthly_spending_cap;
    record_yearly := new.yearly_savings_goal is distinct from old.yearly_savings_goal;
  end if;

  if record_monthly then
    insert into public.monthly_limit_history (
      user_id, effective_month, spending_limit
    ) values (
      new.id, date_trunc('month', local_date)::date, new.monthly_spending_cap
    )
    on conflict (user_id, effective_month) do update
      set spending_limit = excluded.spending_limit, updated_at = now();
  end if;

  if record_yearly then
    insert into public.yearly_goal_history (
      user_id, effective_year, savings_goal
    ) values (
      new.id, extract(year from local_date)::integer, new.yearly_savings_goal
    )
    on conflict (user_id, effective_year) do update
      set savings_goal = excluded.savings_goal, updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.record_profile_plan_history()
  from public, anon, authenticated;

create trigger record_profile_plan_history_trigger
after insert or update on public.profiles
for each row execute function public.record_profile_plan_history();

create function public.record_category_budget_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_date date := timezone('Asia/Yangon', now())::date;
  record_budget boolean := true;
begin
  if tg_op = 'UPDATE' then
    record_budget := new.monthly_budget is distinct from old.monthly_budget;
  end if;

  if record_budget then
    insert into public.category_budget_history (
      user_id, category_id, effective_month, monthly_budget
    ) values (
      new.user_id, new.id, date_trunc('month', local_date)::date,
      coalesce(new.monthly_budget, 0)
    )
    on conflict (category_id, effective_month) do update
      set monthly_budget = excluded.monthly_budget, updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.record_category_budget_history()
  from public, anon, authenticated;

create trigger record_category_budget_history_trigger
after insert or update on public.categories
for each row execute function public.record_category_budget_history();

insert into public.monthly_limit_history (
  user_id, effective_month, spending_limit
)
select id, date_trunc('month', timezone('Asia/Yangon', now())::date)::date,
  monthly_spending_cap
from public.profiles
on conflict (user_id, effective_month) do nothing;

insert into public.yearly_goal_history (user_id, effective_year, savings_goal)
select id, extract(year from timezone('Asia/Yangon', now()))::integer,
  yearly_savings_goal
from public.profiles
on conflict (user_id, effective_year) do nothing;

insert into public.category_budget_history (
  user_id, category_id, effective_month, monthly_budget
)
select user_id, id,
  date_trunc('month', timezone('Asia/Yangon', now())::date)::date,
  coalesce(monthly_budget, 0)
from public.categories
on conflict (category_id, effective_month) do nothing;

comment on table public.monthly_limit_history is
  'Effective-dated monthly spending limit changes for each account.';
comment on table public.yearly_goal_history is
  'Yearly savings goals retained for year-over-year reporting.';
comment on table public.category_budget_history is
  'Effective-dated monthly category budgets for historical comparisons.';
