import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
                    {o.status === 'completed' && o.paymentStatus === 'paid' && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowReceiptFor(o._id)}
                          className="px-3 py-1.5 rounded-lg text-sm border bg-green-600 border-green-600 text-white hover:bg-green-500"
                        >
                          View Receipt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {o.status === 'ready' && o.pickupToken && (
                  <div className="mt-4 p-5 rounded-lg border border-white/10 bg-white/5 text-center w-fill mx-auto">
                    {!openQR[o._id] ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-gray-200">Ready for pickup. Show QR at counter when asked.</div>
                        <div>
                          <button
                            onClick={() => setOpenQR((prev) => ({ ...prev, [o._id]: true }))}
                            className="px-3 py-1.5 rounded-lg text-sm border bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500"
                          >
                            Show QR
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-xs text-gray-200">Show this QR at pickup:</div>
                        <div className="bg-white inline-block p-2 rounded mx-auto">
                          <QRCode
                            value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/pickup/${o.pickupToken}/confirm`}
                            size={180}
                            includeMargin={false}
                            ref={(el: HTMLCanvasElement | null) => {
                              qrCanvasRefs.current[o._id] = el;
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
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
                            className="px-3 py-1.5 rounded-lg text-sm border bg-gray-100 text-gray-900 hover:bg-gray-200"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => setEnlargeQrFor(o._id)}
                            className="px-3 py-1.5 rounded-lg text-sm border bg-gray-100 text-gray-900 hover:bg-gray-200"
                          >
                            Enlarge
                          </button>
                          <button
                            onClick={() => setOpenQR((prev) => ({ ...prev, [o._id]: false }))}
                            className="px-3 py-1.5 rounded-lg text-sm border bg-transparent text-gray-200 hover:bg-white/10"
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
      {/* QR Modal */}
      {enlargeQrFor && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setEnlargeQrFor(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-xl p-4 md:p-6 w-[92vw] max-w-md md:max-w-lg max-h-[92vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-white px-2.5 py-1 text-sm font-bold rounded-full  cursor-pointer transition-colors hover:bg-gray-100 hover:shadow-md"
              onClick={() => setEnlargeQrFor(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-gray-700 font-medium">Pickup QR</div>
              <div className="bg-white p-2 rounded">
                {(() => {
                  const ord = orders.find((x) => x._id === enlargeQrFor);
                  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/pickup/${ord?.pickupToken}/confirm`;
                  return (
                    <div
                      className="mx-auto"
                      style={{ width: 'min(88vw, 80vh, 480px)' }}
                    >
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
              <div className="flex items-center gap-2">
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
                  className="px-3 py-1.5 rounded-lg text-sm border bg-gray-100 text-gray-900 hover:bg-gray-200"
                >
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
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal>
            <div className="relative bg-white rounded-xl shadow-xl p-5 w-[92vw] max-w-lg">
              <button
                className="absolute top-3 right-3 bg-white rounded-full border border-gray-300 shadow px-2.5 py-1 text-sm font-bold hover:bg-gray-100"
                onClick={() => setShowReceiptFor(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Receipt</h3>
              <p className="text-xs text-gray-600 mb-4">Order <span className="font-mono">{shortId(ord._id)}</span> · {ord.receiptIssuedAt ? new Date(ord.receiptIssuedAt).toLocaleString() : ''}</p>
              <div className="space-y-3 text-sm text-gray-800">
                <div className="flex justify-between"><span>Service</span><span className="font-medium truncate max-w-[55%]">{first?.serviceName || 'Service'}</span></div>
                <div className="flex justify-between"><span>Quantity</span><span>{first?.quantity}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">{money(ord.subtotal, ord.currency || 'PHP')}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>{money(ord.paymentAmount || ord.subtotal, ord.currency || 'PHP')}</span></div>
                <div className="flex justify-between"><span>Change</span><span>{money(ord.changeGiven || 0, ord.currency || 'PHP')}</span></div>
                <div className="flex justify-between"><span>Method</span><span className="uppercase font-medium">{ord.paymentMethod || 'cash'}</span></div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowReceiptFor(null)}
                  className="px-4 py-2 rounded-lg border bg-white text-gray-800 hover:bg-gray-50"
                >Close</button>
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
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500"
                >Download PDF</button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}