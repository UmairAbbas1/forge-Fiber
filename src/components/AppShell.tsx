import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Workflow,
  ClipboardList,
  PackageOpen,
  Scissors,
  Cog,
  Droplets,
  ShieldCheck,
  Search,
  Bell,
  Shield,
  LogOut,
  User,
  Truck,
  TrendingUp,
  MailCheck,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAppData } from "../hooks/useAppData";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { Sheet, SheetContent } from "./ui/sheet";

const NAV = [
  { to: "/dashboard", label: "Production Flow", icon: Workflow },
  { to: "/orders", label: "Order Dashboard", icon: ClipboardList },
  { to: "/materials", label: "Material Receiving", icon: PackageOpen },
  { to: "/cutting", label: "Cutting Tracker", icon: Scissors },
  { to: "/sewing", label: "Sewing WIP", icon: Cog },
  { to: "/wash", label: "Wash & Finishing", icon: Droplets },
  { to: "/qc", label: "Quality Control", icon: ShieldCheck },
  { to: "/dispatch", label: "Packing & Dispatch", icon: Truck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { notifications, markNotificationAsRead, toast, globalSearchQuery, setGlobalSearchQuery } = useAppData();
  const [now, setNow] = useState<string>("");
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Responsive Sidebar States
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("forge_flow_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("forge_flow_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
    }
  }, [user, navigate]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Handle outside clicks to close notifications panel
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
          <p className="text-xs text-muted-foreground">Authenticating user session...</p>
        </div>
      </div>
    );
  }

  // Filter navigation links based on user role
  const allowedNav = NAV.filter((item) => {
    switch (user.role) {
      case "admin":
        return true; // Admin gets everything
      case "merchandiser":
        return item.to === "/orders";
      case "production":
        return ["/materials", "/cutting", "/sewing", "/wash", "/qc", "/dispatch"].includes(item.to);
      case "qc":
        return ["/dashboard", "/materials", "/cutting", "/sewing", "/wash", "/qc", "/dispatch"].includes(item.to);
      case "customer":
        return item.to === "/orders";
      default:
        return false;
    }
  });

  // Gated Reports & Export
  const reportsNav = ["admin", "qc"].includes(user.role)
    ? [...allowedNav, { to: "/reports", label: "Reporting & Export", icon: TrendingUp }]
    : allowedNav;

  // Gated Admin Settings
  const finalNav = user.role === "admin"
    ? [...reportsNav, { to: "/settings", label: "Settings", icon: Shield }]
    : reportsNav;

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/25",
    merchandiser: "bg-blue-500/10 text-blue-500 border-blue-500/25",
    production: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
    qc: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/25",
    customer: "bg-slate-500/10 text-slate-500 border-slate-500/25",
  };

  // Role scoped notifications filtering
  const filteredNotifications = notifications.filter((n) => {
    if (user.role === "admin" || user.role === "qc") return true;
    if (user.role === "merchandiser") return ["hold", "slow_stage"].includes(n.type);
    if (user.role === "production") return ["hold", "reject", "overdue"].includes(n.type);
    return true; // customer already order-scoped at hook level
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const handleNotifClick = (notifId: string, orderId: string) => {
    markNotificationAsRead(notifId);
    setShowNotifs(false);
    navigate({ to: "/orders/$orderId", params: { orderId } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      
      {/* Mobile Menu Drawer (Radix-based Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground w-64 border-r border-sidebar-border">
          <div className="flex flex-col h-full">
            <div className="px-5 py-5 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-md bg-gold text-gold-foreground grid place-items-center font-black text-lg">
                  F
                </div>
                <div className="leading-tight">
                  <div className="font-display font-bold text-sm tracking-wide text-sidebar-foreground">FORGE &amp; FABRIC</div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
                    Built to craft
                  </div>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {finalNav.map((item) => {
                const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary font-semibold"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            
            <div className="px-5 py-4 border-t border-sidebar-border text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Made to last
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="px-4 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-9 w-9 rounded-md bg-gold text-gold-foreground grid place-items-center font-black text-lg shrink-0">
              F
            </div>
            {!collapsed && (
              <div className="leading-tight transition-all duration-300">
                <div className="font-display font-bold text-sm tracking-wide">FORGE &amp; FABRIC</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
                  Built to craft
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={toggleCollapsed}
            className="p-1.5 rounded bg-sidebar-accent/40 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground transition-all focus:outline-none"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 px-3 py-4 space-y-1.5">
            {finalNav.map((item) => {
              const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              const Icon = item.icon;
              
              const linkEl = (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center rounded-md text-sm transition-all focus:outline-none ${
                    collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2"
                  } ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      {linkEl}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-primary text-white text-xs font-semibold px-2 py-1 rounded shadow">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkEl;
            })}
          </nav>
        </TooltipProvider>

        <div className="px-5 py-4 border-t border-sidebar-border text-[9px] uppercase tracking-widest text-sidebar-foreground/50 truncate text-center">
          {collapsed ? "F&F" : "Made to last"}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 h-14">
            
            {/* Hamburger Icon for Mobile view */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-lg focus:outline-none"
                title="Open Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="md:hidden font-display font-bold text-sm">FORGE &amp; FABRIC</div>
            </div>

            <div className="flex-1 flex items-center max-w-xl mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Search order ID, PO, customer…"
                  className="w-full pl-9 pr-3 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </div>
            
            {/* Header Right */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground border-r border-border pr-4">
                <span>{now}</span>
              </div>
              
              {/* Notifications Popover */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg transition-all"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-white text-[9px] font-black grid place-items-center animate-scale-up">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-outline-variant shadow-2xl rounded-xl z-50 animate-scale-up overflow-hidden">
                    <div className="px-4 py-3 border-b border-outline-variant/60 flex justify-between items-center bg-muted/20">
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-primary">Recent Production Alerts</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] text-destructive font-semibold">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                      {filteredNotifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                          <MailCheck className="h-8 w-8 text-muted/60 mx-auto" />
                          <p className="font-semibold text-foreground/80">All caught up!</p>
                          <p>No active stage alerts or quality flags found.</p>
                        </div>
                      ) : (
                        filteredNotifications
                          .sort((a, b) => Number(a.read) - Number(b.read) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((n) => (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n.id, n.order_id)}
                              className={`w-full p-3.5 text-left hover:bg-muted/30 transition-colors flex gap-2.5 items-start ${
                                !n.read ? "bg-muted/15 font-semibold" : ""
                              }`}
                            >
                              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                n.type === "reject" ? "bg-destructive" 
                                : n.type === "hold" ? "bg-error"
                                : "bg-gold"
                              }`} />
                              <div className="space-y-1 flex-1">
                                <p className="text-xs text-foreground leading-snug">{n.message}</p>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono-data">
                                  <span>Order: {n.order_id}</span>
                                  <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-primary-variant font-bold text-xs uppercase">
                  {user.email.slice(0, 2)}
                </div>
                <div className="hidden lg:block text-left leading-none">
                  <div className="text-xs font-bold text-foreground font-display max-w-[120px] truncate">{user.email}</div>
                  <span className={`mt-0.5 inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    navigate({ to: "/login" });
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-black/95 text-white text-xs px-4 py-3 rounded-lg shadow-2xl border border-white/10 flex items-center gap-2 animate-scale-up">
          <div className="h-2 w-2 rounded-full bg-success animate-ping" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export interface KpiTileProps {
  label: string;
  value: string | number;
  accent?: "navy" | "gold" | "success" | "destructive";
  hint?: string;
}

export function KpiTile({ label, value, accent = "navy", hint }: KpiTileProps) {
  const colors = {
    navy: "border-l-4 border-navy",
    gold: "border-l-4 border-gold",
    success: "border-l-4 border-success",
    destructive: "border-l-4 border-destructive",
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between ${colors[accent]}`}>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="mt-1 text-2xl font-bold font-display">{value}</div>
      </div>
      {hint && <div className="mt-2 text-[10px] text-muted-foreground font-mono-data">{hint}</div>}
    </div>
  );
}

export interface SectionCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, action, className = "" }: SectionCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl shadow-sm ${className}`}>
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <h3 className="font-display font-bold text-sm tracking-wide uppercase text-primary">
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  // Mapping statuses and QC results to appropriate Tailwind classes
  const classes = {
    open: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "in production": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "on hold": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    shipped: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    
    // QC results
    pass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    rework: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    reject: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    hold: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    pending: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    
    // Cartons
    ready: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  const currentClass = classes[normalized as keyof typeof classes] || "bg-muted text-muted-foreground border-border";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${currentClass}`}>
      {status}
    </span>
  );
}

export function ProgressBar({ value, colorClass = "bg-primary" }: { value: number; colorClass?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden border border-border/30">
      <div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
