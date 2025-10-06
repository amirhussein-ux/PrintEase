import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import DashboardLayout from '../../Dashboard/shared_components/DashboardLayout';
import api from '../../../lib/api';

type OrderStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';

type SelectedOption = { label: string; optionIndex?: number; optionName?: string; priceDelta?: number };
type OrderItem = {
  service: string;
  serviceName?: string;
  unit?: string;
  currency?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: SelectedOption[];
};
type OrderFile = { fileId: string; filename?: string; mimeType?: string; size?: number };
type Order = {
  _id: string;
  user: string;
  store: string;
  items: OrderItem[];
  notes?: string;
  files: OrderFile[];
  status: OrderStatus;
  subtotal: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  pickupToken?: string;
  timeEstimates?: {
    processing: number;
    ready: number;
    completed: number;
  };
  stageTimestamps?: {
    pending: string;
    processing?: string;
    ready?: string;
    completed?: string;
  };
};

const FILTERS: { label: string; value: 'all' | OrderStatus }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready For Pick-up', value: 'ready' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function money(v: number, currency: string = 'PHP') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    const prefix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₱';
    return `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

function getTimeRemaining(order: Order): string {
  if (!order.timeEstimates || !order.stageTimestamps) return '';
  
  const now = new Date();
  const currentStage = order.status;
  
  if (currentStage === 'pending') {
    const estimate = order.timeEstimates.processing;
    return `Est. ${estimate}h to start processing`;
  } else if (currentStage === 'processing') {
    const startTime = new Date(order.stageTimestamps.processing || order.stageTimestamps.pending);
    const elapsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
    const remaining = Math.max(0, order.timeEstimates.processing - elapsed);
    return `~${remaining.toFixed(1)}h remaining`;
  } else if (currentStage === 'ready') {
    return 'Ready for pickup!';
  } else if (currentStage === 'completed') {
    return 'Order completed!';
  }
  
  return '';
}

function statusBadgeClasses(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'border-gray-400 text-gray-200 bg-gray-400/10';
    case 'processing':
      return 'border-amber-400 text-amber-200 bg-amber-400/10';
    case 'ready':
      return 'border-indigo-400 text-indigo-200 bg-indigo-400/10';
    case 'completed':
      return 'border-green-400 text-green-200 bg-green-400/10';
    case 'cancelled':
      return 'border-red-400 text-red-200 bg-red-400/10';
    default:
      return 'border-white/20 text-white/80';
  }
}

export default function TrackOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/orders/mine');
        if (cancelled) return;
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length, pending: 0, processing: 0, ready: 0, completed: 0, cancelled: 0 };
    for (const o of orders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return map as Record<'all' | OrderStatus, number>;
  }, [orders]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  function itemSummary(it: OrderItem) {
    const opts = (it.selectedOptions || [])
      .filter((o) => o.optionName)
      .map((o) => `${o.label}: ${o.optionName}`)
      .join(' · ');
    return opts || '—';
  }

  function shortId(id: string) {
    return `#${id.slice(-6).toUpperCase()}`;
  }

  // UTC date formatter
  function formatDateUTC(iso?: string) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'UTC'
      });
    } catch {
      return iso;
    }
  }

  async function cancelOrder(id: string) {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      setUpdatingId(id);
      const res = await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      const updated = res.data as Order;
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      alert(err?.response?.data?.message || err?.message || 'Failed to cancel order');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardLayout role="customer">
      <div className="max-w-7xl mx-auto">
  {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Orders</h1>
          <p className="text-gray-300 text-sm">Track your printing orders and their status.</p>
        </div>

  {/* Filters */}
        <div className="mb-5">
          <div className="inline-flex flex-wrap gap-2 bg-gray-900/50 border border-white/10 rounded-xl p-2">
            {FILTERS.map(({ label, value }) => {
              const active = activeFilter === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveFilter(value)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                      : 'bg-transparent text-gray-200 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    active
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-200'
                  }`}>
                    {counts[value] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

  {/* Status */}
        {loading && (
          <div className="mb-3 text-sm text-gray-300">Loading orders…</div>
        )}
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>
        )}

  {/* Orders */}
        <div className="grid grid-cols-1 gap-4">
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">No orders found.</div>
          )}
          {filtered.map((o) => {
            const first = o.items[0];
            const total = o.subtotal ?? first?.totalPrice ?? 0;
            const currency = o.currency || first?.currency || 'PHP';
            return (
              <div key={o._id} className="rounded-xl border shadow-2xl border-blue-800 bg-blue-800 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-white font-semibold">{shortId(o._id)}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClasses(o.status)}`}>
                        {o.status === 'pending' && 'Not yet Started'}
                        {o.status === 'processing' && 'In Progress'}
                        {o.status === 'ready' && 'Ready For Pick-up'}
                        {o.status === 'completed' && 'Completed'}
                        {o.status === 'cancelled' && 'Cancelled'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 font-mono tabular-nums mt-0.5">
                      {formatDateUTC(o.createdAt)}
                    </div>
                    {getTimeRemaining(o) && (
                      <div className="text-xs text-blue-300 mt-1 font-medium">
                        {getTimeRemaining(o)}
                      </div>
                    )}
                    <div className="mt-1 text-gray-200 text-sm">
                      <div className="font-medium">{first?.serviceName || 'Service'}</div>
                      <div className="text-xs text-gray-300">Qty: {first?.quantity} {first?.unit ? `· ${first.unit}` : ''}</div>
                      {first && (
                        <div className="text-xs text-gray-300 mt-1">{itemSummary(first)}</div>
                      )}
                      {o.notes && (
                        <div className="text-xs text-gray-200 mt-2"><span className="text-gray-300">Notes:</span> {o.notes}</div>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="sm:text-right">
                    <div className="text-white font-semibold">{money(total, currency)}</div>
                    <div className="text-xs text-gray-200">Total</div>
                    {o.status === 'pending' && (
                      <div className="mt-2">
                        <button
                          disabled={updatingId === o._id}
                          onClick={() => cancelOrder(o._id)}
                          className={`px-3 py-1.5 rounded-lg text-sm border bg-red-600 border-red-600 text-white hover:bg-red-500 ${
                            updatingId === o._id ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                        >
                          {updatingId === o._id ? 'Cancelling…' : 'Cancel Order'}
                        </button>
                      </div>
                    )}
                    {o.files?.length > 0 && (
                      <div className="mt-2 text-xs text-gray-200">
                        Files: {o.files.length}
                        <div className="mt-1 space-y-1">
                          {o.files.slice(0, 3).map((f) => (
                            <a
                              key={String(f.fileId)}
                              href="#"
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const res = await api.get(`/orders/${o._id}/files/${f.fileId}` as const, { responseType: 'blob' });
                                  const blob = new Blob([res.data], { type: res.headers['content-type'] || f.mimeType || 'application/octet-stream' });
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  const cd = res.headers['content-disposition'] || '';
                                  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
                                  const headerName = decodeURIComponent((match?.[1] || match?.[2] || '').trim());
                                  a.download = headerName || f.filename || `file-${String(f.fileId)}.`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  setTimeout(() => URL.revokeObjectURL(url), 2000);
                                } catch (err) {
                                  const e2 = err as { response?: { data?: { message?: string } }; message?: string };
                                  alert(e2?.response?.data?.message || e2?.message || 'Download failed');
                                }
                              }}
                              className="block text-blue-200 hover:text-blue-100 underline truncate max-w-[280px]"
                              title={f.filename || 'file'}
                            >
                              {f.filename || String(f.fileId)}
                            </a>
                          ))}
                          {o.files.length > 3 && (
                            <div className="text-gray-300">+{o.files.length - 3} more…</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {o.status === 'ready' && o.pickupToken && (
                  <div className="mt-4 p-5 rounded-lg border border-white/10 bg-white/5 text-center w-fill mx-auto">
                    <div className="text-xs text-gray-200 mb-1 p-2">Show this QR at pickup:</div>
                    <div className="bg-white inline-block p-2 rounded mx-auto">
                      <QRCode value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/pickup/${o.pickupToken}/confirm`} size={128} includeMargin={false} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
