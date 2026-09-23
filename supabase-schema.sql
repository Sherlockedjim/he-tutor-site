-- 何老师家教网站：预约审核系统数据库
-- 适用于 Supabase。请在 Supabase SQL Editor 中执行一次。
-- 前端只使用 anon public key；service_role key 绝不能放进网页。
--
-- 预约状态：
-- pending   家长已提交，等待老师审核
-- confirmed 老师已确认
-- rejected  老师拒绝，时间自动恢复为 available
-- cancelled 已确认预约被取消，时间自动恢复为 available
--
-- 时间片状态：
-- closed    默认关闭，家长不可选择
-- available 老师开放，家长可以选择
-- pending   已被待审核预约占用
-- booked    已确认预约占用
-- blocked   老师临时关闭，前台按“已预约”显示

create extension if not exists pgcrypto;

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  slot_time time not null,
  status text not null default 'closed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_date, slot_time)
);

alter table public.booking_slots add column if not exists updated_at timestamptz not null default now();
alter table public.booking_slots alter column status set default 'closed';
alter table public.booking_slots drop constraint if exists booking_slots_status_check;
alter table public.booking_slots add constraint booking_slots_status_check check (status in ('closed','available','pending','booked','blocked'));

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  lookup_code varchar(8) not null unique check (lookup_code ~ '^[0-9]{8}$'),
  student_name text not null,
  gender text not null check (gender in ('男','女','其他 / 不便透露')),
  grade text not null,
  subject text not null check (subject in ('数学','英语')),
  contact text not null,
  current_score text not null,
  target_score text not null,
  location_mode text not null check (location_mode in ('online','offline')),
  district text,
  venue_type text,
  address text,
  expected_price text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  review_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint offline_location_fields_check check (
    (location_mode = 'online' and district is null and venue_type is null and address is null)
    or
    (location_mode = 'offline' and district is not null and venue_type is not null and (venue_type = '中山大学南校园周边星巴克' or address is not null))
  )
);

