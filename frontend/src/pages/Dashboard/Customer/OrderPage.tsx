import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { FunnelIcon, ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { QRCodeCanvas } from 'qrcode.react';

type Service = {
    _id: string;
    name: string;
    description?: string;
    basePrice: number;
    unit: 'per page' | 'per sq ft' | 'per item' | string;
    currency?: string;
    imageFileId?: unknown;
    createdAt?: string;
    variants?: Array<{
        label: string;
        options: Array<{ 
            name: string; 
            priceDelta: number;
            linkedInventoryId?: string;
            inventoryQuantity?: number;
        }>;
    }>;
    // NEW: (if backend provides) linked products
    attributes?: Array<{ productId: string; quantity?: number; productPrice?: number; sizeName?: string }>;
};

type CartItem = {
    service: Service;
    quantity: number;
    selectedOptions: Array<{ variantLabel: string; optionName: string }>;
    files: Array<{ file: File; preview: string }>;
    notes: string;
    // NEW: sizes chosen by customer (when applicable)
    selectedSizes?: Array<{ productId: string; sizeName: string }>;
};

type LocationState = { storeId?: string } | undefined;

const formatMoney = (n: number | undefined | null, code: string = 'PHP') => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(n);
    } catch {
        const prefix = code === 'USD' ? '$' : code === 'EUR' ? '€' : code === 'GBP' ? '£' : code === 'JPY' ? '¥' : '₱';
        return `${prefix}${n.toFixed(2)}`;
    }
};

// Add a local type for order status if not present here
type OrderStatusLocal = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';

