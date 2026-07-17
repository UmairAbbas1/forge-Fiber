-- Recreate the trigger functions with SECURITY DEFINER to bypass RLS restrictions
-- when triggered by non-admin users (such as production or qc roles).

-- 1. Materials Hold Audit Function
create or replace function public.audit_materials_hold()
returns trigger as $$
begin
  if new.inspection_status = 'Hold' then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[HOLD] Material ' || new.material_id || ' for Order ' || new.order_id || ' is on inspection HOLD.',
      new.order_id,
      'hold',
      2,
      false
    )
    on conflict (type, order_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 2. QC Rejects Audit Function
create or replace function public.audit_qc_rejects()
returns trigger as $$
begin
  if new.result = 'Reject' then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[REJECT] QC checkpoint "' || new.stage_checkpoint || '" failed for Order ' || new.order_id || '.',
      new.order_id,
      'reject',
      11,
      false
    )
    on conflict (type, order_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Orders Audit Function
create or replace function public.audit_orders_change()
returns trigger as $$
declare
  age_days numeric;
  checkpoint_name text;
  has_qc_record boolean;
begin
  -- Calculate age in days (using now() compared to order's created_date)
  age_days := extract(epoch from (now() - to_timestamp(new.created_date, 'YYYY-MM-DD'))) / 86400;

  -- Rule 3: Slow Stage (>5 days in production, stage < 13)
  if new.status = 'In Production' and new.current_stage < 13 and age_days > 5 then
    insert into public.notifications (message, order_id, type, stage_id, read)
    values (
      '[DELAY] Order ' || new.order_id || ' has been at Stage ' || new.current_stage || ' for over 5 days.',
      new.order_id,
      'slow_stage',
      new.current_stage,
      false
    )
    on conflict (type, order_id) do nothing;
  end if;

  -- Rule 5: QC Checkpoint Pending (stage in 5, 8, 11, 12, age > 2 days, no QC record)
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
      )
      on conflict (type, order_id) do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 4. Cartons Audit Function
create or replace function public.audit_cartons_change()
returns trigger as $$
declare
  order_created_date text;
  age_days numeric;
begin
  if new.dispatch_status = 'Ready' then
    select created_date into order_created_date
    from public.orders
    where order_id = new.order_id;

    if order_created_date is not null then
      age_days := extract(epoch from (now() - to_timestamp(order_created_date, 'YYYY-MM-DD'))) / 86400;

      if age_days > 10 then
        insert into public.notifications (message, order_id, type, stage_id, read)
        values (
          '[OVERDUE] Carton ' || new.carton_id || ' for Order ' || new.order_id || ' is overdue for dispatch.',
          new.order_id,
          'overdue',
          13,
          false
        )
        on conflict (type, order_id) do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