create table if not exists public.booking_request_slots (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.booking_requests(id) on delete cascade,
  slot_id uuid not null references public.booking_slots(id) on delete restrict,
  slot_date date not null,
  slot_time time not null,
  created_at timestamptz not null default now(),
  unique (request_id, slot_date, slot_time)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists booking_slots_date_status_idx on public.booking_slots(slot_date, status);
create index if not exists booking_requests_status_created_idx on public.booking_requests(status, created_at desc);
create index if not exists booking_requests_lookup_code_idx on public.booking_requests(lookup_code);
create index if not exists booking_request_slots_request_idx on public.booking_request_slots(request_id);

alter table public.booking_slots enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_request_slots enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

drop policy if exists "public can read booking slots" on public.booking_slots;
create policy "public can read booking slots"
on public.booking_slots for select
to anon, authenticated
using (true);

drop policy if exists "admins can read booking requests" on public.booking_requests;
create policy "admins can read booking requests"
on public.booking_requests for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can read booking request slots" on public.booking_request_slots;
create policy "admins can read booking request slots"
on public.booking_request_slots for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can read own admin row" on public.admin_users;
create policy "admins can read own admin row"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

grant select on public.booking_slots to anon, authenticated;
grant select on public.booking_requests, public.booking_request_slots to authenticated;

create or replace function public.initialize_schedule(p_start_date date, p_end_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_end_date < p_start_date or p_end_date - p_start_date > 21 then raise exception 'invalid_schedule_range'; end if;

  insert into public.booking_slots(slot_date, slot_time, status)
  select day_value::date, make_time(hour_value, 0, 0), 'closed'
  from generate_series(p_start_date, p_end_date, interval '1 day') as days(day_value)
  cross join generate_series(9, 21) as hours(hour_value)
  on conflict (slot_date, slot_time) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_set_slot(p_slot_date date, p_slot_time time, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_status not in ('closed','available','blocked') then raise exception 'invalid_slot_status'; end if;

  select status into v_current from public.booking_slots
  where slot_date = p_slot_date and slot_time = p_slot_time
  for update;

  if v_current in ('pending','booked') then raise exception 'slot_is_reserved'; end if;

  insert into public.booking_slots(slot_date, slot_time, status, updated_at)
  values (p_slot_date, p_slot_time, p_status, now())
  on conflict (slot_date, slot_time)
  do update set status = excluded.status, updated_at = now();
end;
$$;

create or replace function public.admin_set_slots(p_slots jsonb, p_status text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot jsonb;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_status not in ('closed','available','blocked') then raise exception 'invalid_slot_status'; end if;
  for v_slot in select value from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) loop
    perform public.admin_set_slot((v_slot->>'slot_date')::date, (v_slot->>'slot_time')::time, p_status);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.submit_booking_request(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_lookup_code text;
  v_day jsonb;
  v_date date;
  v_times text[];
  v_seen_dates text[] := '{}';
  v_time time;
  v_index integer;
  v_slot public.booking_slots%rowtype;
begin
  if p_payload is null or jsonb_typeof(p_payload->'selections') <> 'array' or jsonb_array_length(p_payload->'selections') = 0 then
    raise exception 'selection_required';
  end if;
  if nullif(trim(p_payload->>'student_name'), '') is null or nullif(trim(p_payload->>'contact'), '') is null then raise exception 'required_field_missing'; end if;
  if nullif(trim(p_payload->>'expected_price'), '') is null then raise exception 'expected_price_required'; end if;
  if p_payload->>'location_mode' not in ('online','offline') then raise exception 'invalid_location_mode'; end if;
  if p_payload->>'location_mode' = 'offline' and (nullif(trim(p_payload->>'district'), '') is null or nullif(trim(p_payload->>'venue_type'), '') is null) then raise exception 'offline_location_required'; end if;
  if p_payload->>'location_mode' = 'offline' and p_payload->>'venue_type' <> '中山大学南校园周边星巴克' and nullif(trim(p_payload->>'address'), '') is null then raise exception 'address_required'; end if;

  loop
    v_lookup_code := lpad(floor(random() * 100000000)::bigint::text, 8, '0');
    exit when not exists (select 1 from public.booking_requests where lookup_code = v_lookup_code);
  end loop;

  insert into public.booking_requests(
    lookup_code, student_name, gender, grade, subject, contact,
    current_score, target_score, location_mode, district, venue_type,
    address, expected_price, notes, status
  ) values (
    v_lookup_code,
    trim(p_payload->>'student_name'),
    trim(p_payload->>'gender'),
    trim(p_payload->>'grade'),
    trim(p_payload->>'subject'),
    trim(p_payload->>'contact'),
    trim(p_payload->>'current_score'),
    trim(p_payload->>'target_score'),
    p_payload->>'location_mode',
    case when p_payload->>'location_mode' = 'offline' then nullif(trim(p_payload->>'district'), '') end,
    case when p_payload->>'location_mode' = 'offline' then nullif(trim(p_payload->>'venue_type'), '') end,
    case when p_payload->>'location_mode' = 'offline' then nullif(trim(p_payload->>'address'), '') end,
    trim(p_payload->>'expected_price'),
    nullif(trim(coalesce(p_payload->>'notes', '')), ''),
    'pending'
  ) returning id into v_request_id;

  for v_day in select value from jsonb_array_elements(p_payload->'selections') loop
    v_date := (v_day->>'slot_date')::date;
    v_times := array(select value from jsonb_array_elements_text(v_day->'slot_times') as item(value));
    if v_date::text = any(v_seen_dates) then raise exception 'duplicate_date_selection'; end if;
    v_seen_dates := array_append(v_seen_dates, v_date::text);
    if array_length(v_times, 1) not between 2 and 3 then raise exception 'daily_duration_must_be_2_or_3'; end if;
    for v_index in 1..array_length(v_times, 1) loop
      v_time := v_times[v_index]::time;
      if extract(minute from v_time) <> 0 or v_time < time '09:00' or v_time >= time '22:00' then raise exception 'invalid_slot_time'; end if;
      if v_index > 1 and v_time <> (v_times[v_index - 1]::time + interval '1 hour') then raise exception 'slots_must_be_contiguous'; end if;
      select * into v_slot from public.booking_slots
      where slot_date = v_date and slot_time = v_time
      for update;
      if not found then raise exception 'slot_not_opened'; end if;
      if v_slot.status <> 'available' then raise exception 'slot_not_available'; end if;
      insert into public.booking_request_slots(request_id, slot_id, slot_date, slot_time)
      values (v_request_id, v_slot.id, v_date, v_time);
      update public.booking_slots set status = 'pending', updated_at = now() where id = v_slot.id;
    end loop;
  end loop;

  return jsonb_build_object('id', v_request_id, 'lookup_code', v_lookup_code, 'status', 'pending');
end;
$$;

create or replace function public.lookup_booking(p_lookup_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'lookup_code', r.lookup_code,
    'student_name', r.student_name,
    'grade', r.grade,
    'subject', r.subject,
    'status', r.status,
    'status_label', case r.status when 'pending' then '审核中' when 'confirmed' then '已确认' when 'rejected' then '未通过审核' when 'cancelled' then '已取消' else r.status end,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot_date', grouped.slot_date,
        'start_time', to_char(grouped.start_time, 'HH24:MI'),
        'end_time', to_char(grouped.end_time, 'HH24:MI'),
        'hours', grouped.hours
      ) order by grouped.slot_date)
      from (
        select slot_date, min(slot_time) as start_time, max(slot_time) + interval '1 hour' as end_time, count(*) as hours
        from public.booking_request_slots
        where request_id = r.id
        group by slot_date
      ) grouped
    ), '[]'::jsonb)
  )
  from public.booking_requests r
  where r.lookup_code = trim(p_lookup_code)
    and trim(p_lookup_code) ~ '^[0-9]{8}$';
