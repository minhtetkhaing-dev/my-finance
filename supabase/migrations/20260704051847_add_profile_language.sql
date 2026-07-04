alter table public.profiles add column if not exists language text not null default 'en' check (language in ('en','my'));
comment on column public.profiles.language is 'Preferred application language: en or my.';
grant select, update on public.profiles to authenticated;
