# 🏗️ Architectural Design Document: Forge & Fabric (`forge-Fiber`)

**System:** Industrial Garment Conversion & WIP Production Flow Management Platform  
**Version:** 1.4.0 Production  
**Architecture Pattern:** Client-Side Single Page Application + BaaS Edge Architecture  
**Tech Stack:** React 19, TypeScript, TanStack Start/Router, TanStack Query, Tailwind CSS, Supabase (Postgres / Auth / Realtime), Vercel Edge Network

---

## 1. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Browser & Mobile UI (React 19 + Vite)"]
        UI["Tailwind Super-White UI"]
        Router["TanStack Router (File-Based Routes)"]
        StateEngine["TanStack Query Cache + useAppData Engine"]
        AuthHook["useAuth (Session & Role Management)"]
    end

    subgraph SecurityLayer ["Edge & Network Security Layer"]
        VercelCDN["Vercel Edge Network (Global CDN + SSL)"]
        Headers["Security Headers (CSP, HSTS, X-Frame-Options)"]
    end

    subgraph BackendLayer ["Supabase Cloud Platform (Backend-as-a-Service)"]
        AuthService["Supabase Auth (JWT + Session Tokens)"]
        RealtimeWS["Supabase Realtime Engine (WebSockets - pg_changes)"]
        PostgREST["PostgREST API Gateway (Auto-REST Endpoints)"]
    end

    subgraph DatabaseLayer ["PostgreSQL Database (Multi-Tenant + RLS)"]
        RLS["Row Level Security (RLS) Policies"]
        DB[("Postgres Tables: orders, customers, profiles, materials, cutting, sewing, wash, qc, cartons")]
    end

    UI --> Router
    Router --> StateEngine
    StateEngine --> AuthHook
    
    StateEngine <-->|HTTPS REST| VercelCDN
    VercelCDN <-->|Headers & Proxied REST| PostgREST
    PostgREST <--> RLS
    RLS <--> DB

    AuthHook <-->|Auth Tokens / Sessions| AuthService
    StateEngine <-->|WSS WebSockets Live Stream| RealtimeWS
    RealtimeWS <-->|pg_changes Publication| DB
```

---

## 2. Component & Modular Layer Architecture

```mermaid
graph LR
    subgraph FrontendComponents ["Frontend Component Layer"]
        AppShell["AppShell Navbar & Global Search"]
        Dashboard["Production Pipeline & Stage Gate Tracker"]
        Intake["Order Intake & Modify Modals"]
        Modules["Trackers: Materials, Cutting, Sewing, Wash, QC, Dispatch"]
        Settings["User & Brand Management Panel"]
    end

    subgraph HooksData ["Data & State Hooks"]
        useAppData["useAppData Hook (Realtime Sync + Query Cache)"]
        useAuth["useAuth Hook (Role Guards + Session)"]
    end

    subgraph Services ["Lib & Supabase Layer"]
        SupaClient["supabase.ts (Supabase JS Client)"]
        MockData["mockData.ts (Fallback & Data Interfaces)"]
    end

    AppShell --> useAppData
    Dashboard --> useAppData
    Intake --> useAppData
    Modules --> useAppData
    Settings --> useAppData
    Settings --> useAuth

    useAppData --> SupaClient
    useAuth --> SupaClient
    SupaClient --> MockData
```

---

## 3. Database Schema & Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    CUSTOMERS ||--o{ ORDERS : "places"
    PROFILES }|..|| CUSTOMERS : "belongs to"
    ORDERS ||--o{ MATERIALS : "receives"
    ORDERS ||--o{ CUTTING_RECORDS : "cuts"
    ORDERS ||--o{ SEWING_BUNDLES : "sews"
    ORDERS ||--o{ WASH_BATCHES : "washes"
    ORDERS ||--o{ QC_RECORDS : "inspects"
    ORDERS ||--o{ CARTONS : "packs & dispatches"
    ORDERS ||--o{ NOTIFICATIONS : "triggers"

    CUSTOMERS {
        uuid id PK
        string name
        string contact
        timestamp created_at
    }

    PROFILES {
        uuid id PK, FK
        string email
        string role
        uuid customer_id FK
        string customer_name
        boolean deactivated
    }

    ORDERS {
        string order_id PK
        uuid customer_id FK
        string customer_name
        string PO_number
        string style_name
        integer order_qty
        string status
        integer current_stage
        timestamp created_date
    }

    QC_RECORDS {
        string qc_id PK
        string order_id FK
        string checkpoint
        integer inspected_qty
        integer pass_qty
        integer reject_qty
        string result
    }
```

---

## 4. Real-Time Data Synchronization & Multi-Layer Scoping Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Factory Operator / Customer
    participant App as React Frontend (useAppData)
    participant WS as Supabase Realtime WebSocket
    participant DB as Postgres Database (orders/customers)

    User->>App: Submits New Order Intake (FF-2605)
    App->>DB: POST /rest/v1/orders (Insert Row)
    DB-->>DB: Evaluate RLS Policies (is_staff / customer_id)
    DB->>WS: Broadcast pg_changes Event (INSERT orders)
    WS-->>App: Push Realtime Payload over WebSocket
    App->>App: queryClient.invalidateQueries(["orders"])
    App-->>User: UI Rerenders Instantly (<50ms) without page refresh
```

---

## 5. Security & Role-Based Access Control (RBAC) Architecture

| Layer | Security Mechanism | Enforced Rule |
| :--- | :--- | :--- |
| **Network & Transport** | Vercel Edge CDN | HTTPS 256-bit SSL, `X-Frame-Options: DENY`, `HSTS`, `nosniff` |
| **Authentication** | Supabase Auth (JWT) | Password complexity (8+ chars, upper/lower/digit/symbol), Revocable JWTs |
| **Route Protection** | React Route Guards | Unauthenticated users redirected to `/login`; Non-admins redirected from `/settings` |
| **Database Layer** | Postgres RLS Policies | Table-level isolation (`is_staff()` and `get_customer_order_ids()`) |
| **Data Scoping** | Multi-Layer Customer Engine | Customers access **only** orders linked to their own brand ID / email domain |

---

## 6. Deployment & CI/CD Pipeline

```mermaid
graph TD
    LocalDev["Local Machine (VS Code)"] -->|git push origin main| GitHub["GitHub Repo (UmairAbbas1/forge-Fiber)"]
    GitHub -->|Automated Webhook| VercelCI["Vercel Build & Deploy Engine"]
    VercelCI -->|Vite Production Build| CDN["Vercel Global Edge CDN (forge-fabric.vercel.app)"]
    CDN <-->|Environment Vars| SupabaseLive["Live Supabase Production Project"]
```

---

## 7. Operational & Production Rules
1. **Zero-Downtime Deployments:** All code pushes to the `main` branch trigger automated builds on Vercel.
2. **Zero-Polling Realtime:** Event-driven WebSockets eliminate database load.
3. **Data Integrity Gates:** Production stages (5, 8, 11, 12) strictly enforce approved `QCRecord` verification before stage progression.