$$;

create or replace function public.admin_review_booking(p_request_id uuid, p_action text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.booking_requests%rowtype;
  v_new_status text;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  select * into v_request from public.booking_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  if p_action = 'confirm' then
    if v_request.status <> 'pending' then raise exception 'request_not_pending'; end if;
    if exists (
      select 1 from public.booking_request_slots rs
      join public.booking_slots s on s.id = rs.slot_id
      where rs.request_id = p_request_id and s.status <> 'pending'
    ) then raise exception 'slot_state_changed'; end if;
    update public.booking_slots s set status = 'booked', updated_at = now()
    where exists (select 1 from public.booking_request_slots rs where rs.request_id = p_request_id and rs.slot_id = s.id);
    v_new_status := 'confirmed';
  elsif p_action = 'reject' then
    if v_request.status <> 'pending' then raise exception 'request_not_pending'; end if;
    update public.booking_slots s set status = 'available', updated_at = now()
    where exists (select 1 from public.booking_request_slots rs where rs.request_id = p_request_id and rs.slot_id = s.id) and s.status = 'pending';
    v_new_status := 'rejected';
  elsif p_action = 'cancel' then
    if v_request.status <> 'confirmed' then raise exception 'request_not_confirmed'; end if;
    update public.booking_slots s set status = 'available', updated_at = now()
    where exists (select 1 from public.booking_request_slots rs where rs.request_id = p_request_id and rs.slot_id = s.id) and s.status = 'booked';
    v_new_status := 'cancelled';
  else
    raise exception 'invalid_review_action';
  end if;

  update public.booking_requests
  set status = v_new_status, review_reason = nullif(trim(coalesce(p_reason, '')), ''), reviewed_at = now()
  where id = p_request_id;
  return jsonb_build_object('id', p_request_id, 'status', v_new_status);
end;
$$;

revoke all on public.booking_slots from anon, authenticated;
revoke all on public.booking_requests from anon, authenticated;
revoke all on public.booking_request_slots from anon, authenticated;
grant select on public.booking_slots to anon, authenticated;
grant select on public.booking_requests, public.booking_request_slots to authenticated;
grant execute on function public.initialize_schedule(date,date) to authenticated;
grant execute on function public.admin_set_slot(date,time,text) to authenticated;
grant execute on function public.admin_set_slots(jsonb,text) to authenticated;
grant execute on function public.submit_booking_request(jsonb) to anon, authenticated;
grant execute on function public.lookup_booking(text) to anon, authenticated;
grant execute on function public.admin_review_booking(uuid,text,text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.booking_slots;
exception when duplicate_object then
  null;
end $$;

-- 第一次创建管理员：先在 Authentication → Users 中创建一个邮箱密码用户，
-- 再把该用户的 UUID 填入下面语句执行一次：
-- insert into public.admin_users(user_id, email)
-- values ('把 Authentication 用户 UUID 填在这里', '你的管理员邮箱');
