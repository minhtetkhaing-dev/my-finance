alter table public.profiles
  add column initial_capital_locked boolean not null default false;

update public.profiles p
set initial_capital_locked = true
where exists (
  select 1 from public.transactions t where t.user_id = p.id
);

create function public.lock_initial_capital_on_transaction()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.profiles
  set initial_capital_locked = true,
      updated_at = now()
  where id = new.user_id
    and initial_capital_locked = false;
  return new;
end;
$$;

revoke all on function public.lock_initial_capital_on_transaction()
  from public, anon, authenticated;

create trigger lock_initial_capital_on_transaction_trigger
after insert on public.transactions
for each row execute function public.lock_initial_capital_on_transaction();

create function public.prevent_initial_capital_unlock()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.initial_capital_locked and (
    new.initial_capital is distinct from old.initial_capital
    or not new.initial_capital_locked
  ) then
    raise exception 'Opening capital is locked after the first transaction';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_initial_capital_unlock()
  from public, anon, authenticated;

create trigger prevent_initial_capital_unlock_trigger
before update on public.profiles
for each row execute function public.prevent_initial_capital_unlock();

comment on column public.profiles.initial_capital_locked is
  'Permanently set after the account records its first transaction.';
