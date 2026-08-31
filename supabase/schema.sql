-- Cooperative Gig Platform — full schema.
-- Run this once in a fresh Supabase project's SQL editor.

create type user_role as enum ('worker', 'customer');
create type job_status as enum ('OPEN', 'ASSIGNED');
create type interest_status as enum ('INTERESTED', 'HIRED', 'RELEASED');

-- One row per signed-up user, worker or customer.
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role user_role not null,
  full_name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Worker-only fields, 1:1 with profiles where role = 'worker'.
create table worker_details (
  id uuid primary key references profiles(id) on delete cascade,
  skill text not null,
  location text not null,
  is_active_member boolean not null default true,
  cooldown_until timestamptz,
  recent_jobs integer not null default 0,
  rating numeric(2,1) not null default 5.0,
  created_at timestamptz not null default now()
);

alter table worker_details enable row level security;
create policy "Workers can view own details" on worker_details for select using (auth.uid() = id);
create policy "Workers can update own details" on worker_details for update using (auth.uid() = id);
create policy "Workers can insert own details" on worker_details for insert with check (auth.uid() = id);

-- Jobs posted by customers.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text unique not null,
  customer_id uuid not null references profiles(id) on delete cascade,
  customer_name text not null,
  customer_contact text not null,
  customer_email text not null,
  service_type text not null,
  location text not null,
  description text,
  preferred_time text,
  status job_status not null default 'OPEN',
  assigned_worker_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table jobs enable row level security;
create policy "Customers can view own jobs" on jobs for select using (auth.uid() = customer_id);
create policy "Customers can insert own jobs" on jobs for insert with check (auth.uid() = customer_id);
create policy "Customers can update own jobs" on jobs for update using (auth.uid() = customer_id);
create policy "Workers can view open jobs matching their skill and location"
  on jobs for select using (
    status = 'OPEN' and exists (
      select 1 from worker_details wd
      where wd.id = auth.uid() and wd.skill = jobs.service_type and wd.location = jobs.location
    )
  );

-- A worker expressing interest in a job.
create table interests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  worker_id uuid not null references profiles(id) on delete cascade,
  status interest_status not null default 'INTERESTED',
  accepted_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

alter table interests enable row level security;
create policy "Workers can view own interests" on interests for select using (auth.uid() = worker_id);
create policy "Workers can insert own interest" on interests for insert with check (auth.uid() = worker_id);
create policy "Customers can view interests on their jobs"
  on interests for select using (
    exists (select 1 from jobs where jobs.id = interests.job_id and jobs.customer_id = auth.uid())
  );

-- On signup: create the profile row, and if the signup was for a worker,
-- create their worker_details row too (skill/location come from the
-- signup form via user_metadata).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    (new.raw_user_meta_data->>'role')::public.user_role,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'phone'
  );

  if (new.raw_user_meta_data->>'role') = 'worker' then
    insert into public.worker_details (id, skill, location)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'skill', ''),
      coalesce(new.raw_user_meta_data->>'location', '')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
