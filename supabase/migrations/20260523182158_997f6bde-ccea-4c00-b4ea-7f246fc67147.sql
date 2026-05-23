
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- SCANS
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_text text not null,
  input_char_count integer not null default 0,
  risk_score numeric not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
create index scans_user_id_created_at_idx on public.scans(user_id, created_at desc);
alter table public.scans enable row level security;

create policy "Users can view own scans" on public.scans
  for select using (auth.uid() = user_id);
create policy "Users can insert own scans" on public.scans
  for insert with check (auth.uid() = user_id);
create policy "Users can update own scans" on public.scans
  for update using (auth.uid() = user_id);
create policy "Users can delete own scans" on public.scans
  for delete using (auth.uid() = user_id);

-- FINDINGS
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  category text not null,
  masked_value text not null,
  risk_level text not null,
  position_start integer,
  position_end integer,
  created_at timestamptz not null default now()
);
create index findings_scan_id_idx on public.findings(scan_id);
alter table public.findings enable row level security;

create policy "Users can view own findings" on public.findings
  for select using (auth.uid() = user_id);
create policy "Users can insert own findings" on public.findings
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own findings" on public.findings
  for delete using (auth.uid() = user_id);

-- RECOMMENDATIONS
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  priority text not null,
  created_at timestamptz not null default now()
);
create index recommendations_scan_id_idx on public.recommendations(scan_id);
alter table public.recommendations enable row level security;

create policy "Users can view own recommendations" on public.recommendations
  for select using (auth.uid() = user_id);
create policy "Users can insert own recommendations" on public.recommendations
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own recommendations" on public.recommendations
  for delete using (auth.uid() = user_id);

-- SCAN SUMMARIES
create table public.scan_summaries (
  scan_id uuid primary key references public.scans(id) on delete cascade,
  direct_count integer not null default 0,
  indirect_count integer not null default 0,
  correlation_count integer not null default 0,
  social_count integer not null default 0,
  total_findings integer not null default 0
);
alter table public.scan_summaries enable row level security;

create policy "Users can view own scan summaries" on public.scan_summaries
  for select using (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()));
create policy "Users can insert own scan summaries" on public.scan_summaries
  for insert with check (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()));
create policy "Users can delete own scan summaries" on public.scan_summaries
  for delete using (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()));

-- AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- REALTIME for dashboard auto-refresh
alter publication supabase_realtime add table public.scans;
