create or replace function public.sync_shared_bill_expense()
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
  if tg_table_name = 'shared_bills' then
    bill_id := coalesce(new.id, old.id);
  else
    bill_id := coalesce(new.shared_bill_id, old.shared_bill_id);
  end if;

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

revoke all on function public.sync_shared_bill_expense() from public, anon, authenticated;

create function public.validate_shared_bill_expected_back_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paid_back numeric(14,2);
begin
  select coalesce(sum(amount), 0)
    into paid_back
    from public.shared_bill_paybacks
    where shared_bill_id = new.id;

  if paid_back > new.expected_back_amount then
    raise exception 'Expected back amount cannot be less than paid back amount';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_shared_bill_expected_back_update() from public, anon, authenticated;

drop trigger if exists sync_shared_bill_update_expense_trigger on public.shared_bills;
drop trigger if exists validate_shared_bill_expected_back_update_trigger on public.shared_bills;

create trigger validate_shared_bill_expected_back_update_trigger
  before update of total_amount, expected_back_amount on public.shared_bills
  for each row execute function public.validate_shared_bill_expected_back_update();

create trigger sync_shared_bill_update_expense_trigger
  after update of total_amount, expected_back_amount on public.shared_bills
  for each row execute function public.sync_shared_bill_expense();
