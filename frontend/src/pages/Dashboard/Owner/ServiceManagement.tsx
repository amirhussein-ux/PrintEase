import { Fragment, useMemo, useState, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
import { Dialog, DialogPanel, Transition, Tab } from "@headlessui/react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import api from "../../../lib/api";
import { isAxiosError } from "axios";
import CropperModal from "../../../components/CropperModal";

type PricingUnit = "per page" | "per sq ft" | "per item";

// Currency helpers
const currencySymbol = (code: string) => {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'PHP': return '₱';
    case 'AUD': return 'A$';
    case 'CAD': return 'C$';
    case 'SGD': return 'S$';
    case 'INR': return '₹';
    case 'CNY': return '¥';
    default: return code;
  }
};

interface VariantOption {
  name: string; // e.g., A4, Red, Small
  priceDelta: number; // additional price
}

interface ServiceVariant {
  label: string; // e.g., Size, Color, Material
  options: VariantOption[];
}

interface ServiceItem {
  id: string;
  name: string;
  basePrice: number;
  unit: PricingUnit;
  currency?: string;
  description?: string;
  active: boolean;
  variants?: ServiceVariant[];
  createdAt: string; // ISO string for sorting/display
  imageUrl?: string; // derived from backend image endpoint
  requiredInventory?: string; // inventory item ID
  inventoryQuantityPerUnit?: number;
  canEnable?: boolean;
  inventoryStatus?: {
    name: string;
    amount: number;
    minAmount: number;
    isLowStock: boolean;
  };
  attributeInventoryMatches?: {
    name: string;
    amount: number;
    minAmount: number;
    isLowStock: boolean;
  }[];
  autoDisabled?: boolean; // true if service was auto-disabled due to inventory
  disableReason?: string; // reason for auto-disable
  deletedAt?: string | null;
}

type ServiceDraft = {
  name: string;
  basePrice: number;
  unit: PricingUnit;
  currency?: string;
  description?: string;
  active: boolean;
  variants?: ServiceVariant[];
  imageFile?: File | null;
  removeImage?: boolean;
  requiredInventory?: string;
  inventoryQuantityPerUnit?: number;
};

interface InventoryItem {
  _id: string;
  name: string;
  amount: number;
  minAmount: number;
  price: number;
  currency: string;
}

type ApiInventoryRef =
  | string
  | null
  | undefined
  | {
      _id?: string;
      name?: string;
      amount?: number;
      minAmount?: number;
    };

type ApiService = {
  _id: string;
  name: string;
  basePrice: number;
  unit: PricingUnit;
  currency?: string;
  description?: string;
  active: boolean;
  variants?: ServiceVariant[];
  createdAt?: string;
  imageFileId?: string;
  requiredInventory?: ApiInventoryRef;
  inventoryQuantityPerUnit?: number;
  canEnable?: boolean;
  inventoryStatus?: {
    name: string;
    amount: number;
    minAmount: number;
    isLowStock: boolean;
  };
  attributeInventoryMatches?: {
    name: string;
    amount: number;
    minAmount: number;
    isLowStock: boolean;
  }[];
  autoDisabled?: boolean;
  disableReason?: string;
  deletedAt?: string | null;
};

function mapServiceFromApi(s: ApiService): ServiceItem {
  const requiredInventoryId =
    typeof s.requiredInventory === "string"
      ? s.requiredInventory
      : s.requiredInventory?._id ?? undefined;

  return {
    id: s._id,
    name: s.name,
    basePrice: s.basePrice,
    unit: s.unit,
  currency: s.currency,
    description: s.description ?? undefined,
    active: !!s.active,
    variants: Array.isArray(s.variants) ? s.variants : undefined,
    createdAt: s.createdAt || new Date().toISOString(),
  imageUrl: s.imageFileId ? `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/services/${s._id}/image` : undefined,
  requiredInventory: requiredInventoryId,
    inventoryQuantityPerUnit: s.inventoryQuantityPerUnit,
    canEnable: s.canEnable,
    inventoryStatus: s.inventoryStatus,
    attributeInventoryMatches: s.attributeInventoryMatches,
    autoDisabled: s.autoDisabled,
    disableReason: s.disableReason,
  };
}

function toErrorMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    return data?.message || e.message || fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

