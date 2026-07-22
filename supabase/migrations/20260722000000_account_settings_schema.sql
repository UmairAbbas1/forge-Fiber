-- Migration: Account Settings Schema

-- Extend public.profiles
alter table public.profiles
add column if not exists full_name text,
add column if not exists contact_phone text,
add column if not exists notification_prefs jsonb default '{}'::jsonb,
add column if not exists display_theme text default 'light',
add column if not exists dashboard_view text default 'default';

-- Extend public.customers
alter table public.customers
add column if not exists billing_address text,
add column if not exists shipping_address text;

-- Notify PostgREST to reload schema
notify pgrst, 'reload schema';
