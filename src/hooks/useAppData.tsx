import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isRealSupabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import {
  ORDERS as seedOrders,
  MATERIALS as seedMaterials,
  CUTTING as seedCutting,
  SEWING as seedSewing,
  WASH as seedWash,
  QC as seedQC,
  CARTONS as seedCartons,
  type Order,
  type Material,
  type CuttingRecord,
  type SewingBundle,
  type WashBatch,
  type QCRecord,
  type Carton,
} from "../lib/mockData";

export interface Customer {
  id: string;
  name: string;
  contact: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Inactive";
}

export interface Checkpoint {
  id: string;
  name: string;
  stage: string;
  aql_limit: string;
}

export interface Notification {
  id: string;
  message: string;
  order_id: string;
  type: "hold" | "reject" | "slow_stage" | "overdue" | "qc_checkpoint_pending";
  read: boolean;
  stage_id: number;
  created_at: string;
}

interface AppDataContextType {
  orders: Order[];
  materials: Material[];
  cutting: CuttingRecord[];
  sewing: SewingBundle[];
  wash: WashBatch[];
  qc: QCRecord[];
  cartons: Carton[];
  customers: Customer[];
  equipment: Equipment[];
  checkpoints: Checkpoint[];
  notifications: Notification[];
  addOrder: (order: Omit<Order, "created_date">) => void;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  addMaterial: (material: Material) => void;
  updateMaterialInspection: (materialId: string, status: Material["inspection_status"]) => void;
  addCuttingRecord: (record: CuttingRecord) => void;
  updateCuttingRecord: (cutId: string, fields: Partial<CuttingRecord>) => void;
  addSewingBundle: (bundle: SewingBundle) => void;
  updateSewingBundle: (bundleId: string, fields: Partial<SewingBundle>) => void;
  addWashBatch: (batch: WashBatch) => void;
  updateWashBatch: (batchId: string, fields: Partial<WashBatch>) => void;
  addQCRecord: (record: QCRecord) => void;
  addCarton: (carton: Carton) => void;
  updateCartonDispatch: (cartonId: string, fields: Partial<Carton>) => void;
  addCustomer: (name: string, contact: string) => void;
  updateCustomer: (customerId: string, fields: Partial<Customer>) => void;
  addEquipment: (name: string, type: string) => void;
  toggleEquipmentStatus: (equipmentId: string) => void;
  updateCheckpoint: (checkpointId: string, fields: Partial<Checkpoint>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  advanceOrderStage: (orderId: string, toStage: number) => void;
  isOrderOnHold: (orderId: string) => boolean;
  isLoading: boolean;
  toast: { message: string; type: "success" | "info" | "error" } | null;
  setToast: (toast: { message: string; type: "success" | "info" | "error" } | null) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  orders: "forge_flow_orders",
  materials: "forge_flow_materials",
  cutting: "forge_flow_cutting",
  sewing: "forge_flow_sewing",
  wash: "forge_flow_wash",
  qc: "forge_flow_qc",
  cartons: "forge_flow_cartons",
  customers: "forge_flow_customers",
  equipment: "forge_flow_equipment",
  checkpoints: "forge_flow_checkpoints",
  notifications: "forge_flow_notifications",
};

const SEED_CUSTOMERS: Customer[] = [
  { id: "cust-1", name: "Levi Strauss & Co.", contact: "denim.sourcing@levis.com" },
  { id: "cust-2", name: "H&M Group", contact: "production.se@hm.com" },
  { id: "cust-3", name: "Uniqlo Global", contact: "quality.tokyo@uniqlo.com" },
  { id: "cust-4", name: "Zara Denim", contact: "sourcing@inditex.com" },
  { id: "cust-5", name: "Gap Inc.", contact: "logistics@gap.com" },
  { id: "cust-6", name: "Diesel S.p.A.", contact: "it.denim@diesel.com" },
  { id: "cust-7", name: "Nudie Jeans", contact: "organic.denim@nudie.com" },
];

const SEED_EQUIPMENT: Equipment[] = [
  { id: "eq-1", name: "40 ft Auto Cutter A", type: "Cutter", status: "Active" },
  { id: "eq-2", name: "40 ft Auto Cutter B", type: "Cutter", status: "Active" },
  { id: "eq-3", name: "Manual Cut Table 1", type: "Cutter", status: "Active" },
  { id: "eq-4", name: "Line 1", type: "Sewing Line", status: "Active" },
  { id: "eq-5", name: "Line 2", type: "Sewing Line", status: "Active" },
  { id: "eq-6", name: "Line 3", type: "Sewing Line", status: "Active" },
  { id: "eq-7", name: "Industrial Washer #3", type: "Washer", status: "Active" },
  { id: "eq-8", name: "Jeanologia Laser", type: "Laser", status: "Active" },
  { id: "eq-9", name: "Ozone Booth", type: "Laser/Ozone", status: "Active" },
  { id: "eq-10", name: "Spray Booth", type: "Spray", status: "Active" },
  { id: "eq-11", name: "Steam Presser", type: "Finishing", status: "Active" },
];

const SEED_CHECKPOINTS: Checkpoint[] = [
  { id: "cp-1", name: "Material Sourcing/Receiving Check", stage: "Stage 2 & 3", aql_limit: "2.5" },
  { id: "cp-2", name: "First Cut Panel Approval", stage: "Stage 5", aql_limit: "1.5" },
  { id: "cp-3", name: "Inline Sewing QC Check", stage: "Stage 8", aql_limit: "2.5" },
  { id: "cp-4", name: "Wash/Finish Appearance Quality", stage: "Stage 11", aql_limit: "4.0" },
  { id: "cp-5", name: "Final AQL Pack Inspection", stage: "Stage 12", aql_limit: "2.5" },
];

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local storage state fallbacks for mock mode
  const [localOrders, setLocalOrders] = useState<Order[]>([]);
  const [localMaterials, setLocalMaterials] = useState<Material[]>([]);
  const [localCutting, setLocalCutting] = useState<CuttingRecord[]>([]);
  const [localSewing, setLocalSewing] = useState<SewingBundle[]>([]);
  const [localWash, setLocalWash] = useState<WashBatch[]>([]);
  const [localQc, setLocalQc] = useState<QCRecord[]>([]);
  const [localCartons, setLocalCartons] = useState<Carton[]>([]);

