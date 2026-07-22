import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  PackageOpen,
  SearchCheck,
  ClipboardCheck,
  Scissors,
  Boxes,
  Cog,
  ShieldCheck,
  Droplets,
  Sparkles,
  BadgeCheck,
  Tag,
  Truck,
  Star,
  X,
  TrendingUp,
  AlertOctagon,
  ArrowRight,
  Gauge,
  Factory,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  Lock,
  Compass
} from "lucide-react";
import { AppShell, SectionCard } from "../components/AppShell";
import { LoadingOverlay } from "../components/ui/LoadingOverlay";
import { STAGES } from "../lib/mockData";
import { useAppData, checkStageAdvancement } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";

const QC_CHECKPOINTS = [
  { after_stage: 3, name: "Material Check" },
  { after_stage: 5, name: "First Cut Approval" },
  { after_stage: 7, name: "Inline Sewing QC" },
  { after_stage: 10, name: "Wash/Finish Approval" },
  { after_stage: 12, name: "Final AQL / Packing Audit" },
] as const;

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Production Flow · Forge & Fabric" },
      { name: "description", content: "Live 13-stage garment production pipeline for Forge & Fabric — cut, make, trim conversion tracker." },
      { property: "og:title", content: "Production Flow · Forge & Fabric" },
      { property: "og:description", content: "Live 13-stage garment production pipeline for Forge & Fabric." },
    ],
  }),
  component: Page,
});

const ICONS = {
  ClipboardList, PackageOpen, SearchCheck, ClipboardCheck, Scissors,
  Boxes, Cog, ShieldCheck, Droplets, Sparkles, BadgeCheck, Tag, Truck,
} as const;

