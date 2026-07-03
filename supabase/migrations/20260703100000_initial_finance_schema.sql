create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_url text,
  initial_capital numeric(14,2) check (initial_capital is null or initial_capital >= 0),
  monthly_spending_cap numeric(14,2) not null default 0 check (monthly_spending_cap >= 0),
  yearly_savings_goal numeric(14,2) not null default 0 check (yearly_savings_goal >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), kind text not null check (kind in ('income','expense')),
  color text not null default '#00236F', icon text not null default 'card-outline',
  monthly_budget numeric(14,2) check (monthly_budget is null or monthly_budget >= 0), created_at timestamptz not null default now(),
  unique(user_id, name, kind)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, amount numeric(14,2) not null check (amount > 0),
  kind text not null check (kind in ('income','expense')), merchant text not null check (char_length(merchant) between 1 and 120),
  note text check (note is null or char_length(note) <= 500), occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index transactions_user_occurred_idx on public.transactions(user_id, occurred_at desc);
create index transactions_category_idx on public.transactions(category_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
grant select, insert, update, delete on public.profiles, public.categories, public.transactions to authenticated;
revoke all on public.profiles, public.categories, public.transactions from anon;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);
create policy "categories_select_own" on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.categories for delete to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_select_own" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_insert_own" on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "transactions_update_own" on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_delete_own" on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create function public.validate_transaction_category_owner() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.category_id is not null and not exists (select 1 from public.categories c where c.id = new.category_id and c.user_id = new.user_id and c.kind = new.kind) then
    raise exception 'Category must belong to the user and match transaction kind';
  end if; return new;
end; $$;
revoke all on function public.validate_transaction_category_owner() from public, anon, authenticated;
create trigger validate_transaction_category_owner_trigger before insert or update on public.transactions for each row execute function public.validate_transaction_category_owner();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, avatar_url) values(new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  insert into public.categories(user_id,name,kind,color,icon,monthly_budget) values
    (new.id,'Food & Dining','expense','#C9151E','restaurant-outline',500),
    (new.id,'Rent & Utilities','expense','#00236F','home-outline',1500),
    (new.id,'Shopping','expense','#00714E','bag-handle-outline',800),
    (new.id,'Salary','income','#00714E','cash-outline',null);
  return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
