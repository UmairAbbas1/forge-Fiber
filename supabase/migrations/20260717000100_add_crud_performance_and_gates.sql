-- 1. Create Performance Indexes for RLS and Queries
create index if not exists idx_profiles_customer_id on public.profiles(customer_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_orders_customer_name on public.orders(customer_name);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_materials_order_id on public.materials(order_id);
create index if not exists idx_cutting_records_order_id on public.cutting_records(order_id);
create index if not exists idx_sewing_bundles_order_id on public.sewing_bundles(order_id);
create index if not exists idx_wash_batches_order_id on public.wash_batches(order_id);
create index if not exists idx_qc_records_order_id on public.qc_records(order_id);
create index if not exists idx_cartons_order_id on public.cartons(order_id);
create index if not exists idx_notifications_order_id on public.notifications(order_id);

-- 2. Database-level Stage-Gate Enforcement Trigger
create or replace function public.enforce_order_stage_gates()
returns trigger as $$
declare
  allowed boolean;
  checkpoint_name text;
  has_qc_record boolean;
begin
  -- Only enforce when the order stage is advancing
  if old.current_stage is not null and new.current_stage > old.current_stage then
    
    -- Gate to Stage 3: requires material sourcing record
    if new.current_stage = 3 then
      select exists (
        select 1 from public.materials m
        where m.order_id = new.order_id
      ) into allowed;
      if not allowed then
        raise exception 'No material sourcing record exists for this order. Please register fabric arrivals first.';
      end if;
    end if;

    -- Gate to Stage 4: requires all materials approved
    if new.current_stage = 4 then
      select not exists (
        select 1 from public.materials m
        where m.order_id = new.order_id and m.inspection_status != 'Approved'
      ) into allowed;
      if not allowed then
        raise exception 'Materials are not fully Approved yet — resolve all inspections before advancing to planning.';
      end if;
    end if;

    -- Gate to Stage 6: requires completed cutting record and approved first cut
    if new.current_stage = 6 then
      select exists (
        select 1 from public.cutting_records c
        where c.order_id = new.order_id and c.status = 'Completed' and c.first_cut_approval_status = 'Approved'
      ) into allowed;
      if not allowed then
        raise exception 'Requires a Cutting record with status Completed and First Cut Approval set to Approved.';
      end if;
    end if;

    -- Gate to Stage 7: requires sewing bundles fed
    if new.current_stage = 7 then
      select exists (
        select 1 from public.sewing_bundles s
        where s.order_id = new.order_id
      ) into allowed;
      if not allowed then
        raise exception 'No sewing bundle has been fed to the assembly line.';
      end if;
    end if;

    -- Gate to Stage 8: requires sewing bundles completed AND Inline Sewing QC passed or rework
    if new.current_stage = 8 then
      select not exists (
        select 1 from public.sewing_bundles s
        where s.order_id = new.order_id and s.status != 'Completed'
      ) into allowed;
      if not allowed then
        raise exception 'Sewing bundles are still active/in-progress — complete all bundles before proceeding.';
      end if;

      select exists (
        select 1 from public.qc_records q
        where q.order_id = new.order_id and q.stage_checkpoint = 'Inline Sewing QC' and q.result != 'Reject'
      ) into allowed;
      if not allowed then
        raise exception 'Requires an Inline Sewing QC record with result Pass or Rework (not Rejected) to proceed.';
      end if;
    end if;

    -- Gate to Stage 10: requires laundry wash completed to Finish or Approved
    if new.current_stage = 10 then
      select exists (
        select 1 from public.wash_batches w
        where w.order_id = new.order_id and w.stage in ('Finish', 'Approved')
      ) into allowed;
      if not allowed then
        raise exception 'Requires laundry wash batch to be completed to Finish or Approved stage.';
      end if;
    end if;

    -- Gate to Stage 11: requires laundry wash status set to Approved
    if new.current_stage = 11 then
      select exists (
        select 1 from public.wash_batches w
        where w.order_id = new.order_id and w.stage = 'Approved'
      ) into allowed;
      if not allowed then
        raise exception 'Requires laundry wash batch status to be set to Approved.';
      end if;
    end if;

    -- Gate to Stage 13: requires carton ready AND passing Final AQL-Packing Audit
    if new.current_stage = 13 then
      select exists (
        select 1 from public.cartons c
        where c.order_id = new.order_id and c.dispatch_status = 'Ready'
      ) into allowed;
      if not allowed then
        raise exception 'Requires at least one packing carton with status Ready for dispatch.';
      end if;

      select exists (
        select 1 from public.qc_records q
        where q.order_id = new.order_id and q.stage_checkpoint = 'Final AQL-Packing Audit' and q.result = 'Pass'
      ) into allowed;
      if not allowed then
        raise exception 'Requires a QC checkpoint record for Final AQL-Packing Audit with result Pass before dispatch.';
      end if;
    end if;

  end if;
  return new;
end;
$$ language plpgsql;

-- Drop trigger if it already exists to prevent duplicate trigger errors
drop trigger if exists trigger_enforce_order_stage_gates on public.orders;

create trigger trigger_enforce_order_stage_gates
  before update on public.orders
  for each row execute procedure public.enforce_order_stage_gates();

-- 3. Add Core Tables to Realtime Publication
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.qc_records;
alter publication supabase_realtime add table public.cartons;
