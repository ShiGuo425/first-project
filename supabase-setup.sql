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

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  is_done boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.year_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  plan_date date not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  visited_date date not null,
  latitude double precision not null,
  longitude double precision not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  photo_url text not null,
  taken_at date,
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do update set public = true;

alter table public.couple_settings enable row level security;
alter table public.memories enable row level security;
alter table public.wishlist enable row level security;
alter table public.year_schedule enable row level security;
alter table public.places enable row level security;
alter table public.place_photos enable row level security;

drop policy if exists "Public read couple settings" on public.couple_settings;
drop policy if exists "Public insert couple settings" on public.couple_settings;
drop policy if exists "Public update couple settings" on public.couple_settings;
drop policy if exists "Public read memories" on public.memories;
drop policy if exists "Public insert memories" on public.memories;
drop policy if exists "Public delete memories" on public.memories;
drop policy if exists "Public read wishlist" on public.wishlist;
drop policy if exists "Public insert wishlist" on public.wishlist;
drop policy if exists "Public update wishlist" on public.wishlist;
drop policy if exists "Public delete wishlist" on public.wishlist;
drop policy if exists "Public read year schedule" on public.year_schedule;
drop policy if exists "Public insert year schedule" on public.year_schedule;
drop policy if exists "Public delete year schedule" on public.year_schedule;
drop policy if exists "Public read places" on public.places;
drop policy if exists "Public insert places" on public.places;
drop policy if exists "Public delete places" on public.places;
drop policy if exists "Public read place photos" on public.place_photos;
drop policy if exists "Public insert place photos" on public.place_photos;
drop policy if exists "Public delete place photos" on public.place_photos;
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

create policy "Public read wishlist"
on public.wishlist for select
to anon
using (true);

create policy "Public insert wishlist"
on public.wishlist for insert
to anon
with check (true);

create policy "Public update wishlist"
on public.wishlist for update
to anon
using (true)
with check (true);

create policy "Public delete wishlist"
on public.wishlist for delete
to anon
using (true);

create policy "Public read year schedule"
on public.year_schedule for select
to anon
using (true);

create policy "Public insert year schedule"
on public.year_schedule for insert
to anon
with check (true);

create policy "Public delete year schedule"
on public.year_schedule for delete
to anon
using (true);

create policy "Public read places"
on public.places for select
to anon
using (true);

create policy "Public insert places"
on public.places for insert
to anon
with check (true);

create policy "Public delete places"
on public.places for delete
to anon
using (true);

create policy "Public read place photos"
on public.place_photos for select
to anon
using (true);

create policy "Public insert place photos"
on public.place_photos for insert
to anon
with check (true);

create policy "Public delete place photos"
on public.place_photos for delete
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
