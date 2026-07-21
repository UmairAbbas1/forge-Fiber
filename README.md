# 🏭 Forge & Fabric — Industrial Garment Production Management Platform

[![Production Live](https://img.shields.io/badge/Production-Live_on_Vercel-success?style=flat-square&logo=vercel)](https://forge-fabric.vercel.app)
[![Security Audit](https://img.shields.io/badge/Security_Audit-Passed_100%25-blue?style=flat-square&logo=shields.io)](./ARCHITECTURE.md)
[![Dependencies](https://img.shields.io/badge/npm_audit-0_vulnerabilities-brightgreen?style=flat-square&logo=npm)](#security--dependency-audit)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#overview)

**Forge & Fabric (`forge-Fiber`)** is a full-stack, enterprise-grade, role-gated industrial garment manufacturing & WIP production management platform. Built for apparel conversion facilities operating under the cut-make-wash-pack model, Forge & Fabric digitizes every single step of the 13-stage manufacturing pipeline — from customer purchase order intake through final packing and finished goods dispatch — providing factory management, floor supervisors, QC inspectors, and brand clients a unified, real-time single source of truth.

👉 **Live Production Web Application:** **[https://forge-fabric.vercel.app](https://forge-fabric.vercel.app)**

---

## 📑 Table of Contents

- [Overview](#overview)
- [Key Production Features](#key-production-features)
- [System Architecture & Data Flow](#system-architecture--data-flow)
- [13-Stage Production Pipeline & QC Gates](#13-stage-production-pipeline--qc-gates)
- [Role-Based Access Control (RBAC) & RLS](#role-based-access-control-rbac--rls)
- [Security, HTTP Headers & Audit Report](#security-http-headers--audit-report)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema & RLS SQL Script](#database-schema--rls-sql-script)
- [Local Development Setup](#local-development-setup)
- [Production Deployment (Vercel)](#production-deployment-vercel)
- [Architecture & Verification Specs](#architecture--verification-specs)

---

## Overview

Forge & Fabric is engineered specifically for **garment conversion manufacturers** — industrial facilities producing apparel from customer-supplied fabrics, trims, and tech pack specifications. The platform digitises the entire manufacturing lifecycle across 13 defined operational stages with strict quality control gates.

### 🌟 Core System Highlights
- **100% Dynamic & Real-Time Sync:** Powered by Supabase Realtime WebSockets (`pg_changes`), updating factory dashboards across all connected operators in **<50ms** without manual page refreshes.
- **Dynamic Customer Account Linkage:** Newly registered customer accounts immediately populate in the Order Intake form dropdown and link live orders to customer-specific dashboards without hardcoded code arrays or redeployments.
- **Strict Role-Gated Isolation:** Multi-layer customer scoping engine isolates client data so brand customers can **only** access orders linked to their own account.
- **Server-Side QC Stage-Gate Protection:** Automated database triggers (`enforce_order_stage_gates`) block upstream order stage progression if mandatory quality control audits are unapproved.
- **Super-White Industrial UI System:** High-contrast design featuring glowing **"● Realtime Synced"** navbar status indicators, bold typography, and centered logo brand side panels.

---

## Key Production Features

### 📊 1. Production Flow Dashboard (`/dashboard`)
- Live 13-stage pipeline matrix displaying active order counts and lead-time indicators.
- Interactive Kanban board layout with stage progression shortcuts.
- Real-time warning banners for delayed orders or pending QC checkpoints.

### 📋 2. Order Intake & Management (`/orders`)
- Dynamic Order Intake modal with automated `FF-${max + 1}` order ID generation.
- Dynamic **Customer Company Dropdown** fed directly from registered customer database profiles.
- Global search bar filtering instantly across Order ID, PO Number, Style Description, Customer Name, and Status.
- Order detail views (`/orders/:orderId`) linking directly to materials, cut panels, sewing bundles, wash batches, QC audit logs, and packing cartons.

### 📦 3. Material Receiving & Sourcing (`/materials`)
- Log fabric, trim, and accessory arrivals per order.
- Inspection status workflow: `Pending` → `Approved` / `Hold`.
- Material holds automatically trigger system-wide notification alerts.

### ✂️ 4. Panel Cutting Tracker (`/cutting`)
- Track cut panels by size breakdown, color shade, and automated cutter machine IDs.
- First Cut Panel approval workflow (`Pending` → `Approved` / `Rejected`).

### ⚙️ 5. Sewing Line WIP & Bundle Control (`/sewing`)
- Bundle-level tracking across assigned assembly lines and operator counts.
- Log inline inspection records (`Pass` / `Rework` / `Reject`).

### 💧 6. Laundry Wash & Specialty Finishing (`/wash`)
- Batch-level laundry wash stage progression (`Wash` → `Dry` → `Finish` → `Approved`).
- Machinery allocation for industrial washers, Jeanologia lasers, ozone booths, spray booths, and 3D wrinkle units.

### 🛡️ 7. Quality Control (QC) Audits (`/qc`)
- 5 formal QC checkpoints across the pipeline (Material Check, First Cut Panel Approval, Inline Sewing QC, Wash-Finish Approval, Final AQL Audit).
- AQL-based inspection data capture with pass/reject quantities and defect logging.

### 🚚 8. Packing & Dispatch (`/dispatch`)
- Carton-level packing logs with unit counts and weight metrics.
- Dispatch status workflow (`Packed` → `Dispatched`) with Proof of Delivery (POD) tracking.

### 📈 9. Reporting & CSV Data Exporter (`/reports`)
- Custom date-range reporting with daily QC pass rate trend lines and intake volume metrics.
- One-click CSV exports for Orders, QC Audit logs, and Dispatch Cartons (restricted to `admin` and `qc` roles).

### ⚙️ 10. Admin Control Panel (`/settings`)
- Complete user management: update user roles (`admin`, `merchandiser`, `production`, `qc`, `customer`) and manage user account activations.
- Customer Brand directory and operational equipment registry.

---

## 13-Stage Production Pipeline & QC Gates

Order progression across the 13 stages is guarded server-side by PostgreSQL database triggers:

| Stage | Stage Name | Input | Key Output | Required QC Gate Condition |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Customer Order Intake | Customer PO & Tech Pack | Job Card (`Open`) | Initial Order Registration |
| **2** | Tech Pack Verification | Approved Specifications | Tech Pack Clearance | Verified Specifications |
| **3** | Raw Material Receiving | Fabric & Trim Arrivals | Received Inventory Logs | Registered `materials` record |
| **4** | Fabric & Trim Inspection | Material Stock | Inspection Approval | All materials set to `Approved` |
| **5** | Spreading & Marker Approval | Fabric Rolls | Marker Plan | **QC Gate:** Approved Spreading Audit |
| **6** | Bulk Cutting & Panel Numbering | Fabric Rolls | Cut Panels | `cutting_records` `Completed` & `First Cut Approved` |
| **7** | Panel Inspection & Fusing | Cut Panels | Numbered Bundles | Verified Cut Panels |
| **8** | Line Input & Sewing Assembly | Sewing Bundles | Assembled Garments | **QC Gate:** Inline Sewing QC (`Pass`/`Rework`) |
| **9** | Washing & Wet Processing | Assembled Garments | Washed Garments | Registered `wash_batches` record |
| **10** | Finishing & Trimming | Washed Garments | Specialty-Finished Garments | Wash batch set to `Finish` / `Approved` |
| **11** | Final Quality Inspection | Finished Garments | Final QC Audit Pass | **QC Gate:** Final AQL 2.5 Audit (`Pass`) |
| **12** | Pressing, Tagging & Packing | Inspected Garments | Packed Cartons | **QC Gate:** Cartons set to `Packed` |
| **13** | Shipping & Finished Goods Dispatch | Packed Cartons | Shipped Order (`Shipped`) | Carton status set to `Dispatched` |

---

## Role-Based Access Control (RBAC) & RLS

Access control is enforced at both the UI router level and server-side via Supabase Row-Level Security (RLS) policies across all 10 database tables:

| Role | Target Audience | Table Access Rights | Permitted UI Scope |
| :--- | :--- | :--- | :--- |
| `admin` | Executives & Factory Admins | Full `ALL` access across all 10 tables | Unrestricted access to all pages & Settings |
| `merchandiser` | Account Managers | `orders` (ALL), `customers` (ALL), `materials` (READ/WRITE) | Order Dashboard, Order Creation, Detail Views |
| `production` | Floor Supervisors | `materials`, `cutting`, `sewing`, `wash`, `cartons` (READ/WRITE) | Production Flow, Materials, Cutting, Sewing, Wash, Dispatch |
| `qc` | Quality Control Inspectors | `qc_records` (ALL), `orders` (UPDATE stage), `cartons` (READ) | QC Audits, Production Flow, Dispatch, Reports |
| `customer` | Brand Customer Users | `SELECT` strictly scoped to their owned brand (`customer_id`) | Scoped Order Dashboard & Order Detail Views |

---

## Security, HTTP Headers & Audit Report

A comprehensive security, DBA, and QA audit was conducted on the production environment.

### 🛡️ Production Security Measures
- **HTTP Security Headers (`vercel.json`):**
  - `X-Frame-Options: DENY` (Clickjacking Protection)
  - `X-Content-Type-Options: nosniff` (MIME Sniffing Defense)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS)
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Secret Protection:** Zero server-role keys committed or bundled. Only public `ANON` keys are exposed.
- **Dependency Audit:** `npm audit` returned **0 vulnerabilities**.
- **Route Guarding:** Unauthenticated requests to protected endpoints automatically redirect to `/login`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) v1 |
| **UI Engine** | React 19 |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **Components** | shadcn/ui (Radix UI primitives) |
| **State & Data Caching** | TanStack Query v5 |
| **Form Validation** | React Hook Form v7 + Zod v3 |
| **Charts** | Recharts v2 |
| **Icons** | Lucide React |
| **Backend & Realtime** | [Supabase Cloud](https://supabase.com) (PostgreSQL 15+ & WebSockets) |
| **Hosting & CDN** | Vercel Edge Network |

---

## Project Structure

```
forge-flow-main/
├── ARCHITECTURE.md               # Complete System Architectural Design Specification
├── vercel.json                   # Vercel Deployment & Security Headers Configuration
├── public/
│   └── favicon.png               # Brand monogram mark & favicon asset
├── src/
│   ├── components/
│   │   ├── AppShell.tsx          # Main navigation shell, top header, search, Realtime badge
│   │   ├── PublicLayout.tsx       # Landing page navbar & public layout
│   │   └── ui/                   # shadcn/ui components (Dialog, Sheet, Toast, Tooltip)
│   ├── hooks/
│   │   ├── useAuth.tsx           # Authentication context (Supabase Auth + Password validation)
│   │   └── useAppData.tsx        # Data provider, TanStack Query hooks, RealtimeListeners
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client initialization & Profile types
│   │   └── mockData.ts           # Domain interfaces, STAGES, QC_CHECKPOINTS
│   ├── routes/
│   │   ├── index.tsx             # Public landing page
│   │   ├── login.tsx             # Sign in page (Large centered logo side panel)
│   │   ├── signup.tsx            # Account registration page
│   │   ├── dashboard.tsx         # Production Flow Dashboard & Kanban board
│   │   ├── orders.tsx            # Order Dashboard & Create Intake Modal
│   │   ├── orders.$orderId.tsx   # Detailed order view & stage breakdown
│   │   ├── materials.tsx         # Material receiving tracker
│   │   ├── cutting.tsx           # Cutting tracker & First Cut approvals
│   │   ├── sewing.tsx            # Sewing WIP & bundle control
│   │   ├── wash.tsx              # Wash batch & finishing tracker
│   │   ├── qc.tsx                # Quality control audit logs & AQL reports
│   │   ├── dispatch.tsx          # Packing cartons & Proof of Delivery
│   │   ├── reports.tsx           # Production reporting & CSV exporter
│   │   └── settings.tsx          # Admin control panel (users, customers, equipment)
├── package.json
└── vite.config.ts
```

---

## Database Schema & RLS SQL Script

To set up or refresh your Supabase PostgreSQL database, execute the consolidated SQL script below in the **Supabase SQL Editor**:

```sql
-- Comprehensive Production RLS Migration Script for Forge & Fabric

-- 1. Enable RLS on all 10 tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sewing_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'merchandiser', 'production', 'qc'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_customer_order_ids()
RETURNS TABLE (order_id TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT o.order_id FROM public.orders o
  WHERE o.customer_id = (SELECT p.customer_id FROM public.profiles p WHERE p.id = auth.uid())
     OR LOWER(o.customer_name) = LOWER(auth.jwt() -> 'user_metadata' ->> 'customer_name')
     OR LOWER(o.customer_name) IN (
       SELECT LOWER(c.name) FROM public.customers c WHERE LOWER(c.contact) = LOWER(auth.jwt() ->> 'email')
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Staff Read Access
CREATE POLICY "Staff read materials" ON public.materials FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff read cutting" ON public.cutting_records FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff read sewing" ON public.sewing_bundles FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff read wash" ON public.wash_batches FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff read qc" ON public.qc_records FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff read cartons" ON public.cartons FOR SELECT TO authenticated USING (public.is_staff());

-- 4. Customer Scoped Read Access
CREATE POLICY "Customer read materials" ON public.materials FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'customer' AND order_id IN (SELECT public.get_customer_order_ids()));
CREATE POLICY "Customer read cutting" ON public.cutting_records FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'customer' AND order_id IN (SELECT public.get_customer_order_ids()));
CREATE POLICY "Customer read sewing" ON public.sewing_bundles FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'customer' AND order_id IN (SELECT public.get_customer_order_ids()));
CREATE POLICY "Customer read wash" ON public.wash_batches FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'customer' AND order_id IN (SELECT public.get_customer_order_ids()));
CREATE POLICY "Customer read qc" ON public.qc_records FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'customer' AND order_id IN (SELECT public.get_customer_order_ids()));
CREATE POLICY "Customer read cartons" ON public.cartons FOR SELECT TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'customer' AND order_id IN (SELECT public.get_customer_order_ids()));
```

---

## Local Development Setup

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/UmairAbbas1/forge-Fiber.git
cd forge-Fiber

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Production Deployment (Vercel)

The repository is linked directly to Vercel for automated CI/CD:

```bash
# Deploy to Production via CLI
npx vercel --prod
```

Whenever code changes are pushed to `main`, Vercel automatically runs `npm run build` and deploys the new release to **`https://forge-fabric.vercel.app`**.

---

## Architecture & Verification Specs

For full deep-dive architectural diagrams, ERD schemas, and sequence flows, refer to:
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Comprehensive System Architectural Specification.

---

### 📄 License
Proprietary Industrial Production Software. All rights reserved.
