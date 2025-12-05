import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import DashboardLayout from '../../Dashboard/shared_components/DashboardLayout';
import jsPDF from 'jspdf';
import logoDark from '../../../assets/PrintEase-logo-dark.png';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';

type OrderStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
type FilterValue = 'all' | OrderStatus | 'return_refund';

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
type ReturnRequestChatForward = {
  chatId?: string;
  anchorId?: string;
  messageId?: string;
  forwardedAt?: string;
};

type ReturnRequest = {
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'denied';
  submittedAt?: string;
  reviewedAt?: string;
  reviewer?: string;
  reviewNotes?: string;
  evidence?: OrderFile[];
  chatForward?: ReturnRequestChatForward;
};
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
  returnRequest?: ReturnRequest;
  downPaymentRequired?: boolean;
  downPaymentAmount?: number;
  downPaymentPaid?: boolean;
  downPaymentPaidAt?: string;
  downPaymentMethod?: string;
  downPaymentReceipt?: string | null;
  downPaymentReference?: string | null;
  storeName?: string;
};

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready For Pick-up', value: 'ready' },
  { label: 'Completed', value: 'completed' },
  { label: 'Return / Refund', value: 'return_refund' },
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
      return 'border-gray-300 text-gray-700 bg-gray-100 dark:border-gray-500 dark:text-gray-200 dark:bg-gray-500/10';
    case 'processing':
      return 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-400 dark:text-amber-200 dark:bg-amber-400/10';
    case 'ready':
      return 'border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-400 dark:text-indigo-200 dark:bg-indigo-400/10';
    case 'completed':
      return 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-green-400 dark:text-green-200 dark:bg-green-400/10';
    case 'cancelled':
      return 'border-red-300 text-red-700 bg-red-50 dark:border-red-400 dark:text-red-200 dark:bg-red-400/10';
    default:
      return 'border-gray-200 text-gray-600 bg-gray-50 dark:border-white/20 dark:text-white/80 dark:bg-white/10';
  }
}

const TRACK_PAGE_WRAPPER = 'min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white';
const TRACK_FILTER_BAR = 'flex flex-wrap gap-3 rounded-2xl p-3 shadow-lg border border-gray-200 bg-white/90 backdrop-blur w-full dark:border-slate-700 dark:bg-slate-900/60';
const TRACK_CARD = 'rounded-2xl border border-gray-200 bg-white/95 text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-900/70 dark:text-white';
const TRACK_SUBCARD = 'rounded-xl border border-gray-200 bg-gray-50 text-gray-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200';
const TRACK_PILL_MUTED = 'text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-500 dark:bg-gray-800/60 dark:text-gray-300';
const TRACK_INPUT_BUTTON = 'px-4 py-2.5 rounded-xl text-sm font-medium border';
const TRACK_QR_SECTION = 'p-6 rounded-xl border border-indigo-100 bg-indigo-50 text-gray-800 shadow-inner dark:border-indigo-500/40 dark:bg-slate-950/80 dark:text-white';
const TRACK_QR_MESSAGE = 'flex items-center gap-3 text-sm text-indigo-700 dark:text-indigo-100';
const MAX_RETURN_EVIDENCE = 6;
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type ReturnWindowState = { expired: boolean; expiresAt: Date | null; completedAt: Date | null };

function resolveCompletionTimestamp(order: Order): string | undefined {
  return order.stageTimestamps?.completed || order.updatedAt || order.stageTimestamps?.ready || order.createdAt;
}

function getReturnWindowState(order: Order): ReturnWindowState {
  if (order.status !== 'completed') return { expired: false, expiresAt: null, completedAt: null };
  const completedIso = resolveCompletionTimestamp(order);
  if (!completedIso) return { expired: false, expiresAt: null, completedAt: null };
  const completedAt = new Date(completedIso);
  if (Number.isNaN(completedAt.getTime())) return { expired: false, expiresAt: null, completedAt: null };
  const expiresAt = new Date(completedAt.getTime() + RETURN_WINDOW_MS);
  return { expired: Date.now() > expiresAt.getTime(), expiresAt, completedAt };
}

