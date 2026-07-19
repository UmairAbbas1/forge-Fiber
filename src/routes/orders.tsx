import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";
import { AppShell, KpiTile, SectionCard, StatusBadge } from "../components/AppShell";
import { ORDER_TREND, type Order } from "../lib/mockData";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "../hooks/useAuth";
import { Plus, X, Pencil, Info, PlusCircle, Check } from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Order Dashboard · Forge & Fabric" },
      { name: "description", content: "Track open, in-production, on-hold and shipped orders across the Forge & Fabric factory." },
    ],
  }),
  component: Page,
});

const ADD_NEW_BRAND_SENTINEL = "__ADD_NEW_BRAND__";
const SIZES = ["28-38", "30-40", "S-XXL", "26-36", "XS-XL"];

function Page() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, addOrder, updateOrder, isOrderOnHold, customers, addCustomer, globalSearchQuery, setGlobalSearchQuery } = useAppData();

  const [status, setStatus] = useState<string>("All");

  // Add Order Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newPO, setNewPO] = useState("");
  const [newTechPack, setNewTechPack] = useState("");
  const [newSizes, setNewSizes] = useState(SIZES[0]);
  const [newQty, setNewQty] = useState(1000);
  const [addFormError, setAddFormError] = useState("");

  // Add-new-brand inline state (for Add modal)
  const [showAddBrandAdd, setShowAddBrandAdd] = useState(false);
  const [newBrandNameAdd, setNewBrandNameAdd] = useState("");
  const addBrandInputRef = useRef<HTMLInputElement>(null);

  // Add-new-brand inline state (for Edit modal)
  const [showAddBrandEdit, setShowAddBrandEdit] = useState(false);
  const [newBrandNameEdit, setNewBrandNameEdit] = useState("");
  const editBrandInputRef = useRef<HTMLInputElement>(null);

  // Edit Order State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editCustomer, setEditCustomer] = useState("");
  const [editPO, setEditPO] = useState("");
  const [editTechPack, setEditTechPack] = useState("");
  const [editSizes, setEditSizes] = useState("");
  const [editQty, setEditQty] = useState(1000);
  const [editStatus, setEditStatus] = useState<Order["status"]>("Open");
  const [editFormError, setEditFormError] = useState("");

  // Role Guarding: redirect production role users to /materials
  useEffect(() => {
    if (user && user.role === "production") {
      navigate({ to: "/materials" });
    }
  }, [user, navigate]);

  const filtered = useMemo(() => {
    const qLow = globalSearchQuery?.toLowerCase()?.trim() || "";
    return orders.filter((o) => {
      const matchQ = qLow === "" ||
        o.order_id?.toLowerCase()?.includes(qLow) ||
        o.customer_name?.toLowerCase()?.includes(qLow) ||
        o.PO_number?.toLowerCase()?.includes(qLow) ||
        o.tech_pack_ref?.toLowerCase()?.includes(qLow) ||
        o.size_breakdown?.toLowerCase()?.includes(qLow) ||
        o.status?.toLowerCase()?.includes(qLow);
      const matchS = status === "All" || o.status === status;
      return matchQ && matchS;
    });
  }, [globalSearchQuery, status, orders]);

  const open = orders.filter((o) => o.status === "Open").length;
  const inProd = orders.filter((o) => o.status === "In Production").length;
  const onHold = orders.filter((o) => o.status === "On Hold").length;
  const shipped = orders.filter((o) => o.status === "Shipped").length;

  const totalStages = orders.reduce((sum, o) => sum + o.current_stage, 0);
  const overallProgress = orders.length > 0 
    ? Math.round((totalStages / (orders.length * 13)) * 100) 
    : 0;

  const donutData = [
    { name: "Complete", value: overallProgress },
    { name: "Remaining", value: 100 - overallProgress },
  ];

  const canEdit = user && ["admin", "merchandiser"].includes(user.role);

  // Sync states when Add Modal opens
  useEffect(() => {
    if (showAddModal) {
      if (!newCustomer) {
        setNewCustomer(user?.customer_name || "");
      }
      
      let maxPoMatch: RegExpMatchArray | null = null;
      let maxPoNum = -1;
      let maxTpMatch: RegExpMatchArray | null = null;
      let maxTpNum = -1;

      for (const o of orders) {
        const pMatch = o.PO_number.match(/^(.*?)(\d+)$/);
        if (pMatch) {
          const num = parseInt(pMatch[2], 10);
          if (num > maxPoNum) {
            maxPoNum = num;
            maxPoMatch = pMatch;
          }
        }
        const tMatch = o.tech_pack_ref.match(/^(.*?)(\d+)$/);
        if (tMatch) {
          const num = parseInt(tMatch[2], 10);
          if (num > maxTpNum) {
            maxTpNum = num;
            maxTpMatch = tMatch;
          }
        }
      }

      if (maxPoMatch) {
        setNewPO(`${maxPoMatch[1]}${maxPoNum + 1}`);
      } else {
        setNewPO("");
      }

      if (maxTpMatch) {
        setNewTechPack(`${maxTpMatch[1]}${maxTpNum + 1}`);
      } else {
        setNewTechPack("");
      }
    }
  }, [showAddModal, orders, user?.customer_name, newCustomer]);

  const handleAddBrand = (
    brandName: string,
    setSelectedFn: (name: string) => void,
    setShowFn: (v: boolean) => void,
    setNameFn: (v: string) => void
  ) => {
    const trimmed = brandName.trim();
    if (!trimmed) return;
    // Avoid duplicates
    if (!customers.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      addCustomer(trimmed, "");
    }
    setSelectedFn(trimmed);
    setShowFn(false);
    setNameFn("");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError("");
    if (!newCustomer) {
      setAddFormError("Please select a customer / brand.");
      return;
    }
    if (!newPO.trim()) {
      setAddFormError("Please enter the PO number.");
      return;
    }
    if (!newTechPack.trim()) {
      setAddFormError("Please enter the tech pack reference.");
      return;
    }
    if (newQty <= 0) {
      setAddFormError("Order quantity must be greater than zero.");
      return;
    }

    const numericIds = orders
      .map((o) => parseInt(o.order_id.replace("FF-", ""), 10))
      .filter((n) => !isNaN(n));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 2601;
    const newOrderId = `FF-${nextId}`;
    addOrder({
      order_id: newOrderId,
      customer_name: newCustomer,
      PO_number: newPO,
      tech_pack_ref: newTechPack,
      size_breakdown: newSizes,
      qty: newQty,
      status: "Open",
      current_stage: 1,
    });

    // Reset fields
    setNewCustomer("");
    setNewSizes(SIZES[0]);
    setNewQty(1000);
    setShowAddBrandAdd(false);
    setNewBrandNameAdd("");
    setAddFormError("");
    setShowAddModal(false);
  };

  const handleSelectOrder = (o: Order) => {
    setSelectedOrder(o);
    setEditCustomer(o.customer_name);
    setEditPO(o.PO_number);
    setEditTechPack(o.tech_pack_ref);
    setEditSizes(o.size_breakdown);
    setEditQty(o.qty);
    setEditStatus(o.status);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setEditFormError("");
    if (!editCustomer) {
      setEditFormError("Please select a customer / brand.");
      return;
    }
    if (!editPO.trim()) {
      setEditFormError("Please enter the PO number.");
      return;
    }
    if (!editTechPack.trim()) {
      setEditFormError("Please enter the tech pack reference.");
      return;
    }
    if (editQty <= 0) {
      setEditFormError("Order quantity must be greater than zero.");
      return;
    }

    updateOrder(selectedOrder.order_id, {
      customer_name: editCustomer,
      PO_number: editPO,
      tech_pack_ref: editTechPack,
      size_breakdown: editSizes,
      qty: editQty,
      status: editStatus,
    });

    setEditFormError("");
    setSelectedOrder(null);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Operations</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold">Order Dashboard</h1>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-white hover:bg-black px-4 py-2 rounded-lg font-label-caps text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Create Intake Order
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Open Orders" value={open} accent="navy" />
          <KpiTile label="In Production" value={inProd} accent="gold" />
          <KpiTile label="On Hold" value={onHold} accent="destructive" />
          <KpiTile label="Shipped" value={shipped} accent="success" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <SectionCard title="Overall Progress" className="lg:col-span-1">
            <div className="h-56 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={85}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="var(--gold)" />
                    <Cell fill="var(--muted)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-3xl font-display font-bold">{overallProgress}%</div>
                  <div className="text-xs text-muted-foreground">Avg. stage progress</div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Orders Trend (14 days)" className="lg:col-span-2">
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={ORDER_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="orders" stroke="var(--navy)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="completed" stroke="var(--gold)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title={`Orders (${filtered.length})`}
          action={
            <div className="flex items-center gap-2">
              <input
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search order, PO, customer"
                className="h-8 rounded-md border border-input bg-background text-xs px-2 w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8 rounded-md border border-input bg-background text-xs px-2 focus:outline-none"
              >
                {["All", "Open", "In Production", "On Hold", "Shipped"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-4">Order ID</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">PO</th>
                  <th className="py-2 pr-4">Style No</th>
                  <th className="py-2 pr-4">Tech Pack</th>
                  <th className="py-2 pr-4">Sizes</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Stage</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                  {canEdit && <th className="py-2 pr-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.order_id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium">
                      <Link to="/orders/$orderId" params={{ orderId: o.order_id }} className="text-secondary hover:underline">
                        {o.order_id}
                      </Link>
                      {isOrderOnHold(o.order_id) && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-destructive/15 text-destructive border border-destructive/25 uppercase tracking-wider">On Hold</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">{o.customer_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{o.PO_number}</td>
                    <td className="py-3 pr-4 text-xs font-semibold text-secondary">{o.style_no || "N/A"}</td>
                    <td className="py-3 pr-4 text-muted-foreground font-mono-data text-xs">{o.tech_pack_ref}</td>
                    <td className="py-3 pr-4 text-xs">{o.size_breakdown}</td>
                    <td className="py-3 pr-4">{o.qty.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-navy" style={{ width: `${(o.current_stage / 13) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{o.current_stage}/13</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={o.status} /></td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{o.created_date}</td>
                    {canEdit && (
                      <td className="py-3 pr-4 text-right">
                        <button
                          onClick={() => handleSelectOrder(o)}
                          className="p-1 text-muted-foreground hover:text-secondary rounded hover:bg-accent/40"
                          title="Modify Intake Details"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Add Intake Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant max-w-md w-full shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => { setShowAddModal(false); setAddFormError(""); }}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display-lg text-lg font-bold text-primary mb-1">Create Intake Order</h3>
            <p className="text-xs text-muted-foreground mb-4">Register incoming fabrics/materials PO details.</p>

            {addFormError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-center gap-2 text-xs border border-destructive/25 mb-4">
                <span className="shrink-0">⚠</span>
                <span>{addFormError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Customer Company</label>
                <select
                  value={showAddBrandAdd ? ADD_NEW_BRAND_SENTINEL : newCustomer}
                  onChange={(e) => {
                    if (e.target.value === ADD_NEW_BRAND_SENTINEL) {
                      setShowAddBrandAdd(true);
                      setNewBrandNameAdd("");
                      setTimeout(() => addBrandInputRef.current?.focus(), 50);
                    } else {
                      setShowAddBrandAdd(false);
                      setNewCustomer(e.target.value);
                    }
                  }}
                  className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value={ADD_NEW_BRAND_SENTINEL} className="text-secondary font-semibold">＋ Add New Brand…</option>
                </select>
                {showAddBrandAdd && (
                  <div className="flex gap-2 mt-2 animate-fade-in">
                    <input
                      ref={addBrandInputRef}
                      value={newBrandNameAdd}
                      onChange={(e) => setNewBrandNameAdd(e.target.value)}
                      placeholder="Enter brand name"
                      className="flex-1 px-3 h-9 rounded-lg border border-secondary text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBrand(newBrandNameAdd, setNewCustomer, setShowAddBrandAdd, setNewBrandNameAdd);
                        }
                        if (e.key === "Escape") { setShowAddBrandAdd(false); setNewBrandNameAdd(""); }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddBrand(newBrandNameAdd, setNewCustomer, setShowAddBrandAdd, setNewBrandNameAdd)}
                      className="px-3 h-9 rounded-lg bg-secondary text-white text-sm font-semibold hover:bg-primary transition-all flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddBrandAdd(false); setNewBrandNameAdd(""); }}
                      className="px-2 h-9 rounded-lg border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">PO Number</label>
                  <input
                    value={newPO}
                    onChange={(e) => setNewPO(e.target.value)}
                    placeholder="PO-54321"
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Tech Pack Ref</label>
                  <input
                    value={newTechPack}
                    onChange={(e) => setNewTechPack(e.target.value)}
                    placeholder="TP-9876"
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Size Ratio</label>
                  <select
                    value={newSizes}
                    onChange={(e) => setNewSizes(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Intake Qty (pcs)</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                    min={1}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white hover:bg-black h-11 rounded-lg font-headline-sm text-sm font-semibold mt-6 transition-all"
              >
                Ingest Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant max-w-md w-full shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => { setSelectedOrder(null); setEditFormError(""); }}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display-lg text-lg font-bold text-primary mb-1">Modify Order intake: {selectedOrder.order_id}</h3>
            <p className="text-xs text-muted-foreground mb-4">Modify technical parameters or dispatch states.</p>

            {editFormError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-center gap-2 text-xs border border-destructive/25 mb-4">
                <span className="shrink-0">⚠</span>
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Customer Company</label>
                <select
                  value={showAddBrandEdit ? ADD_NEW_BRAND_SENTINEL : editCustomer}
                  onChange={(e) => {
                    if (e.target.value === ADD_NEW_BRAND_SENTINEL) {
                      setShowAddBrandEdit(true);
                      setNewBrandNameEdit("");
                      setTimeout(() => editBrandInputRef.current?.focus(), 50);
                    } else {
                      setShowAddBrandEdit(false);
                      setEditCustomer(e.target.value);
                    }
                  }}
                  className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value={ADD_NEW_BRAND_SENTINEL} className="text-secondary font-semibold">＋ Add New Brand…</option>
                </select>
                {showAddBrandEdit && (
                  <div className="flex gap-2 mt-2 animate-fade-in">
                    <input
                      ref={editBrandInputRef}
                      value={newBrandNameEdit}
                      onChange={(e) => setNewBrandNameEdit(e.target.value)}
                      placeholder="Enter brand name"
                      className="flex-1 px-3 h-9 rounded-lg border border-secondary text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBrand(newBrandNameEdit, setEditCustomer, setShowAddBrandEdit, setNewBrandNameEdit);
                        }
                        if (e.key === "Escape") { setShowAddBrandEdit(false); setNewBrandNameEdit(""); }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddBrand(newBrandNameEdit, setEditCustomer, setShowAddBrandEdit, setNewBrandNameEdit)}
                      className="px-3 h-9 rounded-lg bg-secondary text-white text-sm font-semibold hover:bg-primary transition-all flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddBrandEdit(false); setNewBrandNameEdit(""); }}
                      className="px-2 h-9 rounded-lg border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">PO Number</label>
                  <input
                    value={editPO}
                    onChange={(e) => setEditPO(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Tech Pack Ref</label>
                  <input
                    value={editTechPack}
                    onChange={(e) => setEditTechPack(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Size Ratio</label>
                  <select
                    value={editSizes}
                    onChange={(e) => setEditSizes(e.target.value)}
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none"
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Intake Qty (pcs)</label>
                  <input
                    type="number"
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 border-t border-outline-variant/60 pt-4">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-primary">Workflow Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full px-3 h-10 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="Open">Open</option>
                  <option value="In Production">In Production</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Shipped">Shipped</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white hover:bg-black h-11 rounded-lg font-headline-sm text-sm font-semibold mt-6 transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
