create or replace function public.record_profile_plan_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_date date := timezone('Asia/Yangon', now())::date;
  current_month date := date_trunc('month', local_date)::date;
  current_year integer := extract(year from local_date)::integer;
  record_monthly boolean := true;
  record_yearly boolean := true;
  last_month date;
  last_year integer;
  fill_month date;
  fill_year integer;
begin
  if tg_op = 'UPDATE' then
    record_monthly := new.monthly_spending_cap is distinct from old.monthly_spending_cap;
    record_yearly := new.yearly_savings_goal is distinct from old.yearly_savings_goal;
  end if;

  if record_monthly then
    select max(effective_month)
      into last_month
      from public.monthly_limit_history
      where user_id = new.id
        and effective_month < current_month;

    if last_month is not null then
      fill_month := (last_month + interval '1 month')::date;
      while fill_month < current_month loop
        insert into public.monthly_limit_history (
          user_id, effective_month, spending_limit
        ) values (
          new.id, fill_month,
          case when tg_op = 'UPDATE' then old.monthly_spending_cap else new.monthly_spending_cap end
        )
        on conflict (user_id, effective_month) do nothing;
        fill_month := (fill_month + interval '1 month')::date;
      end loop;
    end if;

    insert into public.monthly_limit_history (
      user_id, effective_month, spending_limit
    ) values (
      new.id, current_month, new.monthly_spending_cap
    )
    on conflict (user_id, effective_month) do update
      set spending_limit = excluded.spending_limit, updated_at = now();
  end if;

  if record_yearly then
    select max(effective_year)
      into last_year
      from public.yearly_goal_history
      where user_id = new.id
        and effective_year < current_year;

    if last_year is not null then
      fill_year := last_year + 1;
      while fill_year < current_year loop
        insert into public.yearly_goal_history (
          user_id, effective_year, savings_goal
        ) values (
          new.id, fill_year,
          case when tg_op = 'UPDATE' then old.yearly_savings_goal else new.yearly_savings_goal end
        )
        on conflict (user_id, effective_year) do nothing;
        fill_year := fill_year + 1;
      end loop;
    end if;

    insert into public.yearly_goal_history (
      user_id, effective_year, savings_goal
    ) values (
      new.id, current_year, new.yearly_savings_goal
    )
    on conflict (user_id, effective_year) do update
      set savings_goal = excluded.savings_goal, updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.record_profile_plan_history()
  from public, anon, authenticated;

create or replace function public.record_category_budget_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_date date := timezone('Asia/Yangon', now())::date;
  current_month date := date_trunc('month', local_date)::date;
  record_budget boolean := true;
  last_month date;
  fill_month date;
begin
  if tg_op = 'UPDATE' then
    record_budget := new.monthly_budget is distinct from old.monthly_budget;
  end if;

  if record_budget then
    select max(effective_month)
      into last_month
      from public.category_budget_history
      where category_id = new.id
        and effective_month < current_month;

    if last_month is not null then
      fill_month := (last_month + interval '1 month')::date;
      while fill_month < current_month loop
        insert into public.category_budget_history (
          user_id, category_id, effective_month, monthly_budget
        ) values (
          new.user_id, new.id, fill_month,
          case when tg_op = 'UPDATE' then coalesce(old.monthly_budget, 0) else coalesce(new.monthly_budget, 0) end
        )
        on conflict (category_id, effective_month) do nothing;
        fill_month := (fill_month + interval '1 month')::date;
      end loop;
    end if;

    insert into public.category_budget_history (
      user_id, category_id, effective_month, monthly_budget
    ) values (
      new.user_id, new.id, current_month, coalesce(new.monthly_budget, 0)
    )
    on conflict (category_id, effective_month) do update
      set monthly_budget = excluded.monthly_budget, updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.record_category_budget_history()
  from public, anon, authenticated;

comment on function public.record_profile_plan_history() is
  'Records profile plan changes and backfills unchanged monthly/yearly gaps before the current change.';
comment on function public.record_category_budget_history() is
  'Records category budget changes and backfills unchanged monthly gaps before the current change.';
