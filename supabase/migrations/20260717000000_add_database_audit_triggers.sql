-- 1. Add unique constraint to notifications table to enable deduplication
alter table public.notifications 
add constraint notifications_type_order_id_key unique (type, order_id);

-- 2. Trigger Function for Materials Hold (Rule 1)
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
$$ language plpgsql;

create trigger trigger_materials_audit
  after insert or update on public.materials
  for each row execute procedure public.audit_materials_hold();

-- 3. Trigger Function for QC Rejects (Rule 2)
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
$$ language plpgsql;

create trigger trigger_qc_records_audit
  after insert or update on public.qc_records
  for each row execute procedure public.audit_qc_rejects();

-- 4. Trigger Function for Orders (Rule 3 & Rule 5)
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
$$ language plpgsql;

create trigger trigger_orders_audit
  after insert or update on public.orders
  for each row execute procedure public.audit_orders_change();

-- 5. Trigger Function for Cartons (Rule 4)
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
$$ language plpgsql;

create trigger trigger_cartons_audit
  after insert or update on public.cartons
  for each row execute procedure public.audit_cartons_change();

-- 6. Stored Procedure to scan and audit all existing records (runs once on demand)
create or replace function public.audit_all_existing_records()
returns void as $$
begin
  -- Run holds
  insert into public.notifications (message, order_id, type, stage_id, read)
  select 
    '[HOLD] Material ' || m.material_id || ' for Order ' || m.order_id || ' is on inspection HOLD.',
    m.order_id,
    'hold',
    2,
    false
  from public.materials m
  where m.inspection_status = 'Hold'
  on conflict (type, order_id) do nothing;

  -- Run QC rejects
  insert into public.notifications (message, order_id, type, stage_id, read)
  select 
    '[REJECT] QC checkpoint "' || q.stage_checkpoint || '" failed for Order ' || q.order_id || '.',
    q.order_id,
    'reject',
    11,
    false
  from public.qc_records q
  where q.result = 'Reject'
  on conflict (type, order_id) do nothing;

  -- Run slow stages
  insert into public.notifications (message, order_id, type, stage_id, read)
  select 
    '[DELAY] Order ' || o.order_id || ' has been at Stage ' || o.current_stage || ' for over 5 days.',
    o.order_id,
    'slow_stage',
    o.current_stage,
    false
  from public.orders o
  where o.status = 'In Production' 
    and o.current_stage < 13 
    and (extract(epoch from (now() - to_timestamp(o.created_date, 'YYYY-MM-DD'))) / 86400) > 5
  on conflict (type, order_id) do nothing;

  -- Run overdues
  insert into public.notifications (message, order_id, type, stage_id, read)
  select 
    '[OVERDUE] Carton ' || c.carton_id || ' for Order ' || c.order_id || ' is overdue for dispatch.',
    c.order_id,
    'overdue',
    13,
    false
  from public.cartons c
  join public.orders o on c.order_id = o.order_id
  where c.dispatch_status = 'Ready'
    and (extract(epoch from (now() - to_timestamp(o.created_date, 'YYYY-MM-DD'))) / 86400) > 10
  on conflict (type, order_id) do nothing;

  -- Run QC pending
  insert into public.notifications (message, order_id, type, stage_id, read)
  select 
    '[QC PENDING] Order ' || o.order_id || ' at Stage ' || o.current_stage || ' for >2 days — "' || 
    case o.current_stage
      when 5 then 'First Cut Approval'
      when 8 then 'Inline Sewing QC'
      when 11 then 'Wash-Finish Approval'
      when 12 then 'Final AQL-Packing Audit'
    end || '" audit not completed.',
    o.order_id,
    'qc_checkpoint_pending',
    o.current_stage,
    false
  from public.orders o
  where o.status = 'In Production'
    and o.current_stage in (5, 8, 11, 12)
    and (extract(epoch from (now() - to_timestamp(o.created_date, 'YYYY-MM-DD'))) / 86400) > 2
    and not exists (
      select 1 from public.qc_records q
      where q.order_id = o.order_id 
        and q.stage_checkpoint = case o.current_stage
          when 5 then 'First Cut Approval'
          when 8 then 'Inline Sewing QC'
          when 11 then 'Wash-Finish Approval'
          when 12 then 'Final AQL-Packing Audit'
        end
    )
  on conflict (type, order_id) do nothing;
end;
$$ language plpgsql;

-- Execute for existing records
select public.audit_all_existing_records();

-- 7. Add notifications table to Realtime publication
alter publication supabase_realtime add table public.notifications;
