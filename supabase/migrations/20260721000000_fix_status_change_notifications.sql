-- ====================================================================
-- FIX: Status Change Notifications
-- Problem: No DB trigger for order status changes (Hold, In Production, etc.)
-- Problem: Unique constraint on (type, order_id) prevents repeated notifications
-- Fix: Drop old constraint, add new trigger for status changes
-- ====================================================================

-- 1. Drop the old unique constraint that blocks repeated status notifications
alter table public.notifications
  drop constraint if exists notifications_type_order_id_key;

-- 2. Allow INSERT on notifications for all authenticated users
--    (so the app can write status-change notifications from the client)
drop policy if exists "Allow authenticated insert on notifications" on public.notifications;
create policy "Allow authenticated insert on notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');

-- 3. Drop old audit trigger function and recreate with status-change support
drop trigger if exists trigger_orders_audit on public.orders;
drop function if exists public.audit_orders_change();

create or replace function public.audit_orders_change()
returns trigger as $$
declare
  age_days numeric;
  checkpoint_name text;
  has_qc_record boolean;
begin
  -- Rule: Order put On Hold
  if new.status = 'On Hold' and (old.status is null or old.status <> 'On Hold') then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[HOLD] Order ' || new.order_id || ' has been put on hold.',
      new.order_id,
      'hold',
      coalesce(new.current_stage, 1),
      false
    );
  end if;

  -- Rule: Order moved to In Production
  if new.status = 'In Production' and (old.status is null or old.status <> 'In Production') then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[UPDATE] Order ' || new.order_id || ' is now In Production.',
      new.order_id,
      'status_update',
      coalesce(new.current_stage, 1),
      false
    );
  end if;

  -- Rule: Order Shipped
  if new.status = 'Shipped' and (old.status is null or old.status <> 'Shipped') then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[SHIPPED] Order ' || new.order_id || ' has been shipped!',
      new.order_id,
      'status_update',
      13,
      false
    );
  end if;

  -- Rule: Order back to Open
  if new.status = 'Open' and (old.status is null or old.status <> 'Open') and old.status is not null then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[UPDATE] Order ' || new.order_id || ' status changed to Open.',
      new.order_id,
      'status_update',
      coalesce(new.current_stage, 1),
      false
    );
  end if;

  -- Calculate age in days
  age_days := extract(epoch from (now() - to_timestamp(new.created_date, 'YYYY-MM-DD'))) / 86400;

  -- Rule: Slow Stage (>5 days in production, stage < 13)
  if new.status = 'In Production' and new.current_stage < 13 and age_days > 5 then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[DELAY] Order ' || new.order_id || ' has been at Stage ' || new.current_stage || ' for over 5 days.',
      new.order_id,
      'slow_stage',
      new.current_stage,
      false
    );
  end if;

  -- Rule: QC Checkpoint Pending
  if new.status = 'In Production' and new.current_stage in (5, 8, 11, 12) and age_days > 2 then
    checkpoint_name := case new.current_stage
      when 5 then 'First Cut Approval'
      when 8 then 'Inline Sewing QC'
      when 11 then 'Wash-Finish Approval'
      when 12 then 'Final AQL-Packing Audit'
    end;

    select exists (
      select 1 from public.qc_records q
      where q.order_id = new.order_id and q.stage_checkpoint = checkpoint_name
    ) into has_qc_record;

    if not has_qc_record then
      insert into public.notifications (message, order_id, type, stage_id, read)
      values (
        '[QC PENDING] Order ' || new.order_id || ' at Stage ' || new.current_stage || ' for >2 days — "' || checkpoint_name || '" audit not completed.',
        new.order_id,
        'qc_checkpoint_pending',
        new.current_stage,
        false
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_orders_audit
  after insert or update on public.orders
  for each row execute procedure public.audit_orders_change();

-- 4. Also fix materials hold trigger to allow duplicates (remove on conflict do nothing so each hold event creates a new notification)
drop trigger if exists trigger_materials_audit on public.materials;
drop function if exists public.audit_materials_hold();

create or replace function public.audit_materials_hold()
returns trigger as $$
begin
  if new.inspection_status = 'Hold' and (old.inspection_status is null or old.inspection_status <> 'Hold') then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[HOLD] Material ' || new.material_id || ' for Order ' || new.order_id || ' is on inspection HOLD.',
      new.order_id,
      'hold',
      2,
      false
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_materials_audit
  after insert or update on public.materials
  for each row execute procedure public.audit_materials_hold();
