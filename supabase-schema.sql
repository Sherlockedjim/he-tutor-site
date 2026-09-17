-- 何老师家教网站：Supabase 数据库结构
-- 在 Supabase SQL Editor 中执行一次即可。
-- 前端只需要公开 anon key，不要把 service_role key 放到网页代码里。

create extension if not exists pgcrypto;

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  slot_time time not null,
  status text not null default 'available' check (status in ('available','booked','blocked')),
  created_at timestamptz not null default now(),
  unique (slot_date, slot_time)
);

create table if not exists public.tutor_inquiries (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.booking_slots(id) on delete set null,
  slot_date date not null,
  slot_time time not null,
  student_name text not null,
  grade text not null,
  subject text not null,
  current_score text not null,
  target_score text not null,
  contact text not null,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.booking_slots enable row level security;
alter table public.tutor_inquiries enable row level security;

-- 访客只允许读取“时段是否可预约”，不能读取任何家长提交的信息。
drop policy if exists "public can read booking slots" on public.booking_slots;
create policy "public can read booking slots"
on public.booking_slots for select
to anon, authenticated
using (true);

-- 原子预约函数：锁住时段 -> 校验可预约 -> 写入家长信息 -> 标记已约满。
create or replace function public.book_tutor_slot(
  p_slot_date date,
  p_slot_time time,
  p_student_name text,
  p_grade text,
  p_subject text,
  p_current_score text,
  p_target_score text,
  p_contact text,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.booking_slots%rowtype;
  v_inquiry_id uuid;
begin
  select * into v_slot
  from public.booking_slots
  where slot_date = p_slot_date and slot_time = p_slot_time
  for update;

  if not found then
    raise exception 'slot_not_found';
  end if;

  if v_slot.status <> 'available' then
    raise exception 'slot_not_available';
  end if;

  insert into public.tutor_inquiries(
    slot_id, slot_date, slot_time, student_name, grade, subject,
    current_score, target_score, contact, notes
  ) values (
    v_slot.id, p_slot_date, p_slot_time, trim(p_student_name), trim(p_grade), trim(p_subject),
    trim(p_current_score), trim(p_target_score), trim(p_contact), nullif(trim(coalesce(p_notes,'')), '')
  ) returning id into v_inquiry_id;

  update public.booking_slots set status='booked' where id=v_slot.id;
  return v_inquiry_id;
end;
$$;

revoke all on public.booking_slots from anon, authenticated;
revoke all on public.tutor_inquiries from anon, authenticated;
grant select on public.booking_slots to anon, authenticated;
grant execute on function public.book_tutor_slot(date,time,text,text,text,text,text,text,text) to anon, authenticated;

-- 示例：开放几个时段（请按你的真实排期修改）
-- insert into public.booking_slots(slot_date,slot_time,status) values
-- ('2026-09-19','09:30','available'),
-- ('2026-09-19','14:00','available'),
-- ('2026-09-19','19:00','booked')
-- on conflict (slot_date,slot_time) do nothing;
