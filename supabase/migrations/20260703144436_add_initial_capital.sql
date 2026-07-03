alter table public.profiles
  add column if not exists initial_capital numeric(14,2)
  check (initial_capital is null or initial_capital >= 0);

comment on column public.profiles.initial_capital is
  'User-confirmed starting balance in MMK. NULL means onboarding is incomplete.';

grant select, insert, update on public.profiles to authenticated;

alter table public.profiles alter column monthly_spending_cap set default 0;
alter table public.profiles alter column yearly_savings_goal set default 0;
