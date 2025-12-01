import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import DashboardLayout from '../../Dashboard/shared_components/DashboardLayout';
import jsPDF from 'jspdf';
import logoDark from '../../../assets/PrintEase-logo-dark.png';
import { useSocket } from '../../../context/SocketContext';
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
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  paymentAmount?: number;
  paymentMethod?: string;
  changeGiven?: number;
  receiptIssuedAt?: string;
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Track which order IDs have their QR visible
  const [openQR, setOpenQR] = useState<Record<string, boolean>>({});
  // Keep refs to QR canvases for download/fullscreen
  const qrCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  // Which order's QR is enlarged in a modal (null = none)
  const [enlargeQrFor, setEnlargeQrFor] = useState<string | null>(null);
  // Receipt modal
  const [showReceiptFor, setShowReceiptFor] = useState<string | null>(null);
  const { socket } = useSocket();
  const [storeCache, setStoreCache] = useState<Record<string, { name: string; addressLine?: string; city?: string; state?: string; country?: string; postal?: string; mobile?: string }>>({});
  const location = useLocation();
  const navigate = useNavigate();

  // Close modal on ESC and lock body scroll when open
  useEffect(() => {
    if (!enlargeQrFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlargeQrFor(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [enlargeQrFor]);

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

  // Sync filter from query param (?status=processing etc.)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (!status) {
      setActiveFilter('all');
      return;
    }
    if (['pending','processing','ready','completed','cancelled'].includes(status)) {
      setActiveFilter(status as OrderStatus);
    } else if (status === 'all') {
      setActiveFilter('all');
    }
  }, [location.search]);

  // Fetch store info on-demand for receipt
  // Fetch (and cache) store info; return it immediately for use in rendering or PDF
  const getStoreInfo = useCallback(async (storeId: string) => {
    if (!storeId) return null;
    if (storeCache[storeId]) return storeCache[storeId];
    try {
      const res = await api.get('/print-store/list');
      const list = (Array.isArray(res.data) ? res.data : []) as Array<{
        _id: string; name?: string; mobile?: string; address?: { addressLine?: string; city?: string; state?: string; country?: string; postal?: string }
      }>;
      const s = list.find((x) => String(x._id) === String(storeId));
      if (!s) return null;
      const info = {
        name: s.name || 'PrintEase Store',
        addressLine: s.address?.addressLine,
        city: s.address?.city,
        state: s.address?.state,
        country: s.address?.country,
        postal: s.address?.postal,
        mobile: s.mobile,
      };
      setStoreCache(prev => ({ ...prev, [storeId]: info }));
      return info;
    } catch {
      return null;
    }
  }, [storeCache]);

  // Live socket update for receipt_ready (after ensureStoreInfo is defined)
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: { orderId: string; paymentAmount?: number; changeGiven?: number }) => {
      setOrders(prev => prev.map(o => o._id === payload.orderId ? { ...o, paymentStatus: 'paid' as const } : o));
      setShowReceiptFor(payload.orderId);
      // Preload store info so receipt modal shows proper header immediately
      const ordFound = orders.find(o => o._id === payload.orderId);
      if (ordFound) void getStoreInfo(ordFound.store);
    };
    socket.on('receipt_ready', handler);
    return () => { socket.off('receipt_ready', handler); };
  }, [socket, orders, getStoreInfo]);

  // When opening receipt manually (or via auto open), ensure store info is loaded
  useEffect(() => {
    if (!showReceiptFor) return;
    const ord = orders.find(o => o._id === showReceiptFor);
    if (ord) void getStoreInfo(ord.store);
  }, [showReceiptFor, orders, getStoreInfo]);

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

  // Local date/time formatter
  function formatDateUTC(iso?: string) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  }

  function cancelOrder(id: string) {
    // Open confirmation modal instead of browser confirm
    setCancelTargetId(id);
    setShowCancelModal(true);
  }

  async function confirmCancel() {
    const id = cancelTargetId;
    if (!id) return;
    try {
      setUpdatingId(id);
      setShowCancelModal(false);
      const res = await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      const updated = res.data as Order;
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Failed to cancel order';
      setToast({ type: 'error', message });
    } finally {
      setUpdatingId(null);
      setCancelTargetId(null);
      setShowCancelModal(false);
    }
    // show success toast after cancellation
    setToast({ type: 'success', message: 'Order cancelled successfully.' });
  }

  // Auto-hide toast after a short delay
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <DashboardLayout role="customer">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[100000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-sm border transform transition-all duration-300
            ${toast.type === 'error' ? 'bg-gradient-to-r from-red-600/90 to-red-700/90 border-red-400/50 text-white' : 'bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 border-emerald-400/50 text-white'}`}>
          <div className="flex-shrink-0">
            {toast.type === 'error' ? (
              <svg className="w-6 h-6 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ) : (
              <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            )}
          </div>
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wide">
            Order Status
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">Monitor your printing orders and their progress in real-time</p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="inline-flex flex-wrap gap-3 bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-3 shadow-lg">
            {FILTERS.map(({ label, value }) => {
              const active = activeFilter === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    setActiveFilter(value);
                    const params = new URLSearchParams();
                    if (value !== 'all') params.set('status', value);
                    const qs = params.toString();
                    navigate(`/dashboard/my-orders${qs ? `?${qs}` : ''}`, { replace: false });
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                      : 'bg-gray-800/50 text-gray-200 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 hover:shadow-md'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    active
                      ? 'border-white/40 bg-white/20 text-white'
                      : 'border-gray-500 bg-gray-700/50 text-gray-300'
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
          <div className="flex justify-center mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-center max-w-md w-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <div className="text-gray-300 text-sm">Loading your orders...</div>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 backdrop-blur-sm p-4 text-red-200 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Orders Grid */}
        <div className="grid grid-cols-1 gap-6">
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900/50 p-12 text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No orders found</h3>
              <p className="text-gray-500 text-sm">No orders match your current filter selection.</p>
            </div>
          )}
          
          {filtered.map((o) => {
            const first = o.items[0];
            const total = o.subtotal ?? first?.totalPrice ?? 0;
            const currency = o.currency || first?.currency || 'PHP';
            return (
              <div key={o._id} className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Left Content */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-white font-bold text-lg tracking-wide">{shortId(o._id)}</div>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusBadgeClasses(o.status)}`}>
                          {o.status === 'pending' && 'Not yet Started'}
                          {o.status === 'processing' && 'In Progress'}
                          {o.status === 'ready' && 'Ready For Pick-up'}
                          {o.status === 'completed' && 'Completed'}
                          {o.status === 'cancelled' && 'Cancelled'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono tabular-nums bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
                        {formatDateUTC(o.createdAt)}
                      </div>
                    </div>

                    {/* Time Estimate */}
                    {getTimeRemaining(o) && (
                      <div className="flex items-center gap-2 text-sm text-blue-300 font-medium bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getTimeRemaining(o)}
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="space-y-3">
                      <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <h4 className="text-white font-semibold text-sm">{first?.serviceName || 'Print Service'}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Quantity:</span>
                            <span className="font-medium">{first?.quantity} {first?.unit ? `· ${first.unit}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Options:</span>
                            <span className="font-medium truncate">{itemSummary(first)}</span>
                          </div>
                        </div>
                        {o.notes && (
                          <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-start gap-2 text-xs">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <div>
                                <span className="text-gray-400 font-medium">Notes:</span>
                                <span className="text-gray-300 ml-1">{o.notes}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Sidebar */}
                  <div className="lg:w-64 space-y-4">
                    {/* Total Price */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{money(total, currency)}</div>
                      <div className="text-xs text-gray-400 font-medium">Total Amount</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {o.status === 'pending' && (
                        <button
                          disabled={updatingId === o._id}
                          onClick={() => cancelOrder(o._id)}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                            updatingId === o._id 
                              ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed' 
                              : 'bg-red-600 border-red-600 text-white hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/25'
                          }`}
                        >
                          {updatingId === o._id ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Cancelling...
                            </span>
                          ) : 'Cancel Order'}
                        </button>
                      )}
                      
                      {o.status === 'completed' && o.paymentStatus === 'paid' && (
                        <button
                          onClick={() => setShowReceiptFor(o._id)}
                          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-green-600 bg-green-600 text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200"
                        >
                          View Receipt
                        </button>
                      )}
                    </div>

                    {/* Files Section */}
                    {o.files?.length > 0 && (
                      <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-300">Files ({o.files.length})</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
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
                              className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors group"
                              title={f.filename || 'file'}
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                              </svg>
                              <span className="truncate flex-1">{f.filename || String(f.fileId)}</span>
                            </a>
                          ))}
                          {o.files.length > 3 && (
                            <div className="text-xs text-gray-400 text-center pt-1 border-t border-gray-700">
                              +{o.files.length - 3} more files
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Section */}
                {o.status === 'ready' && o.pickupToken && (
                  <div className="mt-6 p-6 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    {!openQR[o._id] ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-indigo-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Ready for pickup. Show QR code at counter when asked.
                        </div>
                        <button
                          onClick={() => setOpenQR((prev) => ({ ...prev, [o._id]: true }))}
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Show QR Code
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-sm text-indigo-200 font-medium">Show this QR code at pickup:</div>
                        <div className="bg-white p-3 rounded-xl shadow-lg mx-auto">
                          <QRCode
                            value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/pickup/${o.pickupToken}/confirm`}
                            size={180}
                            includeMargin={false}
                            ref={(el: HTMLCanvasElement | null) => {
                              qrCanvasRefs.current[o._id] = el;
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const canvas = qrCanvasRefs.current[o._id];
                              try {
                                if (canvas) {
                                  const url = canvas.toDataURL('image/png');
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${shortId(o._id)}-pickup-qr.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                } else {
                                  alert('QR not ready yet.');
                                }
                              } catch (err) {
                                console.error('QR download failed', err);
                                alert('Download failed.');
                              }
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                          <button
                            onClick={() => setEnlargeQrFor(o._id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                            Enlarge
                          </button>
                          <button
                            onClick={() => setOpenQR((prev) => ({ ...prev, [o._id]: false }))}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 bg-transparent text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Cancel Confirmation Modal */}
      {showCancelModal && cancelTargetId && (() => {
        const ord = orders.find(o => o._id === cancelTargetId);
        return (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setShowCancelModal(false)}>
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">Cancel Order</h3>
                  <p className="text-sm text-gray-300 mt-2">Are you sure you want to cancel this order {ord ? <span className="font-mono text-blue-300">{shortId(ord._id)}</span> : ''}? This action cannot be undone.</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button onClick={() => { setShowCancelModal(false); setCancelTargetId(null); }} className="flex-1 px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-all">Keep Order</button>
                <button onClick={() => void confirmCancel()} disabled={updatingId === cancelTargetId} className={`flex-1 px-4 py-2 rounded-xl text-white font-semibold ${updatingId === cancelTargetId ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}>
                  {updatingId === cancelTargetId ? 'Cancelling...' : 'Yes, Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QR Modal */}
      {enlargeQrFor && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setEnlargeQrFor(null)}
        >
          <div
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-6 w-[92vw] max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-sm font-bold rounded-lg text-white cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setEnlargeQrFor(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="text-lg font-semibold text-white">Pickup QR Code</div>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                {(() => {
                  const ord = orders.find((x) => x._id === enlargeQrFor);
                  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/pickup/${ord?.pickupToken}/confirm`;
                  return (
                    <div className="mx-auto" style={{ width: 'min(88vw, 80vh, 400px)' }}>
                      <QRCode
                        value={url}
                        size={1024}
                        includeMargin={false}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    try {
                      const canvas = document.createElement('canvas');
                      const size = 1024;
                      canvas.width = size;
                      canvas.height = size;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) throw new Error('no canvas');
                      const small = qrCanvasRefs.current[enlargeQrFor];
                      if (small) {
                        const link = document.createElement('a');
                        link.href = small.toDataURL('image/png');
                        link.download = `${shortId(enlargeQrFor)}-pickup-qr.png`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      }
                    } catch (e) {
                      console.warn('QR download failed', e);
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Receipt Modal */}
      {showReceiptFor && (() => {
        const ord = orders.find(o => o._id === showReceiptFor);
        if (!ord) return null;
        const first = ord.items[0];
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal>
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-6 w-[92vw] max-w-md">
              <button
                className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-sm font-bold rounded-lg text-white cursor-pointer transition-all duration-200 hover:shadow-md"
                onClick={() => setShowReceiptFor(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold text-white mb-2">Payment Receipt</h3>
              <p className="text-sm text-gray-400 mb-6">Order <span className="font-mono text-blue-300">{shortId(ord._id)}</span> · {ord.receiptIssuedAt ? new Date(ord.receiptIssuedAt).toLocaleString() : ''}</p>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Service</span>
                  <span className="font-medium text-white truncate max-w-[55%]">{first?.serviceName || 'Service'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Quantity</span>
                  <span className="font-medium text-white">{first?.quantity}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="font-bold text-green-400">{money(ord.subtotal, ord.currency || 'PHP')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Paid</span>
                  <span className="font-medium text-white">{money(ord.paymentAmount || ord.subtotal, ord.currency || 'PHP')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-300">Change</span>
                  <span className="font-medium text-white">{money(ord.changeGiven || 0, ord.currency || 'PHP')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Method</span>
                  <span className="font-bold text-blue-400 uppercase">{ord.paymentMethod || 'cash'}</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setShowReceiptFor(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    try {
                      const store = await getStoreInfo(ord.store);
                      const doc = new jsPDF({ unit: 'pt', format: 'A4' });
                      const pageWidth = doc.internal.pageSize.getWidth();
                      // Header logo
                      try {
                        doc.addImage(logoDark as unknown as string, 'PNG', pageWidth/2 - 80, 24, 160, 50);
                      } catch (logoErr) {
                        console.warn('Logo add failed', logoErr);
                      }
                      doc.setFontSize(14).setFont('helvetica','bold');
                      doc.text((store?.name || 'PrintEase Store'), pageWidth/2, 100, { align: 'center' });
                      doc.setFontSize(10).setFont('helvetica','normal');
                      const addrParts = [store?.addressLine, store?.city, store?.state, store?.country, store?.postal].filter(Boolean) as string[];
                      if (addrParts.length) doc.text(addrParts.join(', '), pageWidth/2, 116, { align: 'center' });
                      if (store?.mobile) doc.text(`Contact: ${store.mobile}`, pageWidth/2, 130, { align: 'center' });
                      doc.setDrawColor(180).line(40, 150, pageWidth - 40, 150);
                      doc.setFontSize(12).setFont('helvetica','bold');
                      doc.text('PAYMENT RECEIPT', pageWidth/2, 170, { align: 'center' });
                      doc.setFontSize(9).setFont('helvetica','normal');
                      doc.text(`Order ${shortId(ord._id)}${ord.receiptIssuedAt ? ` · ${new Date(ord.receiptIssuedAt).toLocaleString()}` : ''}`, pageWidth/2, 186, { align: 'center' });

                      let y = 210;
                      const line = (label: string, value: string) => {
                        doc.setFont('helvetica','normal').setFontSize(10);
                        doc.text(label, 50, y);
                        doc.text(value, pageWidth - 50, y, { align: 'right' });
                        y += 16;
                      };
                      line('Service', String(first?.serviceName || 'Service'));
                      line('Quantity', String(first?.quantity || 0));
                      line('Subtotal', money(ord.subtotal, ord.currency || 'PHP'));
                      line('Amount Paid', money(ord.paymentAmount || ord.subtotal, ord.currency || 'PHP'));
                      line('Change', money(ord.changeGiven || 0, ord.currency || 'PHP'));
                      line('Payment Method', String(ord.paymentMethod || 'cash').toUpperCase());
                      y += 10;
                      doc.setFontSize(9).text('Thank you for choosing PrintEase!', pageWidth/2, y, { align: 'center' });
                      doc.save(`${shortId(ord._id)}-receipt.pdf`);
                    } catch (err) {
                      console.error('PDF receipt failed', err);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}