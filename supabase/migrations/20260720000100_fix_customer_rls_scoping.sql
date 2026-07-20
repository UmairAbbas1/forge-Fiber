begin;

-- ====================================================================
-- STRICT CUSTOMER ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures customer accounts CAN NEVER view orders or records of other customers
-- ====================================================================

-- 1. Orders RLS Policy
drop policy if exists "Allow customer select their own orders" on public.orders;
create policy "Allow customer select their own orders" on public.orders
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.profiles p
        join public.customers c on p.customer_id = c.id
        where p.id = auth.uid() 
        and lower(trim(public.orders.customer_name)) = lower(trim(c.name))
      )
    )
  );

-- 2. Materials RLS Policy
drop policy if exists "Allow customer select scoped materials" on public.materials;
create policy "Allow customer select scoped materials" on public.materials
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.materials.order_id and p.id = auth.uid()
      )
    )
  );

-- 3. Cutting Records RLS Policy
drop policy if exists "Allow customer select scoped cutting_records" on public.cutting_records;
create policy "Allow customer select scoped cutting_records" on public.cutting_records
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.cutting_records.order_id and p.id = auth.uid()
      )
    )
  );

-- 4. Sewing Bundles RLS Policy
drop policy if exists "Allow customer select scoped sewing_bundles" on public.sewing_bundles;
create policy "Allow customer select scoped sewing_bundles" on public.sewing_bundles
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.sewing_bundles.order_id and p.id = auth.uid()
      )
    )
  );

-- 5. Wash Batches RLS Policy
drop policy if exists "Allow customer select scoped wash_batches" on public.wash_batches;
create policy "Allow customer select scoped wash_batches" on public.wash_batches
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.wash_batches.order_id and p.id = auth.uid()
      )
    )
  );

-- 6. QC Records RLS Policy
drop policy if exists "Allow customer select scoped qc_records" on public.qc_records;
create policy "Allow customer select scoped qc_records" on public.qc_records
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.qc_records.order_id and p.id = auth.uid()
      )
    )
  );

-- 7. Cartons RLS Policy
drop policy if exists "Allow customer select scoped cartons" on public.cartons;
create policy "Allow customer select scoped cartons" on public.cartons
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.cartons.order_id and p.id = auth.uid()
      )
    )
  );

-- 8. WIP Logs RLS Policy
drop policy if exists "Allow customer select scoped wip_logs" on public.wip_logs;
create policy "Allow customer select scoped wip_logs" on public.wip_logs
  for select using (
    public.check_user_role('customer') and (
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.wip_logs.order_id and p.id = auth.uid()
      )
    )
  );

-- 9. Notifications RLS Policy
drop policy if exists "Allow customer select scoped notifications" on public.notifications;
create policy "Allow customer select scoped notifications" on public.notifications
  for select using (
    public.check_user_role('customer') and (
      public.notifications.order_id is null or
      exists (
        select 1 from public.orders o
        join public.profiles p on exists (
          select 1 from public.customers c 
          where p.customer_id = c.id and lower(trim(o.customer_name)) = lower(trim(c.name))
        )
        where o.order_id = public.notifications.order_id and p.id = auth.uid()
      )
    )
  );

commit;