  // Config tables state
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [localEquipment, setLocalEquipment] = useState<Equipment[]>([]);
  const [localCheckpoints, setLocalCheckpoints] = useState<Checkpoint[]>([]);
  
  // Notifications state
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Toast notifications state
  const [toast, setToastState] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const setToast = (t: { message: string; type: "success" | "info" | "error" } | null) => {
    setToastState(t);
    if (t) {
      setTimeout(() => setToastState(null), 4000);
    }
  };

  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");


  // Load from local storage for mock mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadData = <T,>(key: string, seed: T[]): T[] => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(`Failed parsing ${key}`, e);
        }
      }
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    };

    setLocalOrders(loadData(LOCAL_STORAGE_KEYS.orders, seedOrders as Order[]));
    setLocalMaterials(loadData(LOCAL_STORAGE_KEYS.materials, seedMaterials as Material[]));
    setLocalCutting(loadData(LOCAL_STORAGE_KEYS.cutting, seedCutting as CuttingRecord[]));
    setLocalSewing(loadData(LOCAL_STORAGE_KEYS.sewing, seedSewing as SewingBundle[]));
    setLocalWash(loadData(LOCAL_STORAGE_KEYS.wash, seedWash as WashBatch[]));
    setLocalQc(loadData(LOCAL_STORAGE_KEYS.qc, seedQC as QCRecord[]));
    setLocalCartons(loadData(LOCAL_STORAGE_KEYS.cartons, seedCartons as Carton[]));

    setLocalCustomers(loadData(LOCAL_STORAGE_KEYS.customers, SEED_CUSTOMERS));
    setLocalEquipment(loadData(LOCAL_STORAGE_KEYS.equipment, SEED_EQUIPMENT));
    setLocalCheckpoints(loadData(LOCAL_STORAGE_KEYS.checkpoints, SEED_CHECKPOINTS));
    setLocalNotifications(loadData(LOCAL_STORAGE_KEYS.notifications, []));
  }, []);

  const saveToStorage = (key: string, data: any) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(data));
  };

  // React Query Fetching from live Supabase Tables
  // staleTime: 60s — prevents re-fetching on every window focus / component remount
  // retry: 1    — fail fast instead of retrying 3 times with exponential backoff (~30s freeze)
  const { data: dbOrders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*");
      if (error) throw error;
      return (data || []).map((o: any) => ({
        ...o,
        PO_number: o.po_number,
      }));
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbMaterials = [], isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["materials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbCutting = [], isLoading: isLoadingCutting } = useQuery<CuttingRecord[]>({
    queryKey: ["cutting_records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cutting_records").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbSewing = [], isLoading: isLoadingSewing } = useQuery<SewingBundle[]>({
    queryKey: ["sewing_bundles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sewing_bundles").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbWash = [], isLoading: isLoadingWash } = useQuery<WashBatch[]>({
    queryKey: ["wash_batches", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wash_batches").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbQc = [], isLoading: isLoadingQc } = useQuery<QCRecord[]>({
    queryKey: ["qc_records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("qc_records").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbCartons = [], isLoading: isLoadingCartons } = useQuery<Carton[]>({
    queryKey: ["cartons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cartons").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbCustomers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["customers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: dbNotifications = [], isLoading: isLoadingNotifications } = useQuery<Notification[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isRealSupabase && !!user,
    staleTime: 30_000,
    retry: 1,
  });

  // Decide current active lists based on environment (fallback to local if db is empty/unfetched, especially for unauthenticated pages like signup)
  const orders = isRealSupabase && dbOrders.length > 0 ? dbOrders : localOrders;
  const materials = isRealSupabase && dbMaterials.length > 0 ? dbMaterials : localMaterials;
  const cutting = isRealSupabase && dbCutting.length > 0 ? dbCutting : localCutting;
  const sewing = isRealSupabase && dbSewing.length > 0 ? dbSewing : localSewing;
  const wash = isRealSupabase && dbWash.length > 0 ? dbWash : localWash;
  const qc = isRealSupabase && dbQc.length > 0 ? dbQc : localQc;
  const cartons = isRealSupabase && dbCartons.length > 0 ? dbCartons : localCartons;
  const customers = isRealSupabase && dbCustomers.length > 0 ? dbCustomers : localCustomers;
  const notifications = isRealSupabase && dbNotifications.length > 0 ? dbNotifications : localNotifications;

  // Equipment & Checkpoints managed locally for ease of preview in both modes
  const equipment = localEquipment;
  const checkpoints = localCheckpoints;

  // React Query Mutations for live Supabase Tables
  const addOrderMutation = useMutation({
    mutationFn: async (order: Order) => {
      const dbOrder = {
        order_id: order.order_id,
        customer_name: order.customer_name,
        po_number: order.PO_number,
        tech_pack_ref: order.tech_pack_ref,
        size_breakdown: order.size_breakdown,
        status: order.status,
        created_date: order.created_date,
        current_stage: order.current_stage,
        qty: order.qty,
        notes: order.notes,
      };
      const { error } = await supabase.from("orders").insert(dbOrder);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setToast({ message: "Order created successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to add order: ${error.message}`, type: "error" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Order> }) => {
      const dbFields: any = { ...fields };
      if (fields.PO_number !== undefined) {
        dbFields.po_number = fields.PO_number;
        delete dbFields.PO_number;
      }
      const { error } = await supabase.from("orders").update(dbFields).eq("order_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setToast({ message: "Order updated successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to update order: ${error.message}`, type: "error" });
    },
  });

  const addMaterialMutation = useMutation({
    mutationFn: async (material: Material) => {
      const { error } = await supabase.from("materials").insert(material);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setToast({ message: "Material added successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to add material: ${error.message}`, type: "error" });
    },
  });

  const updateMaterialInspectionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Material["inspection_status"] }) => {
      const { error } = await supabase
        .from("materials")
        .update({ inspection_status: status })
        .eq("material_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setToast({ message: "Material inspection status updated!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to update inspection: ${error.message}`, type: "error" });
    },
  });

  const addCuttingRecordMutation = useMutation({
    mutationFn: async (record: CuttingRecord) => {
      const { error } = await supabase.from("cutting_records").insert(record);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cutting_records"] });
      setToast({ message: "Cutting record added successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to add cutting record: ${error.message}`, type: "error" });
    },
  });

  const updateCuttingRecordMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<CuttingRecord> }) => {
      const { error } = await supabase
        .from("cutting_records")
        .update(fields)
        .eq("cut_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cutting_records"] });
      setToast({ message: "Cutting record updated successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to update cutting record: ${error.message}`, type: "error" });
    },
  });

  const addSewingBundleMutation = useMutation({
    mutationFn: async (bundle: SewingBundle) => {
      const { error } = await supabase.from("sewing_bundles").insert(bundle);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sewing_bundles"] });
      setToast({ message: "Sewing bundle added successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to add sewing bundle: ${error.message}`, type: "error" });
    },
  });

  const updateSewingBundleMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<SewingBundle> }) => {
      const { error } = await supabase
        .from("sewing_bundles")
        .update(fields)
        .eq("bundle_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sewing_bundles"] });
      setToast({ message: "Sewing bundle updated successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to update sewing bundle: ${error.message}`, type: "error" });
    },
  });

  const addWashBatchMutation = useMutation({
    mutationFn: async (batch: WashBatch) => {
      const { error } = await supabase.from("wash_batches").insert(batch);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_batches"] });
      setToast({ message: "Wash batch registered successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to register wash batch: ${error.message}`, type: "error" });
    },
  });

  const updateWashBatchMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<WashBatch> }) => {
      const { error } = await supabase
        .from("wash_batches")
        .update(fields)
        .eq("batch_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_batches"] });
      setToast({ message: "Wash batch updated successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to update wash batch: ${error.message}`, type: "error" });
    },
  });

  const addQCRecordMutation = useMutation({
    mutationFn: async (record: QCRecord) => {
      const { error } = await supabase.from("qc_records").insert(record);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc_records"] });
      setToast({ message: "QC audit record submitted successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to submit QC record: ${error.message}`, type: "error" });
    },
  });

  const addCartonMutation = useMutation({
    mutationFn: async (carton: Carton) => {
      const { error } = await supabase.from("cartons").insert(carton);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartons"] });
      setToast({ message: "Carton packed successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to add carton: ${error.message}`, type: "error" });
    },
  });

  const updateCartonDispatchMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Carton> }) => {
      const { error } = await supabase
        .from("cartons")
        .update(fields)
        .eq("carton_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartons"] });
      setToast({ message: "Carton dispatch status updated!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to dispatch carton: ${error.message}`, type: "error" });
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      const { error } = await supabase.from("customers").insert(customer);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setToast({ message: "Customer profile registered!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to add customer: ${error.message}`, type: "error" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Customer> }) => {
      const { error } = await supabase.from("customers").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setToast({ message: "Customer profile updated successfully!", type: "success" });
    },
    onError: (error: any) => {
      setToast({ message: `Failed to update customer: ${error.message}`, type: "error" });
    },
  });

  const addNotificationMutation = useMutation({
    mutationFn: async (notif: Notification) => {
      const { error } = await supabase.from("notifications").insert(notif);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (error: any) => {
      setToast({ message: `Failed to read notification: ${error.message}`, type: "error" });
    },
  });

  /**
   * Notification Audit Engine
   *
   * PROBLEM FIXED: The old version depended on `notifications` in its dep array.
   * Every time it created a new notification → state update → re-render → effect
   * ran again → more notifications → infinite loop causing complete UI freeze for
   * admin (42 orders × 5 rules = 210 notifications created per cycle).
   *
   * FIX: Run the audit once when source data first loads (auditRan ref), and then
   * only re-run when orders/materials/qc/cartons change — NEVER depend on
   * `notifications` or `localNotifications` inside the effect. Deduplication is
   * done against a stable Set built from the initial loaded list, not live state.
   */
  const auditRan = useRef(false); // kept for future manual re-audit trigger

  useEffect(() => {
    // In live Supabase mode, the audit runs server-side via triggers.
    if (isRealSupabase) return;

    // Don't run until source data is available
    if (orders.length === 0) return;

    // Build a Set of "type:orderId" keys already in persistent storage so we
    // never write a duplicate, even across HMR reloads.
    const existingKeys = new Set(
      localNotifications.map((n) => `${n.type}:${n.order_id}`)
    );

    const auditList: Notification[] = [];

    const hasAlert = (type: string, orderId: string) =>
      existingKeys.has(`${type}:${orderId}`) ||
      auditList.some((n) => n.type === type && n.order_id === orderId);

    const makeId = () =>
      `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Material Hold
    materials.forEach((m) => {
      if (m.inspection_status === "Hold" && !hasAlert("hold", m.order_id)) {
        auditList.push({
          id: makeId(),
          message: `[HOLD] Material ${m.material_id} for Order ${m.order_id} is on inspection HOLD.`,
          order_id: m.order_id,
          type: "hold",
          read: false,
          stage_id: 2,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 2. QC Reject
    qc.forEach((q) => {
      if (q.result === "Reject" && !hasAlert("reject", q.order_id)) {
        auditList.push({
          id: makeId(),
          message: `[REJECT] QC checkpoint "${q.stage_checkpoint}" failed for Order ${q.order_id}.`,
          order_id: q.order_id,
          type: "reject",
          read: false,
          stage_id: 11,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 3. Slow Stage (>5 days in production without reaching stage 13)
    orders.forEach((o) => {
      const ageDays = Math.round(
        (Date.now() - new Date(o.created_date).getTime()) / 86_400_000
      );
      if (
        o.status === "In Production" &&
        o.current_stage < 13 &&
        ageDays > 5 &&
        !hasAlert("slow_stage", o.order_id)
      ) {
        auditList.push({
          id: makeId(),
          message: `[DELAY] Order ${o.order_id} has been at Stage ${o.current_stage} for over 5 days.`,
          order_id: o.order_id,
          type: "slow_stage",
          read: false,
          stage_id: o.current_stage,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 4. Overdue dispatch (carton ready >10 days after order creation)
    cartons.forEach((c) => {
      if (c.dispatch_status !== "Ready") return;
      const order = orders.find((o) => o.order_id === c.order_id);
      if (!order) return;
      const ageDays = Math.round(
        (Date.now() - new Date(order.created_date).getTime()) / 86_400_000
      );
      if (ageDays > 10 && !hasAlert("overdue", c.order_id)) {
        auditList.push({
          id: makeId(),
          message: `[OVERDUE] Carton ${c.carton_id} for Order ${c.order_id} is overdue for dispatch.`,
          order_id: c.order_id,
          type: "overdue",
          read: false,
          stage_id: 13,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 5. QC Checkpoint Pending (order at gate stage >2 days, no QC record)
    const QC_GATES: Record<number, string> = {
      5: "First Cut Approval",
      8: "Inline Sewing QC",
      11: "Wash-Finish Approval",
      12: "Final AQL-Packing Audit",
    };
    orders.forEach((o) => {
      const ageDays = Math.round(
        (Date.now() - new Date(o.created_date).getTime()) / 86_400_000
      );
      if (ageDays <= 2 || o.status !== "In Production") return;
      const checkpointName = QC_GATES[o.current_stage];
      if (!checkpointName) return;
      const hasQcRecord = qc.some(
        (q) => q.order_id === o.order_id && q.stage_checkpoint === checkpointName
      );
      if (!hasQcRecord && !hasAlert("qc_checkpoint_pending", o.order_id)) {
        auditList.push({
          id: makeId(),
          message: `[QC PENDING] Order ${o.order_id} at Stage ${o.current_stage} for >2 days — "${checkpointName}" audit not completed.`,
          order_id: o.order_id,
          type: "qc_checkpoint_pending",
          read: false,
          stage_id: o.current_stage,
          created_at: new Date().toISOString(),
        });
      }
    });

    if (auditList.length === 0) return;

    if (isRealSupabase) {
      auditList.forEach((notif) => addNotificationMutation.mutate(notif));
    } else {
      // Merge with existing and persist — single write, no re-render loop
      setLocalNotifications((prev) => {
        const merged = [...prev, ...auditList];
        saveToStorage(LOCAL_STORAGE_KEYS.notifications, merged);
        return merged;
      });
    }
  // Intentionally omit localNotifications and notifications from deps.
  // Including them causes an infinite loop: new notif → state change → effect → new notif.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, materials, qc, cartons]);

  // Realtime subscription for notifications and database updates from Supabase
  useEffect(() => {
    if (!isRealSupabase || !user) return;

    const channel = supabase
      .channel("db-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qc_records",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["qc_records", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cartons",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cartons", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Scoped views for CUSTOMERS
  const scopedOrders = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? orders.filter((o) => o.customer_name === user.customer_name)
    : orders;

  const scopedMaterials = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? materials.filter((m) => {
        const order = orders.find((o) => o.order_id === m.order_id);
        return order?.customer_name === user.customer_name;
      })
    : materials;

  const scopedCutting = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? cutting.filter((c) => {
        const order = orders.find((o) => o.order_id === c.order_id);
        return order?.customer_name === user.customer_name;
      })
    : cutting;

  const scopedSewing = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? sewing.filter((s) => {
        const order = orders.find((o) => o.order_id === s.order_id);
        return order?.customer_name === user.customer_name;
      })
    : sewing;

  const scopedWash = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? wash.filter((w) => {
        const order = orders.find((o) => o.order_id === w.order_id);
        return order?.customer_name === user.customer_name;
      })
    : wash;

  const scopedQc = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? qc.filter((q) => {
        const order = orders.find((o) => o.order_id === q.order_id);
        return order?.customer_name === user.customer_name;
      })
    : qc;

  const scopedCartons = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? cartons.filter((c) => {
        const order = orders.find((o) => o.order_id === c.order_id);
        return order?.customer_name === user.customer_name;
      })
    : cartons;

  const scopedNotifications = !isRealSupabase && user?.role === "customer" && user?.customer_name
    ? notifications.filter((n) => {
        const order = orders.find((o) => o.order_id === n.order_id);
        return order?.customer_name === user.customer_name;
      })
    : notifications;

  // Order Mutations
  const addOrder = (order: Omit<Order, "created_date">) => {
    const newOrder: Order = {
      ...order,
      created_date: new Date().toISOString().slice(0, 10),
    };
    if (isRealSupabase) {
      addOrderMutation.mutate(newOrder);
    } else {
      const updated = [newOrder, ...localOrders];
      setLocalOrders(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.orders, updated);
    }
  };

  const updateOrder = (orderId: string, fields: Partial<Order>) => {
    if (isRealSupabase) {
      updateOrderMutation.mutate({ id: orderId, fields });
    } else {
      const updated = localOrders.map((o) => (o.order_id === orderId ? { ...o, ...fields } : o));
      setLocalOrders(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.orders, updated);
    }
  };

  // Material Mutations
  const addMaterial = (material: Material) => {
    if (isRealSupabase) {
      addMaterialMutation.mutate(material);
    } else {
      const updated = [material, ...localMaterials];
      setLocalMaterials(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.materials, updated);
    }
  };

  const updateMaterialInspection = (materialId: string, status: Material["inspection_status"]) => {
    if (isRealSupabase) {
      updateMaterialInspectionMutation.mutate({ id: materialId, status });
    } else {
      const updated = localMaterials.map((m) =>
        m.material_id === materialId ? { ...m, inspection_status: status } : m
      );
      setLocalMaterials(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.materials, updated);
    }
  };

  // Cutting Mutations
  const addCuttingRecord = (record: CuttingRecord) => {
    if (isRealSupabase) {
      addCuttingRecordMutation.mutate(record);
    } else {
      const updated = [record, ...localCutting];
      setLocalCutting(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.cutting, updated);
    }
  };

  const updateCuttingRecord = (cutId: string, fields: Partial<CuttingRecord>) => {
    if (isRealSupabase) {
      updateCuttingRecordMutation.mutate({ id: cutId, fields });
    } else {
      const updated = localCutting.map((c) => (c.cut_id === cutId ? { ...c, ...fields } : c));
      setLocalCutting(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.cutting, updated);
    }
  };

  // Sewing Mutations
  const addSewingBundle = (bundle: SewingBundle) => {
    if (isRealSupabase) {
      addSewingBundleMutation.mutate(bundle);
    } else {
      const updated = [bundle, ...localSewing];
      setLocalSewing(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.sewing, updated);
    }
  };

  const updateSewingBundle = (bundleId: string, fields: Partial<SewingBundle>) => {
    if (isRealSupabase) {
      updateSewingBundleMutation.mutate({ id: bundleId, fields });
    } else {
      const updated = localSewing.map((s) => (s.bundle_id === bundleId ? { ...s, ...fields } : s));
      setLocalSewing(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.sewing, updated);
    }
  };

  // Wash Mutations
  const addWashBatch = (batch: WashBatch) => {
    if (isRealSupabase) {
      addWashBatchMutation.mutate(batch);
    } else {
      const updated = [batch, ...localWash];
      setLocalWash(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.wash, updated);
    }
  };

  const updateWashBatch = (batchId: string, fields: Partial<WashBatch>) => {
    if (isRealSupabase) {
      updateWashBatchMutation.mutate({ id: batchId, fields });
    } else {
      const updated = localWash.map((w) => (w.batch_id === batchId ? { ...w, ...fields } : w));
      setLocalWash(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.wash, updated);
    }
  };

  // QC Mutations
  const addQCRecord = (record: QCRecord) => {
    if (isRealSupabase) {
      addQCRecordMutation.mutate(record);
    } else {
      const updated = [record, ...localQc];
      setLocalQc(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.qc, updated);
    }
  };

  // Carton Mutations
  const addCarton = (carton: Carton) => {
    if (isRealSupabase) {
      addCartonMutation.mutate(carton);
    } else {
      const updated = [carton, ...localCartons];
      setLocalCartons(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.cartons, updated);
    }
  };

  const updateCartonDispatch = (cartonId: string, fields: Partial<Carton>) => {
    const carton = cartons.find(c => c.carton_id === cartonId);
    if (carton) {
      const orderId = carton.order_id;
      if (isRealSupabase) {
        updateCartonDispatchMutation.mutate({ id: cartonId, fields });
        const oCartons = cartons.map(c => c.carton_id === cartonId ? { ...c, ...fields } : c).filter(c => c.order_id === orderId);
        if (oCartons.length > 0 && oCartons.every(c => c.dispatch_status === "Shipped")) {
          updateOrder(orderId, { status: "Shipped", current_stage: 13 });
        }
      } else {
        const updated = localCartons.map((c) => (c.carton_id === cartonId ? { ...c, ...fields } : c));
        setLocalCartons(updated);
        saveToStorage(LOCAL_STORAGE_KEYS.cartons, updated);
        const oCartons = updated.filter(c => c.order_id === orderId);
        if (oCartons.length > 0 && oCartons.every(c => c.dispatch_status === "Shipped")) {
          const updatedOrders = localOrders.map(o => o.order_id === orderId ? { ...o, status: "Shipped" as const, current_stage: 13 } : o);
          setLocalOrders(updatedOrders);
          saveToStorage(LOCAL_STORAGE_KEYS.orders, updatedOrders);
        }
      }
    }
  };

  // Customer Config Mutations
  const addCustomer = (name: string, contact: string) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      contact,
    };
    if (isRealSupabase) {
      addCustomerMutation.mutate(newCustomer);
    } else {
      const updated = [...localCustomers, newCustomer];
      setLocalCustomers(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.customers, updated);
    }
  };

  const updateCustomer = (customerId: string, fields: Partial<Customer>) => {
    if (isRealSupabase) {
      updateCustomerMutation.mutate({ id: customerId, fields });
    } else {
      const updated = localCustomers.map((c) =>
        c.id === customerId ? { ...c, ...fields } : c
      );
      setLocalCustomers(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.customers, updated);
    }
  };

  // Equipment Config Mutations
  const addEquipment = (name: string, type: string) => {
    const newEq: Equipment = {
      id: `eq-${Date.now()}`,
      name,
      type,
      status: "Active",
    };
    const updated = [...localEquipment, newEq];
    setLocalEquipment(updated);
    saveToStorage(LOCAL_STORAGE_KEYS.equipment, updated);
  };

  const toggleEquipmentStatus = (equipmentId: string) => {
    const updated = localEquipment.map((eq) =>
      eq.id === equipmentId
        ? { ...eq, status: (eq.status === "Active" ? "Inactive" : "Active") as any }
        : eq
    );
    setLocalEquipment(updated);
    saveToStorage(LOCAL_STORAGE_KEYS.equipment, updated);
  };

  // Checkpoints Config Mutations
  const updateCheckpoint = (checkpointId: string, fields: Partial<Checkpoint>) => {
    const updated = localCheckpoints.map((cp) =>
      cp.id === checkpointId ? { ...cp, ...fields } : cp
    );
    setLocalCheckpoints(updated);
    saveToStorage(LOCAL_STORAGE_KEYS.checkpoints, updated);
  };

  // Mark notification read
  const markNotificationAsRead = (notificationId: string) => {
    if (isRealSupabase) {
      markNotificationReadMutation.mutate(notificationId);
    } else {
      const updated = localNotifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      setLocalNotifications(updated);
      saveToStorage(LOCAL_STORAGE_KEYS.notifications, updated);
    }
  };

  const advanceOrderStage = (orderId: string, toStage: number) => {
    updateOrder(orderId, { current_stage: toStage });
    setToast({
      message: `Order ${orderId} successfully advanced to Stage ${toStage}!`,
      type: "success"
    });
  };

  const isOrderOnHold = (orderId: string): boolean => {
    const order = orders.find((o) => o.order_id === orderId);
    if (order?.status === "On Hold") return true;
    
    // Check if any material is "Hold"
    const oMaterials = materials.filter((m) => m.order_id === orderId);
    if (oMaterials.some((m) => m.inspection_status === "Hold")) return true;
    
    // Check if any QC checkpoint is "Reject"
    const oQc = qc.filter((q) => q.order_id === orderId);
    if (oQc.some((q) => q.result === "Reject")) return true;
    
    return false;
  };

  const isLoading = isRealSupabase && (
    isLoadingOrders ||
    isLoadingMaterials ||
    isLoadingCutting ||
    isLoadingSewing ||
    isLoadingWash ||
    isLoadingQc ||
    isLoadingCartons ||
    isLoadingCustomers ||
    isLoadingNotifications
  );

  return (
    <AppDataContext.Provider
      value={{
        orders: scopedOrders,
        materials: scopedMaterials,
        cutting: scopedCutting,
        sewing: scopedSewing,
        wash: scopedWash,
        qc: scopedQc,
        cartons: scopedCartons,
        customers,
        equipment,
        checkpoints,
        notifications: scopedNotifications,
        addOrder,
        updateOrder,
        addMaterial,
        updateMaterialInspection,
        addCuttingRecord,
        updateCuttingRecord,
        addSewingBundle,
        updateSewingBundle,
        addWashBatch,
        updateWashBatch,
        addQCRecord,
        addCarton,
        updateCartonDispatch,
        addCustomer,
        updateCustomer,
        addEquipment,
        toggleEquipmentStatus,
        updateCheckpoint,
        markNotificationAsRead,
        advanceOrderStage,
        isOrderOnHold,
        isLoading,
        toast,
        setToast,
        globalSearchQuery,
        setGlobalSearchQuery,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}

export function checkStageAdvancement(
  toStage: number,
  orderId: string,
  data: {
    materials: Material[];
    cutting: CuttingRecord[];
    sewing: SewingBundle[];
    qc: QCRecord[];
    wash: WashBatch[];
    cartons: Carton[];
  }
): { allowed: boolean; message?: string } {
  if (toStage === 2) {
    return { allowed: true };
  }
  if (toStage === 3) {
    const oMaterials = data.materials.filter((m) => m.order_id === orderId);
    if (oMaterials.length === 0) {
      return { allowed: false, message: "No material sourcing record exists for this order. Please register fabric arrivals first." };
    }
    return { allowed: true };
  }
  if (toStage === 4) {
    const oMaterials = data.materials.filter((m) => m.order_id === orderId);
    if (oMaterials.length === 0) {
      return { allowed: false, message: "No material records exist for this order." };
    }
    const holds = oMaterials.filter((m) => m.inspection_status === "Hold");
    if (holds.length > 0) {
      return {
        allowed: false,
        message: `${holds.length} of ${oMaterials.length} materials are still On Hold (e.g. Fabric ID: ${holds[0].material_id}) — resolve inspection holds before advancing to Pre-Production Planning.`
      };
    }
    const unapproved = oMaterials.filter((m) => m.inspection_status !== "Approved");
    if (unapproved.length > 0) {
      return {
        allowed: false,
        message: `${unapproved.length} of ${oMaterials.length} materials are not Approved yet — resolve all inspections before advancing to Pre-Production Planning.`
      };
    }
    return { allowed: true };
  }
  if (toStage === 5) {
    return { allowed: true }; // Planning sign-off
  }
  if (toStage === 6) {
    const oCuts = data.cutting.filter((c) => c.order_id === orderId);
    const approvedCut = oCuts.find((c) => c.status === "Completed" && c.first_cut_approval_status === "Approved");
    if (!approvedCut) {
      return { allowed: false, message: "Requires a Cutting record with status 'Completed' and First Cut Approval set to 'Approved' before panels can be fed to lines." };
    }
    return { allowed: true };
  }
  if (toStage === 7) {
    const oBundles = data.sewing.filter((s) => s.order_id === orderId);
    if (oBundles.length === 0) {
      return { allowed: false, message: "No sewing bundle has been fed to the assembly line. Please register sewing bundles first." };
    }
    return { allowed: true };
  }
  if (toStage === 8) {
    const oBundles = data.sewing.filter((s) => s.order_id === orderId);
    if (oBundles.length === 0) {
      return { allowed: false, message: "No sewing bundles exist for this order." };
    }
    const active = oBundles.filter((s) => s.status !== "Completed");
    if (active.length > 0) {
      return { allowed: false, message: `${active.length} of ${oBundles.length} sewing bundles are still active/in-progress — complete all bundles before proceeding.` };
    }
    return { allowed: true };
  }
  if (toStage === 9) {
    const oQc = data.qc.filter((q) => q.order_id === orderId && q.stage_checkpoint === "Inline Sewing QC");
    const passQc = oQc.find((q) => q.result !== "Reject");
    if (!passQc) {
      return { allowed: false, message: "Requires an Inline Sewing QC record with result 'Pass' or 'Rework' (not Rejected) to proceed to Laundry Wash." };
    }
    return { allowed: true };
  }
  if (toStage === 10) {
    const oWash = data.wash.filter((w) => w.order_id === orderId);
    const readyWash = oWash.find((w) => w.stage === "Finish" || w.stage === "Approved");
    if (!readyWash) {
      return { allowed: false, message: "Requires laundry wash batch to be completed to 'Finish' or 'Approved' stage." };
    }
    return { allowed: true };
  }
  if (toStage === 11) {
    const oWash = data.wash.filter((w) => w.order_id === orderId);
    const approvedWash = oWash.find((w) => w.stage === "Approved");
    if (!approvedWash) {
      return { allowed: false, message: "Requires laundry wash batch status to be set to 'Approved'." };
    }
    return { allowed: true };
  }
  if (toStage === 12) {
    const oQc = data.qc.filter((q) => q.order_id === orderId && (q.stage_checkpoint === "Wash-Finish Approval" || q.stage_checkpoint === "Final AQL-Packing Audit"));
    const passed = oQc.find((q) => q.result === "Pass");
    if (!passed) {
      return { allowed: false, message: "Requires a QC checkpoint record for 'Wash-Finish Approval' or 'Final AQL-Packing Audit' with result 'Pass'." };
    }
    return { allowed: true };
  }
  if (toStage === 13) {
    const oCartons = data.cartons.filter((c) => c.order_id === orderId);
    const readyCarton = oCartons.find((c) => c.dispatch_status === "Ready");
    if (!readyCarton) {
      return { allowed: false, message: "Requires at least one packing carton with status 'Ready' for dispatch." };
    }
    return { allowed: true };
  }
  return { allowed: true };
}