function Page() {
  const { user } = useAuth();
  const {
    orders,
    materials,
    cutting,
    sewing,
    wash,
    qc,
    advanceOrderStage,
    isOrderOnHold,
    isLoading,
    setToast,
    cartons
  } = useAppData();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<string>("All");
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "kanban">(
    user?.dashboard_view === "kanban" ? "kanban" : "pipeline"
  );

  // Role guard
  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
    } else if (!["admin", "qc"].includes(user.role)) {
      if (user.role === "customer" || user.role === "merchandiser") {
        navigate({ to: "/orders" });
      } else {
        navigate({ to: "/materials" });
      }
    }
  }, [user, navigate]);

  const customersList = useMemo(
    () => ["All", ...Array.from(new Set(orders.filter((o) => o && o.customer_name).map((o) => o.customer_name))).sort()],
    [orders]
  );

  const filteredOrders = useMemo(
    () => {
      const validOrders = orders.filter((o) => o && o.order_id);
      return customer === "All" ? validOrders : validOrders.filter((o) => o.customer_name === customer);
    },
    [customer, orders]
  );

  const countsByStage = useMemo(() => {
    const m = new Map<number, number>();
    for (const o of filteredOrders) {
      m.set(o.current_stage, (m.get(o.current_stage) ?? 0) + 1);
    }
    return m;
  }, [filteredOrders]);

  const totalOrders = filteredOrders.length;
  const inProd = filteredOrders.filter((o) => o.status === "In Production").length;
  const shipped = filteredOrders.filter((o) => o.status === "Shipped").length;
  const onHold = filteredOrders.filter((o) => o.status === "On Hold").length;

  const stageOrders = selectedStage
    ? filteredOrders.filter((o) => o && o.order_id && o.current_stage === selectedStage)
    : [];
  const stageMeta = selectedStage ? STAGES[selectedStage - 1] : null;

  // Compute total volume in pipeline
  const totalVolume = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.qty, 0);
  }, [filteredOrders]);

  // Stage advancement eligibility validation helper
  const checkAdvancement = (orderId: string, toStage: number) => {
    return checkStageAdvancement(toStage, orderId, {
      materials,
      cutting,
      sewing,
      wash,
      qc,
      cartons,
    });
  };

  const handleKanbanAdvance = (orderId: string, currentStage: number) => {
    const nextStage = currentStage + 1;
    const check = checkAdvancement(orderId, nextStage);
    if (!check.allowed) {
      setToast({
        message: `Advance Blocked: ${check.message}`,
        type: "info"
      });
      return;
    }
    advanceOrderStage(orderId, nextStage);
  };

  // Loading skeleton state
  if (orders.length === 0 && isLoading) {
    return (
      <AppShell>
        <div className="relative min-h-[400px] flex flex-col justify-start">
          {/* Skeleton Layout */}
          <div className="space-y-6 animate-pulse opacity-45 filter blur-[1px] select-none pointer-events-none">
            <div className="h-8 w-48 bg-muted rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="h-24 bg-muted rounded-xl" />
              <div className="h-24 bg-muted rounded-xl" />
              <div className="h-24 bg-muted rounded-xl" />
              <div className="h-24 bg-muted rounded-xl" />
            </div>
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
          
          {/* Premium Loading Overlay */}
          <LoadingOverlay 
            message="Loading Production Flow..." 
            description="Syncing real-time orders, material statuses, and workshop metrics."
          />
        </div>
      </AppShell>
    );
  }

  // Grouped phases definitions for Kanban columns mapping
  const KANBAN_PHASES = [
    {
      id: "phase1",
      title: "Sourcing & Materials",
      stages: [1, 2, 3],
      accentClass: "bg-primary",
      borderClass: "border-primary/30",
      badgeColor: "bg-primary/10 text-primary",
      description: "Order Intake, Consignments & Inspections"
    },
    {
      id: "phase2",
      title: "Planning & Cutting",
      stages: [4, 5, 6],
      accentClass: "bg-tertiary",
      borderClass: "border-tertiary/30",
      badgeColor: "bg-tertiary/10 text-tertiary",
      description: "PP Planning, Cutting Room & Line Feeding"
    },
    {
      id: "phase3",
      title: "Sewing & Finishing",
      stages: [7, 8, 9, 10],
      accentClass: "bg-primary",
      borderClass: "border-primary/30",
      badgeColor: "bg-primary/10 text-primary",
      description: "Sewing Assembly, Wash Finishing & ozone"
    },
    {
      id: "phase4",
      title: "QC & Logistics",
      stages: [11, 12, 13],
      accentClass: "bg-secondary",
      borderClass: "border-secondary/30",
      badgeColor: "bg-secondary/10 text-secondary",
      description: "AQL Quality Audits, Packing & POD Shipments"
    }
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        
        {/* Minimalist Top Control Bar with Smooth Slider */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          
          {/* View switcher toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all ${
                viewMode === "pipeline" ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Gauge className="h-3.5 w-3.5 inline mr-1 text-primary" /> Flow Timeline
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all ${
                viewMode === "kanban" ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5 inline mr-1 text-primary" /> Kanban Board
            </button>
          </div>

          {/* Account Brand Slider Rail */}
          <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 shrink-0 hidden sm:inline">
              Filter Brand:
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
              {customersList.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCustomer(c);
                    setSelectedStage(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all shrink-0 ${
                    customer === c
                      ? "bg-primary text-white shadow-sm font-extrabold"
                      : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  {c === "All" ? "All Accounts" : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* High-Contrast KPI grid cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Accounts Orders</span>
                <h3 className="mt-1.5 text-3xl font-black font-sans text-slate-900">{totalOrders}</h3>
              </div>
              <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0 shadow-sm">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600 font-bold" />
              <span className="font-semibold text-slate-700">{totalVolume.toLocaleString()} units in pipeline</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active WIP Production</span>
                <h3 className="mt-1.5 text-3xl font-black font-sans text-slate-900">{inProd}</h3>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary text-white grid place-items-center shrink-0 shadow-sm">
                <Factory className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium text-slate-700">Conversion active on lines</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dispatched &amp; Shipped</span>
                <h3 className="mt-1.5 text-3xl font-black font-sans text-slate-900">{shipped}</h3>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white grid place-items-center shrink-0 shadow-sm">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="font-medium text-slate-700">POD logs registered</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-600" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">On Hold Holds</span>
                <h3 className="mt-1.5 text-3xl font-black font-sans text-slate-900">{onHold}</h3>
              </div>
              <div className="h-9 w-9 rounded-xl bg-amber-600 text-white grid place-items-center shrink-0 shadow-sm">
                <AlertOctagon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1">
              {onHold > 0 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                  <span className="text-amber-700 font-bold">Action needed immediately</span>
                </>
              ) : (
                <span className="text-slate-600">No blocking holds found</span>
              )}
            </div>
          </div>
        </div>

        {/* Display either timeline or kanban view mode */}
        {viewMode === "pipeline" ? (
          /* 13-Stage Conversion Pipeline Dashboard */
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-sans font-bold text-sm tracking-wide uppercase text-slate-900">
                  13-Stage Conversion Flow Tracker
                </h3>
                <p className="text-[11px] text-slate-500">Select any operational node stage below to drill down into active floor orders.</p>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                <Gauge className="h-3.5 w-3.5 text-primary" /> Flow Visualization
              </div>
            </div>
            
            <div className="p-5">
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[1400px] relative px-4">
                  
                  {/* Horizontal flow line indicator */}
                  <div className="absolute top-8 left-16 right-16 h-0.5 bg-slate-200 z-0" />

                  {/* Stage cards row */}
                  <div className="grid grid-cols-13 gap-3 relative z-10" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
                    {STAGES.map((s) => {
                      const Icon = ICONS[s.icon as keyof typeof ICONS];
                      const count = countsByStage.get(s.id) ?? 0;
                      const active = selectedStage === s.id;
                      const hasActiveOrders = count > 0;
                      
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStage(s.id)}
                          className={`group text-left rounded-xl border p-3 transition-all duration-200 focus:outline-none flex flex-col justify-between h-40 ${
                            active
                              ? "border-primary bg-primary text-white shadow-md"
                              : "border-slate-200 bg-white hover:border-primary hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`h-6 w-6 rounded-lg grid place-items-center text-[11px] font-bold ${
                              active ? "bg-white text-primary" : "bg-slate-100 text-slate-900 border border-slate-200"
                            }`}>
                              {s.id}
                            </div>
                            
                            {/* Pulsing indicator if active orders occupy this stage */}
                            {hasActiveOrders ? (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                  active ? "bg-white" : "bg-emerald-600"
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                  active ? "bg-white" : "bg-emerald-600"
                                }`}></span>
                              </span>
                            ) : (
                              <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-400 group-hover:text-primary transition-colors"}`} />
                            )}
                          </div>
                          
                          <div className="mt-3">
                            {/* STAGE NAME IS SOLID BLACK COLOUR AS REQUESTED */}
                            <div className={`text-[11px] font-black leading-snug line-clamp-2 ${active ? "text-white" : "text-black"}`}>
                              {s.name}
                            </div>
                            {"equipment" in s && s.equipment && (
                              <div className={`mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200/60"
                              }`}>
                                {s.equipment.split(",")[0]}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-200/60 w-full flex justify-between items-center">
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold ${
                              active ? "text-white/80" : "text-slate-500"
                            }`}>
                              Active
                            </span>
                            <span className={`text-[11px] font-black ${
                              active ? "text-white bg-white/20 px-2 py-0.5 rounded-full" : "text-secondary"
                            }`}>
                              {count}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* QC checkpoint connectors */}
                  <div className="mt-6 grid relative z-10" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
                    {STAGES.map((s) => {
                      const cp = QC_CHECKPOINTS.find((c) => c.after_stage === s.id);
                      return (
                        <div key={s.id} className="flex flex-col items-center">
                          {cp ? (
                            <div className="flex flex-col items-center w-full px-1.5">
                              <div className="h-4 w-0.5 bg-dashed border-l-2 border-dashed border-gold" />
                              <div className="mt-1 bg-slate-100 border border-slate-300 rounded-lg p-2 flex items-center gap-1.5 justify-center w-full shadow-sm">
                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                                <div className="text-[9px] font-black text-slate-900 text-center uppercase tracking-wide leading-none shrink-0 truncate max-w-full">
                                  {cp.name}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-scale-up">
            {KANBAN_PHASES.map((phase) => {
              const phaseOrders = filteredOrders.filter((o) => phase.stages.includes(o.current_stage));
              
              return (
                <div key={phase.id} className="flex flex-col gap-3">
                  {/* Column Header */}
                  <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-24">
                    <div className={`absolute top-0 left-0 w-full h-1 ${phase.accentClass}`} />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black uppercase text-primary tracking-wider">{phase.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{phase.description}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${phase.badgeColor}`}>
                        {phaseOrders.length}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground">
                      Stages: {phase.stages.join(", ")}
                    </div>
                  </div>

                  {/* Kanban Cards list */}
                  <div className="bg-muted/30 border border-border/60 rounded-xl p-3 flex flex-col gap-3 min-h-[500px] overflow-y-auto max-h-[650px] divide-y divide-border/20">
                    {phaseOrders.length === 0 ? (
                      <div className="text-center py-12 text-[11px] text-muted-foreground border border-dashed border-border/80 rounded-lg bg-white my-auto">
                        <Compass className="h-6 w-6 text-muted-foreground/55 mx-auto mb-1.5" />
                        No orders in this phase.
                      </div>
                    ) : (
                      phaseOrders.map((o) => {
                        const stageInfo = STAGES.find((s) => s.id === o.current_stage);
                        const isFinalStage = o.current_stage >= 13;
                        const nextStage = o.current_stage + 1;
                        const hasHold = isOrderOnHold(o.order_id);
                        
                        // Check if eligible for next stage to color actions
                        const check = !isFinalStage ? checkAdvancement(o.order_id, nextStage) : { allowed: false };
                        
                        return (
                          <div
                            key={o.order_id}
                            className="bg-white border border-border/80 rounded-lg p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <Link
                                  to="/orders/$orderId"
                                  params={{ orderId: o.order_id }}
                                  className="text-xs font-black text-secondary hover:underline flex items-center gap-1"
                                >
                                  {o.order_id} <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                                <span className="text-[10px] font-semibold text-primary block mt-0.5">{o.customer_name}</span>
                              </div>
                              {hasHold && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/25 animate-pulse">
                                  Hold
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">Current Stage</div>
                              <div className="text-[11px] font-bold text-primary truncate">
                                Stage {o.current_stage}: {stageInfo?.name}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                                <span>PO: {o.PO_number}</span>
                                <span className="font-bold">{o.qty.toLocaleString()} pcs</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/10">
                                <div
                                  className="h-full bg-secondary transition-all"
                                  style={{ width: `${Math.min(100, Math.round((o.current_stage / 13) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* Kanban Quick Action button */}
                            {!isFinalStage ? (
                              <button
                                onClick={() => handleKanbanAdvance(o.order_id, o.current_stage)}
                                className={`w-full h-8 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                  check.allowed 
                                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-102"
                                    : "bg-muted text-muted-foreground/70 hover:bg-muted/80"
                                }`}
                                title={check.allowed ? `Advance to Stage ${nextStage}` : "Review stage gates to unlock"}
                              >
                                {!check.allowed && <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
                                Advance Stage &rarr;
                              </button>
                            ) : (
                              <div className="w-full h-8 rounded bg-success/15 border border-success/30 text-success text-[10px] font-bold flex items-center justify-center gap-1 select-none">
                                <BadgeCheck className="h-3.5 w-3.5" /> Dispatched &amp; Completed
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Stage Detail Panel (only on pipeline mode) */}
        {viewMode === "pipeline" && selectedStage && stageMeta && (
          <div className="animate-scale-up">
            <SectionCard
              title={`Stage ${stageMeta.id} Details · ${stageMeta.name}`}
              className="border-secondary/35 shadow-md"
              action={
                <div className="flex items-center gap-3">
                  {[12, 13].includes(stageMeta.id) && ["admin", "production", "qc"].includes(user?.role || "") && (
                    <Link
                      to="/dispatch"
                      className="inline-flex items-center gap-1 text-xs text-secondary font-bold hover:underline"
                    >
                      Open Packing &amp; Dispatch Line <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={() => setSelectedStage(null)}
                    className="h-7 w-7 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              }
            >
              <div className="grid md:grid-cols-3 gap-6 p-4 rounded-xl bg-muted/30 border border-border/40 mb-6">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Operational Input</div>
                  <div className="text-xs font-semibold text-primary">{stageMeta.input}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Expected Output</div>
                  <div className="text-xs font-semibold text-primary">{stageMeta.output}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Equipment &amp; Resources</div>
                  <div className="text-xs font-semibold text-primary">{"equipment" in stageMeta ? stageMeta.equipment : "Manual assembly bench"}</div>
                </div>
              </div>

              {stageOrders.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground p-4 bg-white rounded-lg border border-dashed border-border/80">
                  No orders currently processing at Stage {stageMeta.id}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 pr-4">Order ID</th>
                        <th className="py-2.5 pr-4">Customer</th>
                        <th className="py-2.5 pr-4">PO Number</th>
                        <th className="py-2.5 pr-4">Order Volume (pcs)</th>
                        <th className="py-2.5 pr-4">Pipeline Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageOrders.map((o) => {
                        const orderId = o?.order_id || "";
                        const customerName = o?.customer_name || "Unknown Customer";
                        const poNumber = o?.PO_number || "N/A";
                        const qty = o?.qty ?? 0;
                        const status = o?.status || "Open";
                        return (
                          <tr key={orderId || Math.random().toString()} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4 font-semibold text-primary">
                              {orderId ? (
                                <Link to="/orders/$orderId" params={{ orderId }} className="text-secondary hover:underline">
                                  {orderId}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                              {orderId && isOrderOnHold(orderId) && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/25">On Hold</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 font-medium text-foreground">{customerName}</td>
                            <td className="py-3 pr-4 text-xs font-mono text-muted-foreground">{poNumber}</td>
                            <td className="py-3 pr-4 font-semibold">{qty.toLocaleString()} units</td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* Business Model Conversion Flow Overview */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-primary">
              Forge &amp; Fabric Conversion business model
            </h3>
          </div>
          <div className="p-5">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl border border-border/60 bg-white hover:shadow-sm transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-navy" />
                <div className="flex gap-3.5 items-start">
                  <div className="h-8 w-8 rounded-lg bg-navy/10 text-navy grid place-items-center text-xs font-black shrink-0">1</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">Customer Consigns Materials</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Brand buyers supply premium fabrics, customized trims, and specific accessories directly to the facility.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-white hover:shadow-sm transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gold" />
                <div className="flex gap-3.5 items-start">
                  <div className="h-8 w-8 rounded-lg bg-gold/10 text-warning-foreground grid place-items-center text-xs font-black shrink-0">2</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">Transformation &amp; Sewing</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Factory floor handles pattern cut layouts, operations sewing line bundles, laundry washed finishes, and QC checks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-white hover:shadow-sm transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-success" />
                <div className="flex gap-3.5 items-start">
                  <div className="h-8 w-8 rounded-lg bg-success/10 text-success grid place-items-center text-xs font-black shrink-0">3</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">Finished Carton Shipment</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Finished garments are pressed, tagged, packed in boxes, and shipped out with registered POD tracking numbers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
