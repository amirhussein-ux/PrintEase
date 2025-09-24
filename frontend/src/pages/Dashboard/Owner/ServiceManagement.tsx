import { Fragment, useMemo, useState, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
import { Dialog, DialogPanel, Transition } from "@headlessui/react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  FunnelIcon,
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
};

function mapServiceFromApi(s: ApiService): ServiceItem {
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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [sortKey, setSortKey] = useState<"name" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
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
        const res = await api.get("/services/mine");
        if (cancelled) return;
        const items: ServiceItem[] = (res.data || []).map(mapServiceFromApi);
        setServices(items);
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
      await api.delete(`/services/${id}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e: unknown) {
      setError(toErrorMessage(e, "Failed to delete service"));
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-7xl mx-auto ">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Service Management</h1>
          <p className="text-gray-300 text-sm">Create, update, and organize the services you offer.</p>
        </div>

        {/* Search + Actions */}
        <div className="w-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search services"
            className="flex-1 rounded-lg px-4 py-2 bg-gray-900/60 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg border border-white/10 hover:bg-gray-700 transition"
              aria-haspopup="true"
              aria-expanded={showFilters}
            >
              <FunnelIcon className="h-5 w-5" /> Filter
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-500 transition"
            >
              <PlusIcon className="h-5 w-5" /> Add Service
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-white/10 bg-gray-900 p-3 z-20 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-white">Filters</div>
                  <button
                    className="text-xs px-3 py-1 rounded border border-white/10 text-gray-200 hover:bg-white/10"
                    onClick={() => setShowFilters(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Status</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(["ALL", "ACTIVE", "DISABLED"] as const).map((s) => (
                        <label key={s} className="inline-flex items-center gap-1 text-xs text-gray-200">
                          <input
                            type="radio"
                            name="statusFilter"
                            className="h-3 w-3"
                            checked={statusFilter === s}
                            onChange={() => setStatusFilter(s)}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Sort by</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSortKey("name");
                          setSortDir("asc");
                        }}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          sortKey === "name" && sortDir === "asc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/10"
                            : "border-white/10 text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        Name A–Z
                      </button>
                      <button
                        onClick={() => {
                          setSortKey("name");
                          setSortDir("desc");
                        }}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          sortKey === "name" && sortDir === "desc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/10"
                            : "border-white/10 text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        Name Z–A
                      </button>
                      <button
                        onClick={() => {
                          setSortKey("createdAt");
                          setSortDir("desc");
                        }}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          sortKey === "createdAt" && sortDir === "desc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/10"
                            : "border-white/10 text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        Newest
                      </button>
                      <button
                        onClick={() => {
                          setSortKey("createdAt");
                          setSortDir("asc");
                        }}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          sortKey === "createdAt" && sortDir === "asc"
                            ? "border-blue-500 text-blue-200 bg-blue-500/10"
                            : "border-white/10 text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        Oldest
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      className="text-xs px-3 py-1 rounded border border-white/10 text-gray-200 hover:bg-white/10"
                      onClick={() => {
                        setStatusFilter("ALL");
                        setSortKey("name");
                        setSortDir("asc");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  </div>

        {/* Services list */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>
        )}
        {showSkeleton && (
          <div aria-busy="true" className={`grid grid-cols-1 gap-4 mb-4 transition-opacity duration-300 ${showSkeleton && !contentReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border shadow-2xl border-blue-800 bg-blue-800 p-4 animate-pulse flex items-center gap-4">
                <div className="shrink-0 h-24 w-24 rounded-md bg-white/10" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-40 rounded bg-white/10" />
                    <div className="h-4 w-16 rounded-full bg-white/10" />
                  </div>
                  <div className="mt-2 h-4 w-64 rounded bg-white/10" />
                  <div className="mt-3 flex gap-3">
                    <div className="h-3 w-32 rounded bg-white/10" />
                    <div className="h-3 w-28 rounded bg-white/10" />
                  </div>
                  <div className="mt-2 h-3 w-48 rounded bg-white/10" />
                </div>
                <div className="flex flex-col gap-2 self-start w-28">
                  <div className="h-9 w-full rounded-lg bg-white/10" />
                  <div className="h-9 w-full rounded-lg bg-white/10" />
                  <div className="h-9 w-full rounded-lg bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-1'}`}>
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">No services found.</div>
          )}
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border shadow-2xl border-blue-800 bg-blue-800 bg-none p-4 flex items-center gap-4"
            >
              {s.imageUrl && (
                <div className="shrink-0">
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="h-24 w-24 object-cover rounded-md border border-white/10"
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{s.name}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      s.active
                        ? "border-green-400 text-green-300 bg-green-400/10"
                        : "border-gray-400 text-gray-300 bg-gray-400/10"
                    }`}
                  >
                    {s.active ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="text-gray-300 text-sm mt-0.5">{s.description}</div>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-200">
                  <span>
                    <strong>Pricing:</strong> {money(s.basePrice, s.currency || 'PHP')} {s.unit}
                  </span>
                </div>
                {s.variants && s.variants.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400">Attributes</div>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {s.variants.map((v) => (
                        <div key={v.label} className="text-xs text-gray-200">
                          <span className="font-semibold">{v.label}:</span> {v.options.map((o) => o.name).join(", ")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 self-start">
                <button
                  onClick={() => toggleActive(s.id)}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${
                    s.active
                      ? "bg-green-600 text-white hover:bg-green-500 border border-green-600"
                      : "bg-gray-600 text-white hover:bg-gray-500 border border-gray-600"
                  }`}
                  title={s.active ? "Disable" : "Enable"}
                >
                  {s.active ? <CheckCircleIcon className="h-5 w-5" /> : <NoSymbolIcon className="h-5 w-5" />}
                  {s.active ? "Enabled" : "Disabled"}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 text-sm border border-blue-600"
                >
                  <PencilSquareIcon className="h-5 w-5" /> Edit
                </button>
                <button
                  onClick={() => removeService(s.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 text-white hover:bg-red-500 px-3 py-1.5 text-sm border border-red-600"
                >
                  <TrashIcon className="h-5 w-5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
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
      />
    </DashboardLayout>
  );
}

function ServiceModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ServiceItem;
  onSave: (item: ServiceDraft) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState<number>(initial?.basePrice ?? 0);
  const [unit, setUnit] = useState<PricingUnit>(initial?.unit ?? "per page");
  const [currency, setCurrency] = useState<string>(initial?.currency ?? 'PHP');
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [variants, setVariants] = useState<ServiceVariant[]>(initial?.variants ?? []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [showCropper, setShowCropper] = useState<string | null>(null); // holds objectURL to crop
  const [removeImage, setRemoveImage] = useState<boolean>(false);
  const [imageOriginalSrc, setImageOriginalSrc] = useState<string | null>(initial?.imageUrl ?? null);

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
          <div className="fixed inset-0 bg-black/50" />
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
              <DialogPanel className="rounded-xl bg-gray-900 text-white border border-white/10 shadow-xl">
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
                  <Dialog.Title className="text-lg font-semibold">{initial ? "Edit Service" : "Add Service"}</Dialog.Title>
                  <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Service name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="e.g. Custom Mug Printing"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Base price</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{currencySymbol(currency)}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={basePrice}
                          onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Pricing unit</label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as PricingUnit)}
                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option>per page</option>
                        <option>per sq ft</option>
                        <option>per item</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short description"
                      className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Service image</label>
                    <div>
                      {imagePreview ? (
                        <div className="mt-1 mx-auto w-36">
                          <div
                            className="flex flex-col items-center justify-center w-36 h-36 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100"
                            role="button"
                            onClick={() => setShowCropper(imageOriginalSrc ?? imagePreview)}
                            title="Click to crop"
                          >
                            <div className="h-32 w-32 rounded-md overflow-hidden bg-white flex items-center justify-center">
                              <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                            </div>
                          </div>
              <div className="mt-2">
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
                className="w-full rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 text-center"
                            >
                              Remove image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="serviceImage"
                          className="mt-1 mx-auto flex flex-col items-center justify-center w-36 h-36 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100 text-center"
                        >
                          <svg
                            className="w-8 h-8 mb-2 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M7 12h10" />
                          </svg>
                          <p className="mb-1 text-sm text-gray-500 text-center">
                            <span className="font-semibold">Click to upload</span> or drag & drop
                          </p>
                          <p className="text-xs text-gray-500 text-center">PNG, JPG or SVG</p>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Attributes</div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200"
                      >
                        <PlusIcon className="h-4 w-4" /> Add attribute
                      </button>
                    </div>
                    {variants.length === 0 && (
                      <div className="text-xs text-gray-400">Add attributes like Size, Color, Material, etc.</div>
                    )}
                    <div className="space-y-3">
                      {variants.map((v, vIdx) => (
                        <div key={vIdx} className="rounded-lg border border-white/10 p-3">
                          <div className="flex items-center gap-2">
                            <input
                              value={v.label}
                              onChange={(e) => updateVariantLabel(vIdx, e.target.value)}
                              className="flex-1 rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              placeholder="Attribute label (e.g., Size)"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(vIdx)}
                              className="p-2 rounded-lg hover:bg-white/10"
                              title="Remove attribute"
                            >
                              <TrashIcon className="h-5 w-5 text-red-300" />
                            </button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {v.options.map((o, oIdx) => (
                              <div key={oIdx} className="grid grid-cols-5 gap-2 items-center">
                                <div className="col-span-3">
                                  <input
                                    value={o.name}
                                    onChange={(e) => updateVariantOption(vIdx, oIdx, { name: e.target.value })}
                                    className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    placeholder="Option (e.g., A4 / Red / Small)"
                                  />
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
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
                                    className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    placeholder="0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeVariantOption(vIdx, oIdx)}
                                    className="p-2 rounded-lg hover:bg-white/10"
                                    title="Remove option"
                                  >
                                    <TrashIcon className="h-5 w-5 text-red-300" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addVariantOption(vIdx)}
                              className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                            >
                              <PlusIcon className="h-4 w-4" /> Add option
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold">
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