export default function OrderPage() {
    const { token, continueAsGuest } = useAuth();
    const location = useLocation() as { state: LocationState };
    const params = useParams<{ storeId?: string }>();

    // Resolve storeId
    const derivedStoreId = useMemo(() => {
        return (
            location?.state?.storeId ||
            params.storeId ||
            (typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') || undefined : undefined)
        );
    }, [location?.state?.storeId, params.storeId]);

    // Persist storeId
    useEffect(() => {
        if (derivedStoreId && typeof window !== 'undefined') {
            localStorage.setItem('selectedStoreId', derivedStoreId);
        }
    }, [derivedStoreId]);

    const [services, setServices] = useState<Service[]>([]);
    const [bestSellingIds, setBestSellingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    // Filters (customer: sort only)
    const [showFilters, setShowFilters] = useState(false);
    const filterAnchorRef = useRef<HTMLDivElement | null>(null);
    const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
    const [sortKey, setSortKey] = useState<'name' | 'price'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    // removed store logo/name (unused here)

    // Modal state
    const [selected, setSelected] = useState<Service | null>(null);
    const [variantChoices, setVariantChoices] = useState<Record<string, number>>({});
    const [quantity, setQuantity] = useState<number>(1);
    const [files, setFiles] = useState<Array<{ file: File; preview?: string }>>([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Notification state
    const [notif, setNotif] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    
    // Payment confirmation state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

    // NEW: watch order status + QR + receipt
    const [watchedOrderStatus, setWatchedOrderStatus] = useState<OrderStatusLocal | null>(null);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

    // Pricing
    const unitPrice = useMemo(() => {
        if (!selected) return 0;
        const base = selected.basePrice || 0;
        const deltas = (selected.variants || []).reduce((sum, v) => {
            const idx = variantChoices[v.label] ?? 0;
            const opt = v.options[idx];
            return sum + (opt ? opt.priceDelta : 0);
        }, 0);
        return base + deltas;
    }, [selected, variantChoices]);

    const safeQty = Math.min(9999, Math.max(1, quantity || 0));

    useEffect(() => {
        let active = true;
        const fetchBestSelling = async (storeId: string) => {
            try {
                const bestRes = await api.get(`/analytics/best-selling/${storeId}`);
                if (!active) return;
                const listRaw = bestRes.data?.bestSelling ?? bestRes.data ?? [];
                const list: Array<{ serviceId?: string; _id?: string; serviceName?: string }> = Array.isArray(listRaw) ? listRaw : [];
                const ids = new Set<string>(list.map((x) => String((x.serviceId ?? x._id) || '')));
                // also keep names as a fallback match
                const names = new Set<string>(list.map((x) => (x.serviceName || '').toLowerCase()).filter(Boolean));
                setBestSellingIds(ids);
                setBestSellingNames(names);
            } catch {
                if (active) {
                    setBestSellingIds(new Set());
                    setBestSellingNames(new Set());
                }
            }
        };
        const run = async () => {
            if (!derivedStoreId) return;
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/services/store/${derivedStoreId}`);
                if (!active) return;
                setServices(res.data || []);
                // Fetch best selling in parallel after services load
                if (derivedStoreId) await fetchBestSelling(derivedStoreId);
            } catch (e: unknown) {
                if (!active) return;
                const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
                    || (e as { message?: string })?.message
                    || 'Failed to load services';
                setError(msg);
            } finally {
                if (active) setLoading(false);
            }
        };
        run();
        // Refetch best-selling when tab regains focus
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && derivedStoreId) {
                fetchBestSelling(derivedStoreId);
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            active = false;
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [derivedStoreId]);

    // removed store logo/name loading effect

    const [bestSellingNames, setBestSellingNames] = useState<Set<string>>(new Set());

    // Compute fixed position for filter dropdown portal relative to the Filter button
    useEffect(() => {
        if (!showFilters) return;
        const calc = () => {
            const el = filterAnchorRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const width = 288; // w-72
            const gap = 8; // mt-2
            let left = Math.max(8, rect.right - width);
            left = Math.min(left, window.innerWidth - width - 8);
            const top = rect.bottom + gap;
            setFilterPos({ top, left });
        };
        calc();
        window.addEventListener('resize', calc);
        window.addEventListener('scroll', calc, true);
        return () => {
            window.removeEventListener('resize', calc);
            window.removeEventListener('scroll', calc, true);
        };
    }, [showFilters]);

    // Cart functions
    const addToCart = () => {
        if (!selected) return;

        // If service lacks "Size" variant, but linked product has sizes -> enforce selection
        const hasSizeVariant = (selected.variants || []).some(v => v.label.toLowerCase() === 'size');
        let selectedSizes: Array<{ productId: string; sizeName: string }> | undefined;
        if (!hasSizeVariant && selected.attributes && selected.attributes.length > 0) {
            // support single linked product with sizes for selection UX
            const productsWithSizes = selected.attributes
                .map(a => a.productId)
                .filter(Boolean)
                .filter((pid, idx, arr) => arr.indexOf(pid) === idx)
                .map(pid => ({ pid, inv: inventoryCache[pid] }))
                .filter(x => x.inv && Array.isArray(x.inv.sizes) && x.inv.sizes.length > 0);

            if (productsWithSizes.length === 1) {
                const pid = productsWithSizes[0].pid!;
                const choice = sizeChoice[pid];
                if (!choice) {
                    setNotif({ type: 'error', message: 'Please select a size.' });
                    return;
                }
                selectedSizes = [{ productId: pid, sizeName: choice }];
            }
        }

        const selectedOptions = (selected.variants || []).map(variant => ({
            variantLabel: variant.label,
            optionName: variant.options[variantChoices[variant.label] || 0]?.name || ''
        }));

        const cartItem: CartItem = {
            service: selected,
            quantity,
            selectedOptions,
            files: files.map(f => ({ file: f.file, preview: f.preview || '' })),
            notes,
            selectedSizes,
        };

        setCart(prev => [...prev, cartItem]);
        setSelected(null);
        setVariantChoices({});
        setQuantity(1);
        setFiles([]);
        setNotes('');
        setSizeChoice({});
        setNotif({ type: 'success', message: 'Item added to cart!' });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateCartItemQuantity = (index: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(index);
            return;
        }
        setCart(prev => prev.map((item, i) => 
            i === index ? { ...item, quantity: newQuantity } : item
        ));
    };

    const clearCart = () => {
        setCart([]);
    };

    // Payment confirmation functions
    // const checkPaymentStatus = async (orderId: string) => {
    //     try {
    //         const response = await api.get(`/orders/${orderId}/payment-status`);
    //         const status = response.data;
    //         
    //         if (status.paymentStatus === 'paid') {
    //             setPaymentStatus('completed');
    //             setNotif({ type: 'success', message: 'Payment confirmed! Your order is being processed.' });
    //         } else {
    //             setPaymentStatus('pending');
    //         }
    //     } catch (e: unknown) {
    //         setPaymentStatus('failed');
    //         setNotif({ type: 'error', message: 'Failed to check payment status' });
    //     }
    // };

    // Replace immediate “simulate payment” flow with: wait for ready => show QR => wait for owner verify => show receipt
    useEffect(() => {
        if (!showPaymentModal || !paymentOrderId) return;

        let cancelled = false;
        let pollTimer: ReturnType<typeof setInterval> | null = null;
        let es: EventSource | null = null;

        async function fetchOrderOnce() {
            try {
                const res = await api.get(`/orders/${paymentOrderId}`);
                if (cancelled) return;
                const o = res.data as { status?: OrderStatusLocal };
                if (!o?.status) return;

                setWatchedOrderStatus(o.status);

                if (o.status === 'ready' && !showPaymentModal) {
                    setShowPaymentModal(true);
                }
                if (o.status === 'completed') {
                    setPaymentStatus('completed');
                    if (!showPaymentModal) setShowPaymentModal(true);
                    if (!receiptUrl) {
                        try {
                            const rec = await api.get(`/orders/${paymentOrderId}/receipt`, { responseType: 'blob' });
                            const blobUrl = URL.createObjectURL(rec.data);
                            if (!cancelled) setReceiptUrl(blobUrl);
                        } catch { /* ignore */ }
                    }
                }
            } catch { /* ignore */ }
        }

        try {
            const base = api.defaults.baseURL?.replace(/\/+$/, '') || '';
            es = new EventSource(`${base}/orders/${paymentOrderId}/events`);
            es.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data || '{}');
                    if (data?.type === 'status' && data.status) {
                        setWatchedOrderStatus(data.status);
                        if (data.status === 'ready' && !showPaymentModal) setShowPaymentModal(true);
                        if (data.status === 'completed') {
                            setPaymentStatus('completed');
                            if (!showPaymentModal) setShowPaymentModal(true);
                        }
                    }
                    if (data?.type === 'receipt' && data.blobUrl && !receiptUrl) {
                        setReceiptUrl(data.blobUrl);
                    }
                } catch { /* ignore */ }
            };
            es.onerror = () => {
                if (!pollTimer) {
                    fetchOrderOnce();
                    pollTimer = setInterval(fetchOrderOnce, 3000);
                }
            };
        } catch {
            fetchOrderOnce();
            pollTimer = setInterval(fetchOrderOnce, 3000);
        }

        fetchOrderOnce();

        return () => {
            cancelled = true;
            if (pollTimer) clearInterval(pollTimer);
            if (es) es.close();
        };
    }, [paymentOrderId, showPaymentModal, receiptUrl]);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const basePrice = item.service.basePrice || 0;
            const optionPrices = item.selectedOptions.reduce((sum, option) => {
                const variant = item.service.variants?.find(v => v.label === option.variantLabel);
                const optionData = variant?.options.find(o => o.name === option.optionName);
                return sum + (optionData?.priceDelta || 0);
            }, 0);
            return total + (basePrice + optionPrices) * item.quantity;
        }, 0);
    }, [cart]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let items = services.filter((s) =>
            [s.name, s.description, s.unit]
                .filter(Boolean)
                .some((t) => String(t).toLowerCase().includes(q))
        );

        // Sorting: best-selling first, then by selected sort key
        items = [...items].sort((a, b) => {
            const aBest = bestSellingIds.has(String(a._id)) || bestSellingNames.has((a.name || '').toLowerCase());
            const bBest = bestSellingIds.has(String(b._id)) || bestSellingNames.has((b.name || '').toLowerCase());
            if (aBest !== bBest) return aBest ? -1 : 1;
            let cmp = 0;
            if (sortKey === 'name') {
                cmp = (a.name || '').localeCompare(b.name || '');
            } else {
                const av = Number(a.basePrice) || 0;
                const bv = Number(b.basePrice) || 0;
                cmp = av - bv;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return items;
    }, [query, services, sortKey, sortDir, bestSellingIds, bestSellingNames]);

    // Notification auto-hide
    useEffect(() => {
        if (notif) {
            const timer = setTimeout(() => setNotif(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [notif]);

    return (
        <div className="w-full">
            {/* Notification */}
            {notif && (
                <div className={`fixed bottom-8 right-8 z-[100000] px-6 py-3 rounded-xl shadow-lg flex items-center gap-3
                    ${notif.type === 'error' ? 'bg-red-700 border border-red-400 text-white' : 'bg-green-700 border border-green-400 text-white'}
                    animate-fade-in`}
                    style={{ minWidth: '280px', maxWidth: '90vw' }}
                >
                    {notif.type === 'error' ? (
                        <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-green-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    <span className="font-medium">{notif.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="mt-6">
                {/* Center on desktop view */}
                <div className="relative z-[100] max-w-4xl mx-auto px-4 lg:transform lg:-translate-x-32">
                    <h1 className="text-center text-white text-2xl md:text-3xl tracking-widest font-semibold">
                        SELECT A SERVICE
                    </h1>
                    <div className="mt-4">
                        <div className="relative z-[60] flex items-center justify-center gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search services"
                                className="block w-full max-w-md h-11 rounded-full bg-white/10 text-white placeholder:text-gray-300 px-5 focus:outline-none border border-white/20 focus:border-white/40 backdrop-blur"
                                aria-label="Search services"
                            />
                            <div className="relative z-[60]" ref={filterAnchorRef}>
                                <button
                                    onClick={() => setShowFilters((v) => !v)}
                                    className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/15"
                                    aria-haspopup="true"
                                    aria-expanded={showFilters}
                                >
                                    <FunnelIcon className="h-5 w-5" /> Filter
                                </button>
                            </div>
                            <div className="relative z-[60]">
                                <button
                                    onClick={() => setShowCart(true)}
                                    className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-blue-600 text-white border border-blue-500 hover:bg-blue-500"
                                >
                                    <ShoppingCartIcon className="h-5 w-5" />
                                    Cart ({cart.length})
                                    {cartTotal > 0 && (
                                        <span className="text-xs bg-blue-500 px-2 py-0.5 rounded-full">
                                            {formatMoney(cartTotal)}
                                        </span>
                                    )}
                                </button>
                                {showFilters && filterPos && createPortal(
                                    <div
                                        className="w-72 rounded-lg border border-white/10 bg-gray-900 p-3 z-[1000] shadow-2xl"
                                        style={{ position: 'fixed', top: `${filterPos.top}px`, left: `${filterPos.left}px` }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-sm font-semibold text-white">Filters</div>
                                            <button className="text-xs text-gray-300 hover:text-white" onClick={() => setShowFilters(false)}>Close</button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-1">Sort by</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => { setSortKey('name'); setSortDir('asc'); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${sortKey==='name'&&sortDir==='asc' ? 'border-blue-500 text-blue-200 bg-blue-500/10' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}
                                                    >
                                                        Name A–Z
                                                    </button>
                                                    <button
                                                        onClick={() => { setSortKey('name'); setSortDir('desc'); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${sortKey==='name'&&sortDir==='desc' ? 'border-blue-500 text-blue-200 bg-blue-500/10' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}
                                                    >
                                                        Name Z–A
                                                    </button>
                                                    <button
                                                        onClick={() => { setSortKey('price'); setSortDir('asc'); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${sortKey==='price'&&sortDir==='asc' ? 'border-blue-500 text-blue-200 bg-blue-500/10' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}
                                                    >
                                                        Price Low–High
                                                    </button>
                                                    <button
                                                        onClick={() => { setSortKey('price'); setSortDir('desc'); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${sortKey==='price'&&sortDir==='desc' ? 'border-blue-500 text-blue-200 bg-blue-500/10' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}
                                                    >
                                                        Price High–Low
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    className="text-xs px-3 py-1 rounded border border-white/10 text-gray-200 hover:bg-white/10"
                                                    onClick={() => { setSortKey('name'); setSortDir('asc'); }}
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                                                    onClick={() => setShowFilters(false)}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mt-8">
                {!derivedStoreId && (
                    <div className="text-center text-white/90">
                        <p className="text-sm">No shop selected.</p>
                        <p className="text-sm mt-1">
                            <Link className="underline hover:opacity-80" to="/customer/select-shop">Choose a shop</Link> to see available services.
                        </p>
                    </div>
                )}

                {derivedStoreId && (
                    <>
                        {loading && (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" aria-label="Loading" />
                            </div>
                        )}
                        {error && (
                            <div className="text-center text-red-300 py-6">{error}</div>
                        )}
                        {!loading && !error && (
                            <>
                                {filtered.length === 0 ? (
                                    <div className="text-center text-white/90 py-10">No services found.</div>
                                ) : (
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {filtered.map((svc) => {
                                            let hasImage = false; // has image?
                                            const raw = svc.imageFileId as unknown;
                                            if (typeof raw === 'string') hasImage = !!raw;
                                            else if (raw && typeof raw === 'object') {
                                                const maybe = raw as { _id?: unknown; toString?: () => string };
                                                if (typeof maybe._id === 'string') hasImage = true;
                                                else if (typeof maybe.toString === 'function' && maybe.toString()) hasImage = true;
                                            }
                                            const imgSrc = hasImage ? `${api.defaults.baseURL}/services/${svc._id}/image` : undefined;
                                            const isBest = bestSellingIds.has(String(svc._id)) || bestSellingNames.has((svc.name || '').toLowerCase());
                                            return (
                                                <li key={svc._id} className="group">
                                                    <div
                                                        className="h-full overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                                        onClick={() => {
                                                            // Close filter dropdown if open
                                                            if (showFilters) setShowFilters(false);
                                                            setSelected(svc);
                                                            // initialize variant choices to first option per variant
                                                            const init: Record<string, number> = {};
                                                            (svc.variants || []).forEach((v) => { init[v.label] = 0; });
                                                            setVariantChoices(init);
                                                            setQuantity(1);
                                                            setFiles([]);
                                                            setNotes('');
                                                        }}
                                                    >
                                                        {imgSrc ? (
                                                            <div className="relative aspect-video w-full bg-white/5 overflow-hidden">
                                                                <img src={imgSrc} alt={`${svc.name} image`} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                                                            </div>
                                                        ) : (
                                                            <div className="relative aspect-video w-full bg-white/5 flex items-center justify-center text-white/60 text-sm">
                                                                No image
                                                            </div>
                                                        )}
                                                            <div className="p-4">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <h3 className="text-base font-semibold text-white truncate">{svc.name}</h3>
                                                                        {isBest && (
                                                                            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-yellow-400 text-yellow-200 bg-yellow-500/10">
                                                                                Best Seller
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-white/90 whitespace-nowrap ml-auto">
                                                                    {formatMoney(svc.basePrice, svc.currency || 'PHP')}
                                                                </div>
                                                            </div>
                                                            {svc.unit && (
                                                                <div className="text-xs text-gray-300 mt-0.5">{svc.unit}</div>
                                                            )}
                                                            {svc.description && (
                                                                <p className="text-sm text-gray-200 mt-3 line-clamp-3">{svc.description}</p>
                                                            )}
                                                            {svc.variants && svc.variants.length > 0 && (
                                                                <div className="mt-2">
                                                                    <p className="text-xs text-gray-400 mb-1">Available options:</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {svc.variants.map((variant, vIdx) => (
                                                                            <span key={vIdx} className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded">
                                                                                {variant.label}: {variant.options.length} options
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Order modal */}
            {selected && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
                    <div className="relative z-10 mx-auto max-w-3xl w-[92%] sm:w-[640px] rounded-xl border border-white/10 bg-gray-900 text-white shadow-xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
                            <div className="flex items-center gap-3 min-w-0">
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
                            >
                                Close
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-4 sm:p-5 space-y-4 max-h-[76vh] overflow-y-auto">
                            {/* Product */}
                            <div className="flex items-start gap-4">
                                <div className="w-40 h-28 rounded-md overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                                    {(() => {
                                        // image src
                                        let hasImage = false;
                                        const raw = selected.imageFileId as unknown;
                                        if (typeof raw === 'string') hasImage = !!raw;
                                        else if (raw && typeof raw === 'object') {
                                            const maybe = raw as { _id?: unknown; toString?: () => string };
                                            if (typeof maybe._id === 'string') hasImage = true;
                                            else if (typeof maybe.toString === 'function' && maybe.toString()) hasImage = true;
                                        }
                                        const src = hasImage ? `${api.defaults.baseURL}/services/${selected._id}/image` : null;
                                        return src ? (
                                            <img src={src} alt={`${selected.name} image`} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs text-white/60">No image</span>
                                        );
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-base font-semibold">{selected.name}</div>
                                            {selected.unit && (
                                                <div className="text-xs text-gray-300">{selected.unit}</div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-semibold">
                                                {formatMoney(unitPrice * safeQty, selected.currency || 'PHP')}
                                            </div>
                                            <div className="text-xs text-gray-300">{formatMoney(unitPrice, selected.currency || 'PHP')} × {safeQty}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Linked product description and sizes (if no "Size" variant) */}
                            {(() => {
                                const hasSizeVariant = (selected.variants || []).some(v => v.label.toLowerCase() === 'size');
                                if (hasSizeVariant) return null;
                                if (!selected.attributes || selected.attributes.length === 0) return null;
                                // single linked inventory flow for size selection
                                const unique = Array.from(new Set(selected.attributes.map(a => a.productId).filter(Boolean)));
                                if (unique.length !== 1) return null;
                                const pid = unique[0];
                                const inv = inventoryCache[pid];
                                if (!inv) return null;
                                return (
                                    <div className="space-y-2">
                                        {inv.description && (
                                            <div className="text-sm text-gray-200">
                                                <span className="font-semibold">Product details:</span> {inv.description}
                                            </div>
                                        )}
                                        {Array.isArray(inv.sizes) && inv.sizes.length > 0 && (
                                            <div>
                                                <label className="block text-xs text-gray-300 mb-1">Available sizes</label>
                                                <select
                                                    value={sizeChoice[pid] ?? ''}
                                                    onChange={(e) => setSizeChoice(prev => ({ ...prev, [pid]: e.target.value }))}
                                                    className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-white"
                                                >
                                                    <option value="">Select size</option>
                                                    {inv.sizes.map((sz, i) => (
                                                        <option key={i} value={sz.name}>
                                                            {sz.name} ({sz.quantity} pcs available)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Attributes */}
                            {(selected.variants || []).length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold">Attributes</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(selected.variants || []).map((v) => (
                                            <div key={v.label}>
                                                <label className="block text-xs text-gray-300 mb-1">{v.label}</label>
                                                <select
                                                    value={variantChoices[v.label] ?? 0}
                                                    onChange={(e) => setVariantChoices((prev) => ({ ...prev, [v.label]: Number(e.target.value) }))}
                                                    className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-white"
                                                >
                                                    {v.options.map((o, idx) => (
                                                        <option key={idx} value={idx}>
                                                            {o.name} {o.priceDelta ? `(+${formatMoney(o.priceDelta, selected.currency || 'PHP')})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Stepper */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold">Quantity</label>
                                <div className="inline-flex items-stretch rounded-lg border border-white/10 bg-gray-800 overflow-hidden">
                                    <button
                                        type="button"
                                        className="px-3 py-2 hover:bg-white/10 disabled:opacity-40"
                                        onClick={() => setQuantity((q) => Math.max(1, (q || 1) - 1))}
                                        aria-label="Decrease quantity"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        max={9999}
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setQuantity(Number.isFinite(val) ? val : 1);
                                        }}
                                        onBlur={(e) => {
                                            const val = Number(e.target.value);
                                            const clamped = Math.min(9999, Math.max(1, Number.isFinite(val) ? val : 1));
                                            setQuantity(clamped);
                                        }}
                                        className="no-spinner w-16 text-center bg-transparent focus:outline-none"
                                        aria-label="Quantity"
                                    />
                                    <button
                                        type="button"
                                        className="px-3 py-2 hover:bg-white/10"
                                        onClick={() => setQuantity((q) => Math.min(9999, (q || 1) + 1))}
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="text-xs text-gray-400">Total: {formatMoney(unitPrice * safeQty, selected?.currency || 'PHP')}</div>
                            </div>

                            {/* Upload dropzone */}
                            <div>
                                <div className="text-sm font-semibold mb-1">Upload files</div>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        const fl = Array.from(e.dataTransfer.files || []);
                                        if (!fl.length) return;
                                        setFiles((prev) => [
                                            ...prev,
                                            ...fl.map((file) => ({ file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined })),
                                        ]);
                                    }}
                                    className="border-2 border-dashed border-white/15 bg-gray-800 rounded-lg p-4 text-center text-gray-300 hover:bg-gray-800/80"
                                >
                                    <p className="text-xs">Drag & drop files here, or</p>
                                    <div className="mt-2">
                                        <label className="inline-block px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer text-sm">
                                            Browse
                                            <input
                                                type="file"
                                                className="hidden"
                                                multiple
                                                accept=".svg,.pdf,.doc,.docx,.jpeg,.jpg,.png,.gif,.webp,.tif,.tiff,.bmp"
                                                onChange={(e) => {
                                                    const fl = Array.from(e.target.files || []);
                                                    if (!fl.length) return;
                                                    setFiles((prev) => [
                                                        ...prev,
                                                        ...fl.map((file) => ({ file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined })),
                                                    ]);
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                                {files.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {files.map((f, idx) => (
                                            <div key={idx} className="relative rounded-md border border-white/10 bg-gray-800 p-2 flex items-center justify-center">
                                                {f.preview ? (
                                                    <img src={f.preview} alt={f.file.name} className="h-24 w-full object-cover rounded" />
                                                ) : (
                                                    <div className="text-xs text-gray-300 break-words text-center px-1">
                                                        {f.file.name}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-black/70 border border-white/20 text-xs"
                                                    onClick={() => {
                                                        setFiles((prev) => {
                                                            const next = [...prev];
                                                            const [removed] = next.splice(idx, 1);
                                                            if (removed?.preview) { try { URL.revokeObjectURL(removed.preview); } catch { /* ignore */ } }
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Customize if image */}
                                {files.some((f) => f.file.type.startsWith('image/') || /svg\+xml/i.test(f.file.type)) && (
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm"
                                            onClick={() => {
                                            }}
                                        >
                                            Customize
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs text-gray-300 mb-1">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Add instructions for this order"
                                    className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-white"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-60"
                                    disabled={submitting}
                                    onClick={addToCart}
                                >
                                    {submitting ? 'Adding…' : 'Add to Cart'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="relative z-10 mx-auto max-w-4xl w-[92%] sm:w-[800px] rounded-xl border border-white/10 bg-gray-900 text-white shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
                            <h2 className="text-lg font-semibold">Shopping Cart ({cart.length} items)</h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 rounded-lg hover:bg-white/10"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-5 max-h-96 overflow-y-auto">
                            {cart.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <ShoppingCartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Your cart is empty</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item, index) => (
                                        <div key={index} className="border border-white/10 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-white">{item.service.name}</h3>
                                                    <p className="text-sm text-gray-300">{item.service.description}</p>
                                                    <div className="mt-2">
                                                        <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                                                        <p className="text-sm text-gray-400">Unit: {item.service.unit}</p>
                                                        {item.selectedOptions.length > 0 && (
                                                            <div className="mt-1">
                                                                <p className="text-xs text-gray-400">Options:</p>
                                                                {item.selectedOptions.map((option, optIndex) => (
                                                                    <span key={optIndex} className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded mr-1">
                                                                        {option.variantLabel}: {option.optionName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {item.notes && (
                                                            <p className="text-sm text-gray-400 mt-1">Notes: {item.notes}</p>
                                                        )}
                                                        <p className="text-sm text-gray-400 mt-1">Files: {item.files.length}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    <div className="text-right">
                                                        <p className="font-semibold">{formatMoney(
                                                            (item.service.basePrice + item.selectedOptions.reduce((sum, opt) => {
                                                                const variant = item.service.variants?.find(v => v.label === opt.variantLabel);
                                                                const optionData = variant?.options.find(o => o.name === opt.optionName);
                                                                return sum + (optionData?.priceDelta || 0);
                                                            }, 0)) * item.quantity,
                                                            item.service.currency
                                                        )}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                                            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-2 py-1 text-sm">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                                            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            onClick={() => removeFromCart(index)}
                                                            className="p-1 rounded hover:bg-red-600 text-red-300 ml-2"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Render sizes inside cart items */}
                                            {item.selectedSizes && item.selectedSizes.length > 0 && (
                                                <div className="mt-1">
                                                    <p className="text-xs text-gray-400">Sizes:</p>
                                                    {item.selectedSizes.map((s, i) => (
                                                        <span key={i} className="text-xs bg-purple-500/20 text-purple-200 px-2 py-1 rounded mr-1">
                                                            {s.sizeName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="px-4 sm:px-5 py-3 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-semibold">
                                        Total: {formatMoney(cartTotal)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={clearCart}
                                            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                                        >
                                            Clear Cart
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!derivedStoreId) return;
                                                try {
                                                    setSubmitting(true);
                                                    setNotif(null);

                                                    // Ensure auth or guest token present
                                                    if (!token) {
                                                        try {
                                                            await continueAsGuest();
                                                        } catch {
                                                            setNotif({ type: 'error', message: 'Unable to start guest session.' });
                                                            setSubmitting(false);
                                                            return;
                                                        }
                                                    }

                                                    // Create orders for each cart item
                                                    const orderIds: string[] = [];
                                                    for (const item of cart) {
                                                        const options = item.selectedOptions.map(opt => ({
                                                            label: opt.variantLabel,
                                                            optionIndex:
                                                                item.service.variants?.find(v => v.label === opt.variantLabel)?.options.findIndex(o => o.name === opt.optionName) || 0,
                                                        }));

                                                        const fd = new FormData();
                                                        fd.append('storeId', derivedStoreId);
                                                        fd.append('serviceId', item.service._id);
                                                        fd.append('quantity', String(item.quantity));
                                                        fd.append('notes', item.notes || '');
                                                        fd.append('selectedOptions', JSON.stringify(options));

                                                        // NEW: include selected sizes for size-level deduction
                                                        if (item.selectedSizes && item.selectedSizes.length > 0) {
                                                            fd.append('selectedSizes', JSON.stringify(item.selectedSizes));
                                                        } else {
                                                            // If a "Size" variant exists and options have linked inventory, pass the pair as well
                                                            const sizeVariant = (item.service.variants || []).find(v => v.label.toLowerCase() === 'size');
                                                            if (sizeVariant) {
                                                                const idx = options.find(o => o.label === sizeVariant.label)?.optionIndex ?? 0;
                                                                const opt = sizeVariant.options[idx];
                                                                if (opt?.linkedInventoryId) {
                                                                    fd.append('selectedSizes', JSON.stringify([{
                                                                        productId: String(opt.linkedInventoryId),
                                                                        sizeName: String(opt.name),
                                                                    }]));
                                                                }
                                                            }
                                                        }

                                                        for (const file of item.files) {
                                                            fd.append('files', file.file, file.file.name);
                                                        }

                                                        const response = await api.post('/orders', fd);
                                                        orderIds.push(response.data._id);
                                                    }

                                                    setNotif({ type: 'success', message: 'Orders placed successfully! We’ll notify you when it’s ready.' });
                                                    setCart([]);
                                                    setShowCart(false);
                                                    if (orderIds.length > 0) {
                                                      setPaymentOrderId(orderIds[0]);     // keep the ID to watch
                                                      setWatchedOrderStatus(null);
                                                      setReceiptUrl(null);
                                                      setPaymentStatus('pending');
                                                      // removed: setShowPaymentModal(true);
                                                    }
                                                } catch {
                                                    setNotif({ type: 'error', message: 'Failed to place order(s).' });
                                                } finally {
                                                    setSubmitting(false);
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-60"
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Placing…' : 'Place Order'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payment confirmation modal (new flow) */}
            {showPaymentModal && paymentOrderId && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative z-10 max-w-md w-full rounded-xl border border-white/10 bg-gray-900 text-white shadow-xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
                            <div className="text-lg font-semibold">
                                Payment Confirmation
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 rounded-lg hover:bg-white/10"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-4 sm:p-5 space-y-4">
                            {/* Order status */}
                            <div className="text-center">
                                <div className="text-sm text-gray-400 mb-1">Order Status</div>
                                <div className="text-2xl font-bold">
                                    {watchedOrderStatus === 'pending' && 'Waiting for confirmation'}
                                    {watchedOrderStatus === 'processing' && 'Being prepared'}
                                    {watchedOrderStatus === 'ready' && 'Ready for pickup'}
                                    {watchedOrderStatus === 'completed' && 'Completed'}
                                    {watchedOrderStatus === 'cancelled' && 'Cancelled'}
                                </div>
                            </div>

                            {/* QR Code / Receipt */}
                            {(watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed') && (
                                <div className="space-y-4">
                                    {watchedOrderStatus === 'ready' && (
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400 mb-2">Pickup QR Code</div>
                                            <div className="flex items-center justify-center">
                                                <QRCodeCanvas
                                                    value={`ORDER:${paymentOrderId}`}
                                                    size={160}
                                                    includeMargin
                                                    className="rounded-lg bg-white p-2"
                                                />
                                            </div>
                                            <div className="text-xs text-gray-400 mt-2">
                                              Show this QR at the counter to proceed.
                                            </div>
                                        </div>
                                    )}
                                    {watchedOrderStatus === 'completed' && receiptUrl && (
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400 mb-2">Receipt</div>
                                            <a
                                                href={receiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                                            >
                                                View Receipt
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Common actions */}
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                                >
                                    Close
                                </button>
                                {(watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed') && (
                                    <button
                                        onClick={() => {
                                            if (watchedOrderStatus === 'ready') {
                                                setShowPaymentModal(false);
                                                // Optionally, navigate to a different page or show a success message
                                            }
                                            if (watchedOrderStatus === 'completed') {
                                                // For completed orders, you might want to navigate to the order history or similar
                                                // navigate('/order-history');
                                                setShowPaymentModal(false);
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-sm"
                                    >
                                        {watchedOrderStatus === 'ready' ? 'Got it, pick up soon!' : 'View order history'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


