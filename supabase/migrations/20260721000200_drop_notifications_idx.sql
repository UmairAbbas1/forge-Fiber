-- Drop the unique index that was causing the duplicate key value violation
drop index if exists public.idx_notifications_type_order_id;

-- Also try dropping it as a constraint just in case it was created as one
alter table public.notifications
  drop constraint if exists idx_notifications_type_order_id;