export default function ServiceManagement() {
  const { user } = useAuth();
  const role: "owner" | "customer" = user?.role === "customer" ? "customer" : "owner";

  // state
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [sortKey, setSortKey] = useState<"name" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [deletedServices, setDeletedServices] = useState<ServiceItem[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<null | string>(null);
  // UI transition helpers
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        // Load services with inventory status
        const servicesRes = await api.get("/services/mine/with-inventory");
        if (cancelled) return;
        const serviceItems: ServiceItem[] = (servicesRes.data || []).map(mapServiceFromApi);
        setServices(serviceItems);
        
        // Load inventory items for selection
        const inventoryRes = await api.get("/inventory/mine");
        if (cancelled) return;
        const inventoryList: InventoryItem[] = inventoryRes.data || [];
        setInventoryItems(inventoryList);

        // Load deleted services
        const deletedRes = await api.get("/services/mine/deleted");
        if (cancelled) return;
        const deletedMapped: ServiceItem[] = (deletedRes.data || []).map(mapServiceFromApi);
        setDeletedServices(deletedMapped);
      } catch (e: unknown) {
        if (!cancelled) setError(toErrorMessage(e, "Failed to load services"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Crossfade skeleton -> content
  useEffect(() => {
  let timeout: ReturnType<typeof setTimeout>;
    if (loading) {
      setShowSkeleton(true);
      setContentReady(false);
    } else {
      // Wait for skeleton fade out, then show content
      timeout = setTimeout(() => {
        setShowSkeleton(false);
        setContentReady(true);
      }, 250);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  const filtered = useMemo(() => {
    const base = services.filter((s) => {
      const qOK = `${s.name} ${s.description ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const statusOK = statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? s.active : !s.active;
      return qOK && statusOK;
    });
  const sorted = [...base].sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        // createdAt
    const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      }
    });
    return sorted;
  }, [services, query, statusFilter, sortKey, sortDir]);

  const money = (v: number, currency: string = 'PHP') => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
    } catch {
      const prefix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₱';
      return `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  };

  const cacheBust = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${Date.now()}`;
  };

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(item: ServiceItem) {
    setEditing(item);
    setShowModal(true);
  }
  function toForm(draft: ServiceDraft) {
    const form = new FormData();
    form.append('name', draft.name);
    if (draft.description) form.append('description', draft.description);
    form.append('basePrice', String(draft.basePrice));
    form.append('unit', draft.unit);
  if (draft.currency) form.append('currency', draft.currency);
    form.append('active', String(draft.active));
    form.append('variants', JSON.stringify(draft.variants || []));
    // inventory linkage
    if (draft.requiredInventory !== undefined) {
      if (draft.requiredInventory) {
        form.append('requiredInventory', draft.requiredInventory);
      } else {
        // explicit clear when editing and user removed link
        form.append('requiredInventory', '');
      }
    }
    if (draft.inventoryQuantityPerUnit !== undefined) {
      form.append('inventoryQuantityPerUnit', String(draft.inventoryQuantityPerUnit));
    }
    if (draft.imageFile) form.append('image', draft.imageFile);
  if (draft.removeImage) form.append('removeImage', 'true');
    return form;
  }
  async function saveService(item: ServiceDraft) {
    try {
      setError(null);
      if (editing) {
  const res = await api.put(`/services/${editing.id}`, toForm(item), { headers: { 'Content-Type': 'multipart/form-data' } });
        const updated = mapServiceFromApi(res.data);
        if (item.imageFile || item.removeImage) {
          updated.imageUrl = cacheBust(updated.imageUrl);
        }
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
  const res = await api.post(`/services`, toForm(item), { headers: { 'Content-Type': 'multipart/form-data' } });
        const created = mapServiceFromApi(res.data);
        if (item.imageFile) {
          created.imageUrl = cacheBust(created.imageUrl);
        }
        setServices((prev) => [created, ...prev]);
      }
      setShowModal(false);
      setEditing(null);
    } catch (e: unknown) {
      setError(toErrorMessage(e, "Failed to save service"));
    }
  }
  async function toggleActive(id: string) {
    const current = services.find((s) => s.id === id);
    if (!current) return;
    try {
      const res = await api.put(`/services/${id}`, { active: !current.active });
      const updated = mapServiceFromApi(res.data);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e: unknown) {
      setError(toErrorMessage(e, "Failed to update status"));
    }
  }
  async function removeService(id: string) {
    try {
      const res = await api.delete(`/services/${id}`);
      const deletedAt = (res && res.data && res.data.deletedAt) ? String(res.data.deletedAt) : new Date().toISOString();
      const removed = services.find(s => s.id === id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (removed) setDeletedServices((prev) => [{ ...removed, deletedAt }, ...prev]);
    } catch (e: unknown) {
      setError(toErrorMessage(e, "Failed to delete service"));
    }
  }

  async function restoreService(id: string) {
    try {
      const res = await api.post(`/services/${id}/restore`);
      const restored = mapServiceFromApi(res.data);
      setDeletedServices((prev) => prev.filter((s) => s.id !== id));
      setServices((prev) => [restored, ...prev]);
    } catch (e: unknown) {
      setError(toErrorMessage(e, "Failed to restore service"));
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Service Management
          </h1>
          <p className="text-gray-300 text-lg mt-2">Create, update, and organize the services you offer.</p>
        </div>

        {/* Search + Actions */}
        <div className="w-full flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-8">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search services by name or description..."
              className="w-full rounded-xl bg-gray-800/80 border border-gray-600 pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
            />
          </div>
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700/80 text-white rounded-xl border border-gray-600 hover:bg-gray-600/80 hover:border-gray-500 transition-all duration-300 ease-out backdrop-blur-sm hover:scale-105 active:scale-95"
              aria-haspopup="true"
              aria-expanded={showFilters}
            >
              <FunnelIcon className="h-5 w-5" /> 
              <span className="hidden sm:inline">Filter</span>
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl border border-blue-500 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 ease-out hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/25 group"
            >
              <PlusIcon className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" /> 
              <span className="hidden sm:inline">Add Service</span>
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-3 w-80 rounded-2xl border border-gray-600 bg-gray-800/95 backdrop-blur-lg p-4 z-20 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold text-white">Filters & Sort</div>
                  <button
                    className="text-sm px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-all duration-300 ease-out hover:scale-105"
                    onClick={() => setShowFilters(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-3">Status</div>
                    <div className="flex items-center gap-3">
                      {(["ALL", "ACTIVE", "DISABLED"] as const).map((s) => (
                        <label key={s} className="inline-flex items-center gap-2 text-sm text-gray-200 transition-all duration-300 ease-out hover:scale-105 cursor-pointer">
                          <input
                            type="radio"
                            name="statusFilter"
                            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-600 bg-gray-700"
                            checked={statusFilter === s}
                            onChange={() => setStatusFilter(s)}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-3">Sort by</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setSortKey("name");
                          setSortDir("asc");
                        }}
                        className={`text-sm px-4 py-3 rounded-xl border transition-all duration-300 ease-out hover:scale-105 ${
                          sortKey === "name" && sortDir === "asc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/20"
                            : "border-gray-600 text-gray-200 hover:bg-gray-700/50"
                        }`}
                      >
                        Name A–Z
                      </button>
                      <button
                        onClick={() => {
                          setSortKey("name");
                          setSortDir("desc");
                        }}
                        className={`text-sm px-4 py-3 rounded-xl border transition-all duration-300 ease-out hover:scale-105 ${
                          sortKey === "name" && sortDir === "desc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/20"
                            : "border-gray-600 text-gray-200 hover:bg-gray-700/50"
                        }`}
                      >
                        Name Z–A
                      </button>
                      <button
                        onClick={() => {
                          setSortKey("createdAt");
                          setSortDir("desc");
                        }}
                        className={`text-sm px-4 py-3 rounded-xl border transition-all duration-300 ease-out hover:scale-105 ${
                          sortKey === "createdAt" && sortDir === "desc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/20"
                            : "border-gray-600 text-gray-200 hover:bg-gray-700/50"
                        }`}
                      >
                        Newest
                      </button>
                      <button
                        onClick={() => {
                          setSortKey("createdAt");
                          setSortDir("asc");
                        }}
                        className={`text-sm px-4 py-3 rounded-xl border transition-all duration-300 ease-out hover:scale-105 ${
                          sortKey === "createdAt" && sortDir === "asc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/20"
                            : "border-gray-600 text-gray-200 hover:bg-gray-700/50"
                        }`}
                      >
                        Oldest
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      className="text-sm px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-all duration-300 ease-out hover:scale-105"
                      onClick={() => {
                        setStatusFilter("ALL");
                        setSortKey("name");
                        setSortDir("asc");
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs: Active/Disabled and Deleted */}
        <Tab.Group>
          <Tab.List className="mb-6 flex gap-3 p-1 bg-gray-800/50 rounded-2xl border border-gray-600 backdrop-blur-sm w-fit">
            <Tab
              className={({ selected }) =>
                `px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform ${
                  selected 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50 hover:scale-105'
                }`
              }
            >
              Services
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-out transform ${
                  selected 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50 hover:scale-105'
                }`
              }
            >
              Deleted
            </Tab>
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              {/* Services list */}

              {error && (
                <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 px-6 py-4 text-sm backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02]">
                  {error}
                </div>
              )}
              {showSkeleton && (
                <div aria-busy="true" className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-4 transition-opacity duration-300 ${showSkeleton && !contentReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-600 bg-gray-800/50 p-6 animate-pulse backdrop-blur-sm">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 h-20 w-20 rounded-xl bg-gray-700" />
                        <div className="flex-1 space-y-3">
                          <div className="h-5 w-32 rounded bg-gray-700" />
                          <div className="h-4 w-48 rounded bg-gray-700" />
                          <div className="h-4 w-24 rounded bg-gray-700" />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-9 flex-1 rounded-lg bg-gray-700" />
                        <div className="h-9 flex-1 rounded-lg bg-gray-700" />
                        <div className="h-9 flex-1 rounded-lg bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>

              )}
              <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 transition-all duration-300 ${contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'}`}>
                {!loading && filtered.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-gray-600 bg-gray-800/50 p-12 text-center text-gray-300 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02]">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold mb-2">No services found</h3>
                    <p className="text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
                  </div>
                )}
                {filtered.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-gray-600 bg-gray-800/50 backdrop-blur-sm p-6 transition-all duration-300 ease-out hover:scale-[1.05] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 group"
                  >
                    {/* 1. Top Section: Image + Title + Price */}
                    <div className="flex items-start gap-4">
                      {s.imageUrl && (
                        <div className="shrink-0 transition-all duration-300 ease-out group-hover:scale-110">
                          <img
                            src={s.imageUrl}
                            alt={s.name}
                            className="h-20 w-20 object-cover rounded-xl border-2 border-gray-500 transition-all duration-300 ease-out group-hover:border-blue-400"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-200 transition-colors duration-300">
                            {s.name}
                          </h3>
                          <div className="flex gap-1">
                            <span
                              className={`text-xs px-2 py-1 rounded-full border transition-all duration-300 ease-out transform group-hover:scale-110 ${
                                s.active
                                  ? "border-green-400 text-green-300 bg-green-400/10 group-hover:bg-green-400/20"
                                  : "border-gray-400 text-gray-300 bg-gray-400/10 group-hover:bg-gray-400/20"
                              }`}
                            >
                              {s.active ? "Active" : "Disabled"}
                            </span>
                            {s.autoDisabled && (
                              <span className="text-xs px-2 py-1 rounded-full border border-red-400 text-red-300 bg-red-400/10 transition-all duration-300 ease-out transform group-hover:scale-110 group-hover:bg-red-400/20">
                                Auto-Disabled
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2 group-hover:text-gray-200 transition-colors duration-300">
                          {s.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-blue-300 font-semibold bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30 transition-all duration-300 group-hover:bg-blue-500/20">
                            {money(s.basePrice, s.currency || 'PHP')} {s.unit}
                          </span>
                          {s.requiredInventory ? (
                            <span className="text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/30 text-xs transition-all duration-300 group-hover:bg-purple-500/20">
                              Product Linked
                            </span>
                          ) : s.inventoryStatus ? (
                            <span className="text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/30 text-xs transition-all duration-300 group-hover:bg-blue-500/20">
                              Linked via attributes
                            </span>
                          ) : (
                            <span className="text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/30 text-xs transition-all duration-300 group-hover:bg-yellow-500/20">
                              No product linked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Inventory Section (Now Full Width) */}
                    {s.inventoryStatus && (
                      <div className={`mt-4 p-3 rounded-xl border text-xs transition-all duration-300 group-hover:scale-[1.02] ${
                        s.inventoryStatus.isLowStock 
                          ? 'bg-red-500/10 text-red-300 border-red-500/30 group-hover:bg-red-500/20' 
                          : 'bg-green-500/10 text-green-300 border-green-500/30 group-hover:bg-green-500/20'
                      }`}>
                        <div className="font-semibold mb-1">Inventory Status:</div>
                        <div className="flex justify-between items-center">
                            <span>{s.inventoryStatus.name}</span>
                            <span className="font-mono bg-black/20 px-2 py-0.5 rounded">{s.inventoryStatus.amount} / {s.inventoryStatus.minAmount}</span>
                        </div>
                      </div>
                    )}

                    {s.disableReason && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 transition-all duration-300 group-hover:bg-red-500/20">
                        <strong>Disable Reason:</strong> {s.disableReason}
                      </div>
                    )}

                    {/* 3. Attributes Section (Already Full Width) */}
                    {s.variants && s.variants.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-700/30 rounded-xl border border-gray-600 transition-all duration-300 group-hover:scale-[1.02]">
                        <div className="text-xs text-gray-400 mb-2 font-medium">Attributes:</div>
                        <div className="space-y-2">
                          {s.variants.map((v) => (
                            <div key={v.label} className="text-xs text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                              <span className="font-semibold">{v.label}:</span> {v.options.map((o) => o.name).join(", ")}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => toggleActive(s.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 ${
                          s.active
                            ? "bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20 hover:border-green-400/50"
                            : "bg-gray-500/10 text-gray-300 border border-gray-500/30 hover:bg-gray-500/20 hover:border-gray-400/50"
                        }`}
                      >
                        {s.active ? <CheckCircleIcon className="h-4 w-4" /> : <NoSymbolIcon className="h-4 w-4" />}
                        {s.active ? "Enabled" : "Disabled"}
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-400/50 px-4 py-3 text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95"
                      >
                        <PencilSquareIcon className="h-4 w-4" /> Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(s.id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 hover:border-red-400/50 px-4 py-3 text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95"
                      >
                        <TrashIcon className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </Tab.Panel>
            <Tab.Panel>
              {/* Deleted services list */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {deletedServices.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-gray-600 bg-gray-800/50 p-12 text-center text-gray-300 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02]">
                    <div className="text-6xl mb-4">🗑️</div>
                    <h3 className="text-xl font-semibold mb-2">No deleted services</h3>
                    <p className="text-gray-400">Deleted services will appear here and can be restored within 30 days.</p>
                  </div>
                )}
                {deletedServices.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-gray-600 bg-gray-800/50 backdrop-blur-sm p-6 transition-all duration-300 ease-out hover:scale-[1.05] hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-500/10 group">
                    <div className="flex items-start gap-4">
                      {s.imageUrl && (
                        <img src={s.imageUrl} alt={s.name} className="h-16 w-16 object-cover rounded-xl border-2 border-gray-500 transition-all duration-300 ease-out group-hover:border-red-400" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white group-hover:text-red-200 transition-colors duration-300">{s.name}</h3>
                          <span className="text-xs px-2 py-1 rounded-full border border-red-400 text-red-300 bg-red-400/10 transition-all duration-300 ease-out transform group-hover:scale-110 group-hover:bg-red-400/20">
                            Deleted
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-3 group-hover:text-gray-200 transition-colors duration-300">{s.description}</p>
                        {s.deletedAt && (
                          <div className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 transition-all duration-300 group-hover:bg-yellow-500/20">
                            ⏳ Permanent deletion in {Math.max(0, 30 - Math.floor((Date.now() - new Date(s.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))} days
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={() => restoreService(s.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20 hover:border-green-400/50 px-4 py-3 text-sm font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-95"
                      >
                        <CheckCircleIcon className="h-4 w-4" /> Restore Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Add/Edit modal */}
      <ServiceModal
        open={showModal}
        initial={editing ?? undefined}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSave={saveService}
        inventoryItems={inventoryItems}
      />
      {/* Delete confirmation */}
      <Transition show={!!showDeleteConfirm} as={Fragment}>
        <Dialog onClose={() => setShowDeleteConfirm(null)} className="relative z-50">
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 md:p-8">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95">
                <DialogPanel className="w-full max-w-md rounded-2xl bg-gray-800 border border-gray-600 shadow-2xl p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 mb-4">
                      <TrashIcon className="h-6 w-6 text-red-400" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-white mb-2">Delete service?</Dialog.Title>
                    <p className="text-sm text-gray-300 mb-6">This will move the service to Deleted. You can restore it later from the Deleted tab.</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button 
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-all duration-300 ease-out transform hover:scale-105" 
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-300 ease-out transform hover:scale-105"
                      onClick={() => {
                        if (showDeleteConfirm) removeService(showDeleteConfirm);
                        setShowDeleteConfirm(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </DialogPanel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <style>{`
        @keyframes fadeIn { from {opacity: 0} to {opacity:1} }
        .animate-fadeIn { animation: fadeIn 0.2s ease forwards; }
      `}</style>
    </DashboardLayout>
  );
}

// ServiceModal component remains exactly the same as before
function ServiceModal({
  open,
  onClose,
  initial,
  onSave,
  inventoryItems,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ServiceItem;
  onSave: (item: ServiceDraft) => void;
  inventoryItems: InventoryItem[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState<number>(initial?.basePrice ?? 0);
  const [unit, setUnit] = useState<PricingUnit>(initial?.unit ?? "per page");
  const [currency, setCurrency] = useState<string>(initial?.currency ?? 'PHP');
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [variants, setVariants] = useState<ServiceVariant[]>(initial?.variants ?? []);
  // link service to inventory
  const [requiredInventory, setRequiredInventory] = useState<string | undefined>(initial?.requiredInventory);
  const [inventoryQuantityPerUnit, setInventoryQuantityPerUnit] = useState<number>(initial?.inventoryQuantityPerUnit ?? 1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [showCropper, setShowCropper] = useState<string | null>(null); // holds objectURL to crop
  const [removeImage, setRemoveImage] = useState<boolean>(false);
  const [imageOriginalSrc, setImageOriginalSrc] = useState<string | null>(initial?.imageUrl ?? null);
  // track which variant option input is focused for suggestion dropdown
  const [focusedOption, setFocusedOption] = useState<{ v: number; o: number } | null>(null);

  // sync when opening for edit
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setBasePrice(initial?.basePrice ?? 0);
      setUnit(initial?.unit ?? "per page");
      setCurrency(initial?.currency ?? 'PHP');
      setActive(initial?.active ?? true);
      setVariants(initial?.variants ?? []);
      setRequiredInventory(initial?.requiredInventory);
      setInventoryQuantityPerUnit(initial?.inventoryQuantityPerUnit ?? 1);
      setImageFile(null);
      setImagePreview(initial?.imageUrl ?? null);
      setImageOriginalSrc(initial?.imageUrl ?? null);
      setRemoveImage(false);
    }
  }, [open, initial]);

  function onSelectImage(file: File | null) {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      // set original src to the newly selected image (revoke previous blob original)
      setImageOriginalSrc((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return url;
      });
      // open cropper with the original selection
      setShowCropper(url);
      setRemoveImage(false);
    } else {
      setImagePreview(initial?.imageUrl ?? null);
      setImageOriginalSrc(initial?.imageUrl ?? null);
    }
  }

  function addVariant() {
    setVariants((v) => [...v, { label: "Attribute", options: [{ name: "Option", priceDelta: 0 }] }]);
  }
  function removeVariant(idx: number) {
    setVariants((v) => v.filter((_, i) => i !== idx));
  }
  function updateVariantLabel(idx: number, label: string) {
    setVariants((v) => v.map((it, i) => (i === idx ? { ...it, label } : it)));
  }
  function addVariantOption(vIdx: number) {
    setVariants((v) => v.map((it, i) => (i === vIdx ? { ...it, options: [...it.options, { name: "Option", priceDelta: 0 }] } : it)));
  }
  function updateVariantOption(vIdx: number, oIdx: number, patch: Partial<VariantOption>) {
    setVariants((v) =>
      v.map((it, i) =>
        i === vIdx
          ? { ...it, options: it.options.map((op, j) => (j === oIdx ? { ...op, ...patch } : op)) }
          : it
      )
    );
  }
  function removeVariantOption(vIdx: number, oIdx: number) {
    setVariants((v) => v.map((it, i) => (i === vIdx ? { ...it, options: it.options.filter((_, j) => j !== oIdx) } : it)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const draft: ServiceDraft = {
      name: name.trim(),
      description: description.trim() || undefined,
      basePrice: Math.max(0, Number(basePrice) || 0),
      unit,
  currency,
      active,
      variants: variants.length ? variants : undefined,
      requiredInventory,
      inventoryQuantityPerUnit,
      imageFile,
      removeImage,
    };
    onSave(draft);
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-2xl">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <DialogPanel className="rounded-2xl bg-gray-800 text-white border border-gray-600 shadow-2xl backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.01]">
                <div className="flex items-center justify-between p-6 border-b border-gray-600">
                  <Dialog.Title className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    {initial ? "Edit Service" : "Add Service"}
                  </Dialog.Title>
                  <button 
                    onClick={onClose} 
                    className="p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90" 
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Service name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                        placeholder="e.g. Custom Mug Printing"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Base price</label>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">{currencySymbol(currency)}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={basePrice}
                          onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Pricing unit</label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as PricingUnit)}
                        className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                      >
                        <option>per page</option>
                        <option>per sq ft</option>
                        <option>per item</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                      >
                        <option value="PHP">PHP (₱)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="SGD">SGD (S$)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CNY">CNY (¥)</option>
                      </select>
                    </div>
                  </div>
                  {/* Inventory linking */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Linked product</label>
                      <select
                        value={requiredInventory || ''}
                        onChange={(e) => setRequiredInventory(e.target.value || undefined)}
                        className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                      >
                        <option value="">Select product</option>
                        {inventoryItems.map(ii => (
                          <option key={ii._id} value={ii._id}>{ii.name} (qty {ii.amount})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Units per service</label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={inventoryQuantityPerUnit}
                        onChange={(e) => setInventoryQuantityPerUnit(Math.max(0, parseInt(e.target.value || '0', 10)))}
                        className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short description"
                      className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02] backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 transition-all duration-300 ease-out hover:text-gray-200">Service image</label>
                    <div>
                      {imagePreview ? (
                        <div className="mt-1 mx-auto w-36">
                          <div
                            className="flex flex-col items-center justify-center w-36 h-36 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-100 transition-all duration-300 ease-out transform hover:scale-105"
                            role="button"
                            onClick={() => setShowCropper(imageOriginalSrc ?? imagePreview)}
                            title="Click to crop"
                          >
                            <div className="h-32 w-32 rounded-lg overflow-hidden bg-white flex items-center justify-center transition-all duration-300 ease-out hover:scale-105">
                              <img src={imagePreview} alt="preview" className="h-full w-full object-cover transition-all duration-300 ease-out hover:scale-110" />
                            </div>
                          </div>
              <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview((prev) => {
                                  if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                                  return null;
                                });
                                setImageOriginalSrc((prev) => {
                                  if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                                  return null;
                                });
                                setRemoveImage(true);
                              }}
                className="w-full rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300 text-center transition-all duration-300 ease-out transform hover:scale-105 hover:bg-red-500/20"
                            >
                              Remove image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="serviceImage"
                          className="mt-1 mx-auto flex flex-col items-center justify-center w-36 h-36 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-100 text-center transition-all duration-300 ease-out transform hover:scale-105 hover:border-gray-400"
                        >
                          <svg
                            className="w-8 h-8 mb-2 text-gray-500 transition-all duration-300 ease-out hover:scale-110"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M7 12h10" />
                          </svg>
                          <p className="mb-1 text-sm text-gray-500 text-center transition-all duration-300 ease-out hover:text-gray-600">
                            <span className="font-semibold">Click to upload</span> or drag & drop
                          </p>
                          <p className="text-xs text-gray-500 text-center transition-all duration-300 ease-out hover:text-gray-600">PNG, JPG or SVG</p>
                          <input
                            id="serviceImage"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onSelectImage(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Dynamic attributes (sizes/colors/etc.) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-gray-300">Attributes</div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-all duration-300 ease-out transform hover:scale-105"
                      >
                        <PlusIcon className="h-5 w-5 transition-transform duration-300 hover:rotate-90" /> Add attribute
                      </button>
                    </div>
                    {variants.length === 0 && (
                      <div className="text-sm text-gray-400 p-4 border border-dashed border-gray-600 rounded-xl text-center transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-gray-700/30">
                        Add attributes like Size, Color, Material, etc.
                      </div>
                    )}
                    <div className="space-y-4">
                      {variants.map((v, vIdx) => (
                        <div key={vIdx} className="rounded-xl border border-gray-600 p-4 bg-gray-700/30 transition-all duration-300 ease-out hover:scale-[1.02] hover:border-gray-500">
                          <div className="flex items-center gap-3">
                            <input
                              value={v.label}
                              onChange={(e) => updateVariantLabel(vIdx, e.target.value)}
                              className="flex-1 rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02]"
                              placeholder="Attribute label (e.g., Size)"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(vIdx)}
                              className="p-3 rounded-xl hover:bg-red-500/10 border border-red-500/30 transition-all duration-300 ease-out transform hover:scale-110"
                              title="Remove attribute"
                            >
                              <TrashIcon className="h-5 w-5 text-red-300" />
                            </button>
                          </div>
                          <div className="mt-3 space-y-3">
                            {v.options.map((o, oIdx) => {
                              // suggestion list from inventory item names (unique)
                              const suggestionSet = new Set(inventoryItems.map(ii => ii.name).filter(Boolean));
                              const suggestions = Array.from(suggestionSet).sort((a,b)=>a.localeCompare(b));
                              const filteredSuggestions = o.name.trim() ? suggestions.filter(s => s.toLowerCase().includes(o.name.toLowerCase())) : suggestions;
                              const isFocused = focusedOption && focusedOption.v === vIdx && focusedOption.o === oIdx;
                              return (
                                <div key={oIdx} className="grid grid-cols-5 gap-3 items-start relative">
                                  <div className="col-span-3">
                                    <div className="relative">
                                      <input
                                        value={o.name}
                                        onChange={(e) => updateVariantOption(vIdx, oIdx, { name: e.target.value })}
                                        onFocus={() => setFocusedOption({ v: vIdx, o: oIdx })}
                                        onBlur={() => setTimeout(() => {
                                          setFocusedOption(prev => (prev && prev.v === vIdx && prev.o === oIdx) ? null : prev);
                                        }, 120)}
                                        className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02]"
                                        placeholder="Option (e.g., Size A4 / Material PVC)"
                                        aria-haspopup="listbox"
                                      />
                                      {isFocused && suggestions.length > 0 && (
                                        <div className="absolute z-40 mt-1 w-full rounded-xl border border-gray-600 bg-gray-800 shadow-2xl max-h-48 overflow-auto backdrop-blur-sm">
                                          {filteredSuggestions.length === 0 && (
                                            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
                                          )}
                                          {filteredSuggestions.map(s => (
                                            <div
                                              key={s}
                                              role="option"
                                              onMouseDown={(e) => { e.preventDefault(); updateVariantOption(vIdx, oIdx, { name: s }); setFocusedOption(null); }}
                                              className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-700/50 transition-all duration-200 ${s === o.name ? 'bg-gray-700/50' : ''}`}
                                            >
                                              {s}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="col-span-2 flex items-center gap-3">
                                    <span className="text-gray-400 text-sm">+{currencySymbol(currency)}</span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min={0}
                                      step="0.01"
                                      value={o.priceDelta}
                                      onChange={(e) =>
                                        updateVariantOption(vIdx, oIdx, { priceDelta: parseFloat(e.target.value) || 0 })
                                      }
                                      className="w-full rounded-xl bg-gray-700/50 border border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ease-out hover:border-gray-500 hover:scale-[1.02]"
                                      placeholder="0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeVariantOption(vIdx, oIdx)}
                                      className="p-3 rounded-xl hover:bg-red-500/10 border border-red-500/30 transition-all duration-300 ease-out transform hover:scale-110"
                                      title="Remove option"
                                    >
                                      <TrashIcon className="h-5 w-5 text-red-300" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => addVariantOption(vIdx)}
                              className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-all duration-300 ease-out transform hover:scale-105"
                            >
                              <PlusIcon className="h-4 w-4 transition-transform duration-300 hover:rotate-90" /> Add option
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={onClose} 
                      className="px-6 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-all duration-300 ease-out transform hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-300 ease-out transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                    >
                      {initial ? "Save changes" : "Create service"}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {showCropper && (
        <CropperModal
          src={showCropper}
          aspect={1}
          onCancel={() => {
            if (showCropper && showCropper.startsWith('blob:')) URL.revokeObjectURL(showCropper);
            setShowCropper(null);
          }}
          onApply={(file) => {
            // keep original file; use cropped only for preview
            const url = URL.createObjectURL(file);
            setImagePreview((prev) => {
              if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
              return url;
            });
            // upload the cropped file
            setImageFile(file);
            // do not change imageOriginalSrc or imageFile here, to retain the original when re-editing
            if (showCropper && showCropper.startsWith('blob:')) URL.revokeObjectURL(showCropper);
            setShowCropper(null);
            setRemoveImage(false);
          }}
        />
      )}
    </Transition>
  );
}