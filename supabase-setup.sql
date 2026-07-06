create table if not exists public.couple_settings (
  id text primary key,
  start_date date,
  updated_at timestamptz default now()
);

insert into public.couple_settings (id)
values ('main')
on conflict (id) do nothing;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  memory_date date not null,
  body text not null,
  photo_url text,
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = true;

alter table public.couple_settings enable row level security;
alter table public.memories enable row level security;

drop policy if exists "Public read couple settings" on public.couple_settings;
drop policy if exists "Public insert couple settings" on public.couple_settings;
drop policy if exists "Public update couple settings" on public.couple_settings;
drop policy if exists "Public read memories" on public.memories;
drop policy if exists "Public insert memories" on public.memories;
drop policy if exists "Public delete memories" on public.memories;
drop policy if exists "Public read memory photos" on storage.objects;
drop policy if exists "Public upload memory photos" on storage.objects;

create policy "Public read couple settings"
on public.couple_settings for select
to anon
using (true);

create policy "Public insert couple settings"
on public.couple_settings for insert
to anon
with check (true);

create policy "Public update couple settings"
on public.couple_settings for update
to anon
using (true)
with check (true);

create policy "Public read memories"
on public.memories for select
to anon
using (true);

create policy "Public insert memories"
on public.memories for insert
to anon
with check (true);

create policy "Public delete memories"
on public.memories for delete
to anon
using (true);

create policy "Public read memory photos"
on storage.objects for select
to anon
using (bucket_id = 'memories');

create policy "Public upload memory photos"
on storage.objects for insert
to anon
with check (bucket_id = 'memories');