export default function TrackOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Track which order IDs have their QR visible
  const [openQR, setOpenQR] = useState<Record<string, boolean>>({});
  // Keep refs to QR canvases for download/fullscreen
  const qrCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const returnEvidenceInputRef = useRef<HTMLInputElement | null>(null);
  // Which order's QR is enlarged in a modal (null = none)
  const [enlargeQrFor, setEnlargeQrFor] = useState<string | null>(null);
  // Receipt modal
  const [showReceiptFor, setShowReceiptFor] = useState<string | null>(null);
  const [returnRequestFor, setReturnRequestFor] = useState<string | null>(null);
  const [viewReturnRequestFor, setViewReturnRequestFor] = useState<string | null>(null);
  const [dpPreviewOrder, setDpPreviewOrder] = useState<Order | null>(null);
  const [dpPreviewUrl, setDpPreviewUrl] = useState<string | null>(null);
  const [dpPreviewMime, setDpPreviewMime] = useState<string | null>(null);
  const [dpPreviewFilename, setDpPreviewFilename] = useState<string | null>(null);
  const [dpLoading, setDpLoading] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDetails, setReturnDetails] = useState('');
  const [returnEvidenceFiles, setReturnEvidenceFiles] = useState<File[]>([]);
  const [isReturnDropActive, setIsReturnDropActive] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [evidencePreview, setEvidencePreview] = useState<{ open: boolean; loading: boolean; fileName?: string; mime?: string; url?: string; error?: string }>({ open: false, loading: false });
  const evidencePreviewUrlRef = useRef<string | null>(null);
  const dpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpPreviewUrlRef = useRef<string | null>(null);
  const ordersRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [pendingHighlightOrder, setPendingHighlightOrder] = useState<string | null>(null);
  const orderCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterHydratedRef = useRef(false);
  const lastFocusParamRef = useRef<string | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const [contactingReturnId, setContactingReturnId] = useState<string | null>(null);
  const [storeCache, setStoreCache] = useState<Record<string, { name: string; addressLine?: string; city?: string; state?: string; country?: string; postal?: string; mobile?: string }>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const clearDpPreviewBlob = useCallback(() => {
    if (dpPreviewUrlRef.current) {
      URL.revokeObjectURL(dpPreviewUrlRef.current);
      dpPreviewUrlRef.current = null;
    }
  }, []);
  const closeDownpaymentPreview = useCallback(() => {
    clearDpPreviewBlob();
    setDpPreviewOrder(null);
    setDpPreviewUrl(null);
    setDpPreviewMime(null);
    setDpPreviewFilename(null);
    setDpLoading(false);
    if (dpCanvasRef.current) dpCanvasRef.current = null;
  }, [clearDpPreviewBlob]);

  const loadOrders = useCallback(async () => {
    const requestId = ++ordersRequestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/orders/mine');
      if (!isMountedRef.current || requestId !== ordersRequestIdRef.current) return;
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      if (!isMountedRef.current || requestId !== ordersRequestIdRef.current) return;
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Failed to load orders');
    } finally {
      if (!isMountedRef.current || requestId !== ordersRequestIdRef.current) return;
      setLoading(false);
    }
  }, []);

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
    if (!dpPreviewUrl || !dpPreviewMime?.startsWith('image/')) return;
    const canvas = dpCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      try {
        const maxHeight = Math.min(window.innerHeight * 0.6, 800);
        const scale = Math.min(1, maxHeight / (img.height || 1));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.warn('Failed to render downpayment preview', err);
      }
    };
    img.src = dpPreviewUrl;
    return () => {
      img.onload = null;
    };
  }, [dpPreviewUrl, dpPreviewMime]);

  useEffect(() => {
    return () => {
      clearDpPreviewBlob();
    };
  }, [clearDpPreviewBlob]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!filterHydratedRef.current) {
      filterHydratedRef.current = true;
      return;
    }
    void loadOrders();
  }, [activeFilter, loadOrders]);

  // Sync filter from query param (?status=processing etc.)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (!status) {
      setActiveFilter('all');
      return;
    }
    if (['pending','processing','ready','completed','cancelled','return_refund'].includes(status)) {
      setActiveFilter(status as FilterValue);
    } else if (status === 'all') {
      setActiveFilter('all');
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusParam = params.get('focus') || params.get('focusOrder');
    if (focusParam && focusParam !== lastFocusParamRef.current) {
      lastFocusParamRef.current = focusParam;
      setPendingHighlightOrder(focusParam);
    }
  }, [location.search]);

  // Fetch store info on-demand for receipt
  // Fetch (and cache) store info; return it immediately for use in rendering or PDF
  const getStoreInfo = useCallback(async (storeId: string) => {
    if (!storeId) return null;
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
  }, []);

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
    const map: Record<FilterValue, number> = {
      all: orders.length,
      pending: 0,
      processing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      return_refund: 0,
    };
    for (const o of orders) {
      const hasReturnRequest = Boolean(o.returnRequest);
      if (!(o.status === 'completed' && hasReturnRequest)) {
        map[o.status] = (map[o.status] || 0) + 1;
      }
      if (o.paymentStatus === 'refunded' || hasReturnRequest) {
        map.return_refund += 1;
      }
    }
    return map;
  }, [orders]);

  const triggerOrderHighlight = useCallback((orderId: string) => {
    setHighlightOrderId(orderId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightOrderId((prev) => (prev === orderId ? null : prev));
    }, 6000);
  }, []);

  const scrollToOrderCard = useCallback((orderId: string) => {
    const node = orderCardRefs.current[orderId];
    if (!node || typeof node.scrollIntoView !== 'function') return false;
    node.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    triggerOrderHighlight(orderId);
    return true;
  }, [triggerOrderHighlight]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return orders;
    if (activeFilter === 'return_refund') {
      const list = orders.filter((o) => o.paymentStatus === 'refunded' || Boolean(o.returnRequest));
      return sortReturnRefundOrders(list);
    }
    if (activeFilter === 'completed') {
      return orders.filter((o) => o.status === 'completed' && !o.returnRequest);
    }
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  useEffect(() => {
    if (!pendingHighlightOrder || loading) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanupParams = () => {
      const params = new URLSearchParams(location.search);
      let mutated = false;
      ['focus', 'focusOrder'].forEach((key) => {
        if (params.has(key)) {
          params.delete(key);
          mutated = true;
        }
      });
      if (mutated) {
        const next = params.toString();
        navigate(next ? `${location.pathname}?${next}` : location.pathname, { replace: true });
      }
    };
    const attemptScroll = (attempt = 0) => {
      if (cancelled) return;
      const success = scrollToOrderCard(pendingHighlightOrder);
      if (success) {
        setPendingHighlightOrder(null);
        lastFocusParamRef.current = null;
        cleanupParams();
        return;
      }
      if (attempt < 20) {
        retryTimer = window.setTimeout(() => attemptScroll(attempt + 1), 200);
      } else {
        setPendingHighlightOrder(null);
        lastFocusParamRef.current = null;
        cleanupParams();
      }
    };
    attemptScroll();
    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [pendingHighlightOrder, scrollToOrderCard, navigate, location.pathname, location.search, loading]);

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

  const openReturnModal = (orderId: string) => {
    setReturnRequestFor(orderId);
    setReturnReason('');
    setReturnDetails('');
    setReturnEvidenceFiles([]);
    if (returnEvidenceInputRef.current) returnEvidenceInputRef.current.value = '';
  };

  const closeReturnModal = () => {
    setReturnRequestFor(null);
    setReturnReason('');
    setReturnDetails('');
    setReturnEvidenceFiles([]);
    setIsReturnDropActive(false);
    if (returnEvidenceInputRef.current) returnEvidenceInputRef.current.value = '';
    setReturnSubmitting(false);
  };

  const revokeEvidencePreviewUrl = () => {
    if (evidencePreviewUrlRef.current) {
      URL.revokeObjectURL(evidencePreviewUrlRef.current);
      evidencePreviewUrlRef.current = null;
    }
  };

  const closeEvidencePreview = () => {
    revokeEvidencePreviewUrl();
    setEvidencePreview({ open: false, loading: false });
  };

  const previewEvidenceFile = async (orderId: string, file: OrderFile) => {
    if (!file?.fileId) return;
    revokeEvidencePreviewUrl();
    setEvidencePreview({
      open: true,
      loading: true,
      fileName: file.filename || 'Attachment',
      mime: file.mimeType,
      url: undefined,
      error: undefined,
    });
    try {
      const res = await api.get(`/orders/${orderId}/return-request/evidence/${file.fileId}`, { responseType: 'blob' });
      const blob: Blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: res.headers['content-type'] || file.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      evidencePreviewUrlRef.current = url;
      setEvidencePreview(prev => ({ ...prev, loading: false, url, mime: blob.type || prev.mime }));
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setEvidencePreview(prev => ({ ...prev, loading: false, error: e?.response?.data?.message || e?.message || 'Failed to preview file' }));
    }
  };

  const handleViewDownpayment = async (order: Order) => {
    setDpPreviewOrder(order);
    setDpLoading(true);
    setDpPreviewMime(null);
    setDpPreviewFilename(null);
    clearDpPreviewBlob();
    setDpPreviewUrl(null);
    try {
      const res = await api.get(`/orders/${order._id}/downpayment/preview`, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      dpPreviewUrlRef.current = url;
      setDpPreviewUrl(url);
      setDpPreviewMime(blob.type || contentType);
      const cd = res.headers['content-disposition'] || '';
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
      const headerName = decodeURIComponent((match?.[1] || match?.[2] || '').trim());
      setDpPreviewFilename(headerName || `downpayment-${order._id}`);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setToast({ type: 'error', message: e?.response?.data?.message || e?.message || 'Failed to load downpayment receipt' });
      closeDownpaymentPreview();
    } finally {
      setDpLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      revokeEvidencePreviewUrl();
    };
  }, []);

  const handleSubmitReturn = async () => {
    if (!returnRequestFor || !returnReason.trim()) {
      setToast({ type: 'error', message: 'Please select a reason for your return/refund request.' });
      return;
    }

    if (!returnDetails.trim()) {
      setToast({ type: 'error', message: 'Please provide details so we can review the request.' });
      return;
    }

    if (!returnEvidenceFiles.length) {
      setToast({ type: 'error', message: 'Please attach at least one photo or video.' });
      return;
    }
    try {
      setReturnSubmitting(true);
      const payload = new FormData();
      payload.append('reason', returnReason.trim());
      if (returnDetails.trim()) payload.append('details', returnDetails.trim());
      returnEvidenceFiles.forEach((file) => {
        payload.append('evidence', file);
      });
      const res = await api.post(`/orders/${returnRequestFor}/return-request`, payload);
      if (res?.data?._id) {
        setOrders((prev) => prev.map((order) => (order._id === res.data._id ? res.data : order)));
      }
      setActiveFilter('return_refund');
      setToast({ type: 'success', message: 'Return/refund request sent. We will reach out shortly.' });
      closeReturnModal();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setToast({ type: 'error', message: e?.response?.data?.message || e?.message || 'Unable to submit return request' });
      setReturnSubmitting(false);
    }
  };

  const openReturnRequestChat = (order: Order, override?: { chatId?: string; anchorId?: string }) => {
    const existingForward = order.returnRequest?.chatForward;
    const chatId = override?.chatId || existingForward?.chatId;
    if (!chatId) {
      setToast({ type: 'error', message: 'We could not find the chat thread for this return request yet.' });
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedStoreId', order.store);
    }
    const params = new URLSearchParams();
    params.set('chatId', chatId);
    params.set('focusOrder', order._id);
    const anchorId = override?.anchorId || existingForward?.anchorId;
    if (anchorId) params.set('focusAnchor', anchorId);
    setViewReturnRequestFor(null);
    navigate(`/dashboard/chat-customer?${params.toString()}`);
  };

  const forwardReturnRequestToChat = async (order: Order, options?: { redirectToChat?: boolean }) => {
    if (!user?._id) {
      setToast({ type: 'error', message: 'Please sign in again to contact the store.' });
      return;
    }
    if (!socket) {
      setToast({ type: 'error', message: 'Chat service is currently unavailable. Please try again shortly.' });
      return;
    }
    if (!order.returnRequest) {
      setToast({ type: 'error', message: 'There is no return/refund request linked to this order.' });
      return;
    }
    try {
      setContactingReturnId(order._id);
      const chatRes = await api.post('/customer-chat/create', { customerId: user._id, storeId: order.store });
      const chatSummary = chatRes.data as { _id?: string; chatId?: string };
      const chatId = chatSummary?._id || chatSummary?.chatId;
      if (!chatId) throw new Error('Unable to resolve chat session.');
      const storeInfo = await getStoreInfo(order.store);
      const anchorId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const payload = {
        orderId: order._id,
        orderShortId: shortId(order._id),
        status: order.returnRequest.status,
        reason: order.returnRequest.reason,
        details: order.returnRequest.details,
        submittedAt: order.returnRequest.submittedAt,
        evidenceCount: order.returnRequest.evidence?.length ?? 0,
        storeName: storeInfo?.name,
        anchorId,
        evidence: (order.returnRequest.evidence || []).map((file) => ({
          fileId: String(file.fileId),
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
        })),
      };
      const fallbackText = `Shared return/refund request for ${payload.orderShortId || 'your order'}.`;
      socket.emit('sendCustomerMessage', {
        chatId,
        senderId: user._id,
        text: fallbackText,
        payloadType: 'return_request',
        payload,
      });
      try {
        const markRes = await api.patch(`/orders/${order._id}/return-request/chat-forward`, { chatId, anchorId });
        const updatedOrder: Order | undefined = markRes?.data?._id ? markRes.data : undefined;
        if (updatedOrder) {
          setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
        } else {
          setOrders((prev) => prev.map((o) => (o._id === order._id ? {
            ...o,
            returnRequest: o.returnRequest
              ? { ...o.returnRequest, chatForward: { chatId, anchorId, forwardedAt: new Date().toISOString() } }
              : o.returnRequest,
          } : o)));
        }
      } catch (markErr) {
        console.warn('Failed to record chat forwarding metadata', markErr);
      }
      setToast({ type: 'success', message: 'Return request forwarded to the store chat.' });
      if (options?.redirectToChat) {
        openReturnRequestChat(order, { chatId, anchorId });
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setToast({ type: 'error', message: e?.response?.data?.message || e?.message || 'Failed to contact store.' });
    } finally {
      setContactingReturnId(null);
    }
  };

  const handleReturnEvidenceSelect = (files: FileList | null) => {
    if (!files?.length) return;

    const acceptedFiles = Array.from(files).filter((file) => {
      const isSupportedType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isUnderSizeLimit = file.size <= 10 * 1024 * 1024; // 10MB per file
      return isSupportedType && isUnderSizeLimit;
    });

    if (!acceptedFiles.length) return;

    setReturnEvidenceFiles((prev) => {
      const availableSlots = Math.max(0, MAX_RETURN_EVIDENCE - prev.length);
      return [...prev, ...acceptedFiles.slice(0, availableSlots)];
    });

    if (returnEvidenceInputRef.current) {
      returnEvidenceInputRef.current.value = '';
    }
  };

  const handleReturnEvidenceInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleReturnEvidenceSelect(event.target.files);
  };

  const handleReturnEvidenceDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsReturnDropActive(false);
    handleReturnEvidenceSelect(event.dataTransfer.files);
  };

  const handleReturnEvidenceDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isReturnDropActive) setIsReturnDropActive(true);
  };

  const handleReturnEvidenceDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isReturnDropActive) setIsReturnDropActive(false);
  };

  const handleRemoveReturnEvidenceFile = (index: number) => {
    setReturnEvidenceFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const formatEvidenceSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isReturnFormValid = returnReason.trim().length > 0 && returnDetails.trim().length > 0 && returnEvidenceFiles.length > 0;

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
      <div className={TRACK_PAGE_WRAPPER}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-[100000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-sm border transform
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-wide dark:text-white">
            Order Status
          </h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base dark:text-slate-300">Monitor your printing orders and their progress in real-time</p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className={TRACK_FILTER_BAR}>
            {FILTERS.map(({ label, value }) => {
              const active = activeFilter === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (value !== 'all') params.set('status', value);
                    const qs = params.toString();
                    navigate(`/dashboard/my-orders${qs ? `?${qs}` : ''}`, { replace: false });
                    if (value === activeFilter) {
                      void loadOrders();
                      return;
                    }
                    setActiveFilter(value);
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md dark:bg-gray-800/50 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700/60 dark:hover:border-gray-500'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    active
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-white/40 dark:bg-white/20 dark:text-white'
                      : TRACK_PILL_MUTED
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
          <div className="mb-6">
            <div className={`${TRACK_CARD} text-center w-full p-20`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <div className="text-gray-600 text-sm dark:text-gray-300">Loading your orders...</div>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Orders Grid */}
        <div className="grid grid-cols-1 gap-6">
          {!loading && filtered.length === 0 && (
            <div className={`${TRACK_CARD} p-12 text-center`}>
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-200">No orders found</h3>
              <p className="text-gray-600 text-sm dark:text-gray-400">No orders match your current filter selection.</p>
            </div>
          )}
          
          {filtered.map((o) => {
            const first = o.items[0];
            const total = o.subtotal ?? first?.totalPrice ?? 0;
            const currency = o.currency || first?.currency || 'PHP';
            const returnWindow = getReturnWindowState(o);
            const canRequestReturn = o.status === 'completed' && !o.returnRequest && o.paymentStatus !== 'refunded';
            const isHighlighted = highlightOrderId === o._id;
            return (
              <div
                key={o._id}
                ref={(el) => {
                  if (el) {
                    orderCardRefs.current[o._id] = el;
                  } else {
                    delete orderCardRefs.current[o._id];
                  }
                }}
                className={`${TRACK_CARD} p-6 shadow-xl hover:shadow-2xl scroll-mt-28 md:scroll-mt-36 ${isHighlighted ? 'ring-2 ring-amber-400 shadow-amber-400/30' : ''}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Left Content */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-900 font-bold text-lg tracking-wide dark:text-white">{shortId(o._id)}</div>
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusBadgeClasses(o.status)}`}>
                          {o.status === 'pending' && 'Not yet Started'}
                          {o.status === 'processing' && 'In Progress'}
                          {o.status === 'ready' && 'Ready For Pick-up'}
                          {o.status === 'completed' && 'Completed'}
                          {o.status === 'cancelled' && 'Cancelled'}
                        </span>
                          {o.returnRequest && (
                            <span className={`ml-2 text-[11px] px-2 py-1 rounded-full border ${returnRequestStatusBadge(o.returnRequest.status)}`}>
                              {returnRequestStatusLabel(o.returnRequest.status)}
                            </span>
                          )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono tabular-nums bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 dark:text-gray-400 dark:bg-gray-900/50 dark:border-gray-700">
                        {formatDateUTC(o.createdAt)}
                      </div>
                    </div>

                    {/* Time Estimate */}
                    {getTimeRemaining(o) && (
                      <div className="flex items-center gap-2 text-sm text-blue-700 font-medium bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getTimeRemaining(o)}
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="space-y-3">
                      <div className={`${TRACK_SUBCARD} p-4`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <h4 className="text-gray-900 font-semibold text-sm dark:text-white">{first?.serviceName || 'Print Service'}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                            <span className="font-medium">{first?.quantity} {first?.unit ? `· ${first.unit}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Options:</span>
                            <span className="font-medium truncate">{itemSummary(first)}</span>
                          </div>
                        </div>
                        {o.notes && (
                          <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-800/40">
                            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Notes:</span>
                                <span className="ml-1">{o.notes}</span>
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
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{money(total, currency)}</div>
                      <div className="text-xs text-gray-500 font-medium dark:text-gray-400">Total Amount</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {o.status === 'pending' && (
                        <button
                          disabled={updatingId === o._id}
                          onClick={() => cancelOrder(o._id)}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border ${
                            updatingId === o._id 
                              ? 'bg-gray-200 border-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:border-gray-600 dark:text-gray-400' 
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
                      
                      {canRequestReturn && (
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              if (returnWindow.expired) return;
                              openReturnModal(o._id);
                            }}
                            disabled={returnWindow.expired}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border ${
                              returnWindow.expired
                                ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
                                : 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:shadow-md dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-100'
                            }`}
                          >
                            {returnWindow.expired ? 'Return Window Closed' : 'Return / Refund'}
                          </button>
                          {returnWindow.expiresAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {returnWindow.expired
                                ? `Return window expired on ${formatDateUTC(returnWindow.expiresAt.toISOString())}.`
                                : `Return window ends on ${formatDateUTC(returnWindow.expiresAt.toISOString())}.`}
                            </p>
                          )}
                        </div>
                      )}

                      {o.returnRequest && (
                        <button
                          onClick={() => setViewReturnRequestFor(o._id)}
                          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-amber-600/60 bg-white text-amber-700 hover:bg-amber-50 hover:shadow-md dark:border-amber-300/60 dark:bg-slate-800 dark:text-amber-100"
                        >
                          View Return Request
                        </button>
                      )}

                      {o.downPaymentReceipt && o.downPaymentReference && (
                        <button
                          onClick={() => handleViewDownpayment(o)}
                          disabled={dpLoading && dpPreviewOrder?._id === o._id}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-amber-600 bg-amber-600 text-white hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/20 dark:border-amber-400 dark:bg-amber-500 dark:hover:bg-amber-400 ${dpLoading && dpPreviewOrder?._id === o._id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {dpLoading && dpPreviewOrder?._id === o._id ? 'Loading…' : 'View Downpayment'}
                        </button>
                      )}

                      {o.status === 'completed' && o.paymentStatus === 'paid' && (
                        <button
                          onClick={() => setShowReceiptFor(o._id)}
                          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-green-600 bg-green-600 text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/25"
                        >
                          View Receipt
                        </button>
                      )}
                    </div>

                    {/* Files Section */}
                    {o.files?.length > 0 && (
                      <div className={`${TRACK_SUBCARD} p-4`}>
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Files ({o.files.length})</span>
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
                              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-500 group dark:text-blue-300 dark:hover:text-blue-200"
                              title={f.filename || 'file'}
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                              </svg>
                              <span className="truncate flex-1">{f.filename || String(f.fileId)}</span>
                            </a>
                          ))}
                          {o.files.length > 3 && (
                            <div className="text-xs text-gray-500 text-center pt-1 border-t border-gray-200 dark:text-gray-400 dark:border-gray-700">
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
                  <div className={`mt-6 ${TRACK_QR_SECTION}`}>
                    {!openQR[o._id] ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className={TRACK_QR_MESSAGE}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Ready for pickup. Show QR code at counter when asked.
                        </div>
                        <button
                          onClick={() => setOpenQR((prev) => ({ ...prev, [o._id]: true }))}
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Show QR Code
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-sm text-indigo-700 font-medium dark:text-white/90">Show this QR code at pickup:</div>
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
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                          <button
                            onClick={() => setEnlargeQrFor(o._id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                            Enlarge
                          </button>
                          <button
                            onClick={() => setOpenQR((prev) => ({ ...prev, [o._id]: false }))}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
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
            <div className={`${TRACK_CARD} relative p-6 w-full max-w-sm`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center dark:bg-red-600/20 dark:text-red-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancel Order</h3>
                  <p className="text-sm text-gray-600 mt-2 dark:text-gray-300">Are you sure you want to cancel this order {ord ? <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span> : ''}? This action cannot be undone.</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => { setShowCancelModal(false); setCancelTargetId(null); }}
                  className={`flex-1 ${TRACK_INPUT_BUTTON} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-slate-700`}
                >
                  Keep Order
                </button>
                <button
                  onClick={() => void confirmCancel()}
                  disabled={updatingId === cancelTargetId}
                  className={`flex-1 px-4 py-2 rounded-xl text-white font-semibold ${updatingId === cancelTargetId ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-300' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  {updatingId === cancelTargetId ? 'Cancelling...' : 'Yes, Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {returnRequestFor && (() => {
        const ord = orders.find((o) => o._id === returnRequestFor);
        return (
          <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeReturnModal}>
            <div className={`${TRACK_CARD} relative p-6 w-full max-w-md`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-500/20 dark:text-amber-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Return / Refund Request</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Order {ord ? <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span> : ''}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide dark:text-gray-300">Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className={`${TRACK_INPUT_BUTTON} w-full mt-1 bg-white text-gray-900 border-gray-200 dark:bg-slate-900 dark:text-white dark:border-gray-700`}
                  >
                    <option value="">Select a reason</option>
                    <option value="wrong-item">Received wrong item</option>
                    <option value="damaged">Item damaged / defective</option>
                    <option value="quality">Quality issues</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide dark:text-gray-300">Details</label>
                  <textarea
                    value={returnDetails}
                    onChange={(e) => setReturnDetails(e.target.value)}
                    rows={4}
                    placeholder="Share details that can help us review your request"
                    className={`${TRACK_INPUT_BUTTON} w-full mt-1 bg-white text-gray-900 border-gray-200 dark:bg-slate-900 dark:text-white dark:border-gray-700`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide dark:text-gray-300">Photos/Videos</label>
                  <div
                    onDragOver={handleReturnEvidenceDragOver}
                    onDragLeave={handleReturnEvidenceDragLeave}
                    onDrop={handleReturnEvidenceDrop}
                    onClick={() => returnEvidenceInputRef.current?.click()}
                    className={`mt-1 rounded-2xl border-2 border-dashed p-4 text-center transition-colors duration-200 cursor-pointer dark:text-gray-200 ${isReturnDropActive ? 'border-amber-400 bg-amber-50/60 dark:border-amber-300 dark:bg-amber-400/10' : 'border-gray-300 hover:border-amber-300 hover:bg-amber-50/40 dark:border-gray-600 dark:hover:border-amber-300 dark:hover:bg-slate-800/60'}`}
                  >
                    <input
                      ref={returnEvidenceInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleReturnEvidenceInputChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-white/70 text-amber-600 flex items-center justify-center shadow-sm dark:bg-slate-800/80">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12l6-6m0 0l6 6m-6-6v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Drag & drop files</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">or click to browse up to {MAX_RETURN_EVIDENCE} images/videos (10MB each)</p>
                      </div>
                    </div>
                  </div>
                  {returnEvidenceFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {returnEvidenceFiles.length} of {MAX_RETURN_EVIDENCE} attachments selected
                      </p>
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {returnEvidenceFiles.map((file, index) => (
                          <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-left text-sm dark:border-gray-700 dark:bg-slate-800/60">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-400/20">
                              {file.type.startsWith('video') ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.868v4.264a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4-4a2 2 0 012.828 0L16 17m-2-2l1-1a2 2 0 012.828 0L20 16m-6-11h4a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h4" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{file.type || 'File'} · {formatEvidenceSize(file.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveReturnEvidenceFile(index);
                              }}
                              className="text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-300"
                              aria-label="Remove file"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={closeReturnModal}
                  className={`flex-1 ${TRACK_INPUT_BUTTON} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-slate-700`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSubmitReturn()}
                  disabled={returnSubmitting || !isReturnFormValid}
                  className={`flex-1 px-4 py-2 rounded-xl text-white font-semibold ${returnSubmitting || !isReturnFormValid ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-300' : 'bg-amber-500 hover:bg-amber-400'}`}
                >
                  {returnSubmitting ? 'Sending...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {viewReturnRequestFor && (() => {
        const ord = orders.find((o) => o._id === viewReturnRequestFor);
        const request = ord?.returnRequest;
        if (!ord || !request) return null;
        return (
          <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setViewReturnRequestFor(null)}>
            <div className={`${TRACK_CARD} relative p-6 w-full max-w-lg`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-500/20 dark:text-amber-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Return / Refund Details</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Order <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span></p>
                </div>
                <button
                  onClick={() => setViewReturnRequestFor(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-slate-900/40">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{returnRequestStatusLabel(request.status)}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${returnRequestStatusBadge(request.status)}`}>
                    {returnRequestStatusLabel(request.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{request.reason}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Submitted</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatDateUTC(request.submittedAt)}</p>
                  </div>
                </div>

                {request.details && (
                  <div className="rounded-xl border border-gray-200 bg-white/90 p-4 dark:border-gray-700 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Details</p>
                    <p className="mt-2 whitespace-pre-line text-gray-800 dark:text-gray-200">{request.details}</p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Photos/Videos</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{request.evidence?.length || 0} file(s)</span>
                  </div>
                  {request.evidence && request.evidence.length > 0 ? (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {request.evidence.map((file, idx) => (
                        <li key={`${String(file.fileId)}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => previewEvidenceFile(ord._id, file)}
                            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-left transition hover:border-amber-300 hover:bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-gray-600 dark:bg-slate-800 dark:hover:border-amber-300 dark:hover:bg-slate-800/80"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-400/20">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium text-gray-900 dark:text-white">{file.filename || 'Attachment'}</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">{file.mimeType || 'file'} · {file.size ? formatEvidenceSize(file.size) : '—'}</p>
                            </div>
                            <span className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-200">Preview</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No files were attached.</p>
                  )}
                </div>

                {request.status === 'denied' && (
                  <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
                    <p className="text-xs uppercase tracking-wide font-semibold text-red-700 dark:text-red-200">Store's Reason</p>
                    <p className="mt-2 text-sm font-medium whitespace-pre-line">
                      {request.reviewNotes?.trim() || 'The store declined your request but did not include additional details.'}
                    </p>
                    {request.reviewedAt && (
                      <p className="mt-2 text-xs text-red-700/80 dark:text-red-200/80">Updated {formatDateUTC(request.reviewedAt)}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {request.status === 'pending' && !request.chatForward?.chatId && (
                  <button
                    onClick={() => forwardReturnRequestToChat(ord, { redirectToChat: true })}
                    disabled={contactingReturnId === ord._id}
                    className={`${TRACK_INPUT_BUTTON} w-full flex items-center justify-center gap-2 bg-amber-500 text-white border-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {contactingReturnId === ord._id ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Forwarding to chat...
                      </>
                    ) : (
                      'Contact Store'
                    )}
                  </button>
                )}
                {request.chatForward?.chatId && (
                  <button
                    onClick={() => openReturnRequestChat(ord)}
                    className={`${TRACK_INPUT_BUTTON} w-full flex items-center justify-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-500`}
                  >
                    View in Chat
                  </button>
                )}
                <button
                  onClick={() => setViewReturnRequestFor(null)}
                  className={`${TRACK_INPUT_BUTTON} w-full bg-gray-900 text-white border-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {evidencePreview.open && (
        <div className="fixed inset-0 z-[510] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeEvidencePreview}>
          <div className={`${TRACK_CARD} relative w-full max-w-3xl`} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeEvidencePreview}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close preview"
            >
              ✕
            </button>
            <div className="space-y-4 p-2 sm:p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{evidencePreview.fileName || 'Attachment preview'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">{evidencePreview.mime || 'Attachment'}</p>
              </div>
              <div className="min-h-[240px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center p-4 dark:border-gray-700 dark:bg-slate-900/60">
                {evidencePreview.loading ? (
                  <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-300">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Loading preview…</p>
                  </div>
                ) : evidencePreview.error ? (
                  <p className="text-sm text-red-600 dark:text-red-300">{evidencePreview.error}</p>
                ) : evidencePreview.url ? (
                  evidencePreview.mime?.startsWith('video/') ? (
                    <video controls src={evidencePreview.url} className="max-h-[60vh] w-full rounded-lg" />
                  ) : evidencePreview.mime?.startsWith('image/') ? (
                    <img src={evidencePreview.url} alt={evidencePreview.fileName || 'Evidence'} className="max-h-[60vh] w-full object-contain rounded-lg" />
                  ) : evidencePreview.mime === 'application/pdf' ? (
                    <iframe title="Attachment preview" src={evidencePreview.url} className="w-full h-[60vh] rounded-lg" />
                  ) : (
                    <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                      Preview unavailable.{' '}
                      <a className="text-amber-600 underline dark:text-amber-300" href={evidencePreview.url} target="_blank" rel="noreferrer">
                        Open in new tab
                      </a>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-300">No preview available.</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeEvidencePreview}
                  className={`${TRACK_INPUT_BUTTON} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-gray-600`}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (!evidencePreview.url) return;
                    const a = document.createElement('a');
                    a.href = evidencePreview.url;
                    a.download = evidencePreview.fileName || 'attachment';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  disabled={!evidencePreview.url || evidencePreview.loading}
                  className={`${TRACK_INPUT_BUTTON} bg-amber-500 text-white border-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dpPreviewOrder && (
        <div className="fixed inset-0 z-[500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeDownpaymentPreview}>
          <div className={`${TRACK_CARD} relative w-full max-w-3xl`} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeDownpaymentPreview}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close downpayment preview"
            >
              ✕
            </button>
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Down Payment Receipt</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Order <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(dpPreviewOrder._id)}</span>
                </p>
              </div>
              <div className="min-h-[280px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center p-4 dark:border-gray-700 dark:bg-slate-900/60">
                {dpLoading ? (
                  <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Loading receipt…</p>
                  </div>
                ) : dpPreviewUrl && dpPreviewMime?.startsWith('image/') ? (
                  <canvas
                    ref={(el) => {
                      dpCanvasRef.current = el;
                    }}
                    className="max-h-[60vh] w-full object-contain rounded-lg"
                  />
                ) : dpPreviewUrl && dpPreviewMime?.includes('pdf') ? (
                  <iframe title="Downpayment receipt" src={dpPreviewUrl} className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700" />
                ) : dpPreviewUrl ? (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                    Preview unavailable.{' '}
                    <a className="text-amber-600 underline dark:text-amber-300" href={dpPreviewUrl} target="_blank" rel="noreferrer">
                      Open in new tab
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-300">No preview available.</p>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Reference: <span className="font-medium text-gray-900 dark:text-white">{dpPreviewOrder.downPaymentReference || '—'}</span>
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => {
                      if (!dpPreviewUrl || dpLoading) return;
                      if (dpPreviewMime?.startsWith('image/') && dpCanvasRef.current) {
                        try {
                          const canvas = dpCanvasRef.current;
                          const link = document.createElement('a');
                          link.href = canvas.toDataURL('image/png');
                          const baseName = dpPreviewFilename?.split('.').slice(0, -1).join('.') || shortId(dpPreviewOrder._id);
                          link.download = `${baseName}-downpayment.png`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          return;
                        } catch (err) {
                          console.warn('Failed to export receipt canvas', err);
                        }
                      }
                      const link = document.createElement('a');
                      link.href = dpPreviewUrl;
                      link.download = dpPreviewFilename || `${shortId(dpPreviewOrder._id)}-downpayment`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                    disabled={!dpPreviewUrl || dpLoading}
                    className={`${TRACK_INPUT_BUTTON} bg-blue-600 text-white border-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    Download
                  </button>
                  <button
                    onClick={closeDownpaymentPreview}
                    className={`${TRACK_INPUT_BUTTON} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-gray-600`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {enlargeQrFor && (
        <div
          className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          onClick={() => setEnlargeQrFor(null)}
        >
          <div
            className={`${TRACK_CARD} relative p-6 w-[92vw] max-w-md`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm font-bold rounded-lg text-gray-700 cursor-pointer hover:shadow-md dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              onClick={() => setEnlargeQrFor(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Pickup QR Code</div>
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
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md flex items-center gap-2"
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
          <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal>
            <div className={`${TRACK_CARD} relative p-6 w-[92vw] max-w-md`}>
              <button
                className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm font-bold rounded-lg text-gray-700 cursor-pointer hover:shadow-md dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                onClick={() => setShowReceiptFor(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-2 dark:text-white">Payment Receipt</h3>
              <p className="text-sm text-gray-600 mb-6 dark:text-gray-400">Order <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span> · {ord.receiptIssuedAt ? new Date(ord.receiptIssuedAt).toLocaleString() : ''}</p>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Service</span>
                  <span className="font-medium text-gray-900 truncate max-w-[55%] dark:text-white">{first?.serviceName || 'Service'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Quantity</span>
                  <span className="font-medium text-gray-900 dark:text-white">{first?.quantity}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                  <span className="font-bold text-emerald-600 dark:text-green-400">{money(ord.subtotal, ord.currency || 'PHP')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Paid</span>
                  <span className="font-medium text-gray-900 dark:text-white">{money(ord.paymentAmount || ord.subtotal, ord.currency || 'PHP')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-300">Change</span>
                  <span className="font-medium text-gray-900 dark:text-white">{money(ord.changeGiven || 0, ord.currency || 'PHP')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-300">Method</span>
                  <span className="font-bold text-blue-600 uppercase dark:text-blue-400">{ord.paymentMethod || 'cash'}</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setShowReceiptFor(null)}
                  className={`px-5 py-2.5 rounded-xl font-medium ${TRACK_INPUT_BUTTON} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700`}
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </DashboardLayout>
  );
}

function returnRequestStatusBadge(status: ReturnRequest['status']) {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200';
    case 'denied':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200';
  }
}

function returnRequestStatusLabel(status: ReturnRequest['status']) {
  if (status === 'approved') return 'Return Request Approved';
  if (status === 'denied') return 'Return Request Denied';
  return 'Return Request Pending';
}

function returnRefundPriority(order: Order): number {
  const normalizedStatus = order.returnRequest?.status ? order.returnRequest.status.toLowerCase() : undefined;
  if (normalizedStatus === 'pending') return 0;
  if (normalizedStatus === 'approved' || normalizedStatus === 'denied') return 2;
  if (order.paymentStatus === 'refunded' || normalizedStatus) return 3;
  return 4;
}

function sortReturnRefundOrders(list: Order[]): Order[] {
  return [...list].sort((a, b) => {
    const diff = returnRefundPriority(a) - returnRefundPriority(b);
    if (diff !== 0) return diff;
    const timeA = a.returnRequest?.submittedAt
      ? new Date(a.returnRequest.submittedAt).getTime()
      : a.createdAt
      ? new Date(a.createdAt).getTime()
      : 0;
    const timeB = b.returnRequest?.submittedAt
      ? new Date(b.returnRequest.submittedAt).getTime()
      : b.createdAt
      ? new Date(b.createdAt).getTime()
      : 0;
    return timeB - timeA;
  });
}