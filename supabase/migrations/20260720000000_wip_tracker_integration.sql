-- Migration: 20260720000000_wip_tracker_integration.sql
-- Integrates Forge_Fabric_WIP_Production_Tracker.xlsx specification into Supabase PostgreSQL

-- 1. Extend Orders Table with Excel WIP Tracker Fields
alter table public.orders
add column if not exists style_no text,
add column if not exists style_description text,
add column if not exists color text,
add column if not exists planned_ship_date text,
add column if not exists material_status text default 'Pending',
add column if not exists delivered_qty integer default 0,
add column if not exists open_balance integer default 0,
add column if not exists delivery_status text default 'Pending';

-- 2. Extend Cartons Table with Excel Delivery Log Fields
alter table public.cartons
add column if not exists carrier text,
add column if not exists customer_acceptance text default 'Pending',
add column if not exists invoice_ref text,
add column if not exists remarks text;

-- 3. Create WIP Movement Logs Table (WIPLog Sheet)
create table if not exists public.wip_logs (
  log_id text primary key,
  order_id text references public.orders(order_id) on delete cascade,
  stage_id integer not null,
  movement_type text not null check (movement_type in ('IN', 'OUT', 'REWORK', 'REJECT', 'HOLD', 'ADJUSTMENT')),
  qty_in integer default 0,
  qty_out integer default 0,
  rework_qty integer default 0,
  reject_qty integer default 0,
  net_wip_impact integer default 0,
  qc_status text default 'Not Checked',
  operator text,
  batch_lot text,
  remarks text,
  updated_by text,
  log_date text default to_char(now(), 'YYYY-MM-DD')
);

-- Index for fast order WIP log lookups
create index if not exists idx_wip_logs_order_id on public.wip_logs(order_id);
create index if not exists idx_wip_logs_stage_id on public.wip_logs(stage_id);

-- Enable RLS on wip_logs
alter table public.wip_logs enable row level security;

-- 4. RLS Policies for WIP Logs
drop policy if exists "Allow admin full access on wip_logs" on public.wip_logs;
create policy "Allow admin full access on wip_logs" on public.wip_logs
  for all using (public.check_user_role('admin'));

drop policy if exists "Allow production full access on wip_logs" on public.wip_logs;
create policy "Allow production full access on wip_logs" on public.wip_logs
  for all using (public.check_user_role('production'));

drop policy if exists "Allow qc full access on wip_logs" on public.wip_logs;
create policy "Allow qc full access on wip_logs" on public.wip_logs
  for all using (public.check_user_role('qc'));

drop policy if exists "Allow merchandiser select on wip_logs" on public.wip_logs;
create policy "Allow merchandiser select on wip_logs" on public.wip_logs
  for select using (public.check_user_role('merchandiser'));

drop policy if exists "Allow customer select scoped wip_logs" on public.wip_logs;
create policy "Allow customer select scoped wip_logs" on public.wip_logs
  for select using (
    exists (
      select 1 from public.orders o
      join public.profiles p on o.customer_name = (select name from public.customers where id = p.customer_id)
      where p.id = auth.uid() and o.order_id = public.wip_logs.order_id
    )
  );

-- 5. Safe Realtime Publication Addition
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_publication p on pr.prpubid = p.oid
    join pg_class c on pr.prrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'wip_logs'
  ) then
    alter publication supabase_realtime add table public.wip_logs;
  end if;
end;
$$;
