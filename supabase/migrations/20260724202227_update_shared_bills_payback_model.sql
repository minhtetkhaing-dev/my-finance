alter table public.shared_bills
  add column expected_back_amount numeric(14,2),
  add column closed_at timestamptz;

update public.shared_bills
set expected_back_amount = least(
  greatest(amount_per_person * greatest(people_count - 1, 0), 0),
  total_amount - 0.01
);

alter table public.shared_bills
  alter column expected_back_amount set not null,
  add constraint shared_bills_expected_back_amount_check
    check (expected_back_amount >= 0 and expected_back_amount < total_amount);

drop trigger if exists validate_shared_bill_payback_links_trigger on public.shared_bill_paybacks;
drop function if exists public.validate_shared_bill_payback_links();

create temporary table shared_bill_payback_income_transactions_to_remove
on commit drop
as
select p.transaction_id, p.user_id
from public.shared_bill_paybacks p;

alter table public.shared_bill_paybacks
  drop constraint if exists shared_bill_paybacks_transaction_id_fkey,
  drop column if exists transaction_id;

delete from public.transactions t
using shared_bill_payback_income_transactions_to_remove old_income
where t.id = old_income.transaction_id
  and t.user_id = old_income.user_id
  and t.kind = 'income';

create function public.validate_shared_bill_payback_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bill record;
  current_paid numeric(14,2);
begin
  select *
    into bill
    from public.shared_bills b
    where b.id = new.shared_bill_id
      and b.user_id = new.user_id;

  if not found then
    raise exception 'Payback must belong to one of the user shared bills';
  end if;

  select coalesce(sum(amount), 0)
    into current_paid
    from public.shared_bill_paybacks
    where shared_bill_id = new.shared_bill_id
      and id <> new.id;

  if current_paid + new.amount > bill.expected_back_amount then
    raise exception 'Payback amount exceeds the expected back amount';
  end if;

  return new;
end;
$$;

create function public.sync_shared_bill_expense()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bill_id uuid;
  bill record;
  paid_back numeric(14,2);
begin
  bill_id := coalesce(new.shared_bill_id, old.shared_bill_id);

  select *
    into bill
    from public.shared_bills
    where id = bill_id;

  if not found then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0)
    into paid_back
    from public.shared_bill_paybacks
    where shared_bill_id = bill.id;

  update public.transactions
    set amount = greatest(
      0.01,
      bill.total_amount - least(paid_back, bill.expected_back_amount)
    )
    where id = bill.transaction_id
      and user_id = bill.user_id;

  update public.shared_bills
    set closed_at = case
      when paid_back >= bill.expected_back_amount then coalesce(closed_at, now())
      else null
    end
    where id = bill.id
      and user_id = bill.user_id;

  return coalesce(new, old);
end;
$$;

revoke all on function public.validate_shared_bill_payback_links() from public, anon, authenticated;
revoke all on function public.sync_shared_bill_expense() from public, anon, authenticated;

create trigger validate_shared_bill_payback_links_trigger
  before insert or update on public.shared_bill_paybacks
  for each row execute function public.validate_shared_bill_payback_links();

create trigger sync_shared_bill_expense_trigger
  after insert or update or delete on public.shared_bill_paybacks
  for each row execute function public.sync_shared_bill_expense();

update public.shared_bills b
set closed_at = case
  when coalesce(p.paid_back, 0) >= b.expected_back_amount then now()
  else null
end
from (
  select shared_bill_id, sum(amount) as paid_back
  from public.shared_bill_paybacks
  group by shared_bill_id
) p
where p.shared_bill_id = b.id;

update public.transactions t
set amount = greatest(
  0.01,
  b.total_amount - least(coalesce(p.paid_back, 0), b.expected_back_amount)
)
from public.shared_bills b
left join (
  select shared_bill_id, sum(amount) as paid_back
  from public.shared_bill_paybacks
  group by shared_bill_id
) p on p.shared_bill_id = b.id
where t.id = b.transaction_id
  and t.user_id = b.user_id;
