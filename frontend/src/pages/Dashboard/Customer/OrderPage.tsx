import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { FunnelIcon, ShoppingCartIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
    active?: boolean; // Added active status
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
    attributes?: Array<{ productId: string; quantity?: number; productPrice?: number; sizeName?: string }>;
};

type CartItem = {
    service: Service;
    quantity: number;
    selectedOptions: Array<{ variantLabel: string; optionName: string }>;
    files: Array<{ file: File; preview: string }>;
    notes: string;
    selectedSizes?: Array<{ productId: string; sizeName: string }>;
};

type LocationState = { storeId?: string } | undefined;
type OrderStatusLocal = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';

const formatMoney = (n: number | undefined | null, code: string = 'PHP') => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(n);
    } catch {
        const prefix = code === 'USD' ? '$' : code === 'EUR' ? '€' : code === 'GBP' ? '£' : code === 'JPY' ? '¥' : '₱';
        return `${prefix}${n.toFixed(2)}`;
    }
};

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
    const [bestSellingNames, setBestSellingNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    
    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const filterAnchorRef = useRef<HTMLDivElement | null>(null);
    const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
    const [sortKey, setSortKey] = useState<'name' | 'price'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Modal state
    const [selected, setSelected] = useState<Service | null>(null);
    const [variantChoices, setVariantChoices] = useState<Record<string, number>>({});
    const [quantity, setQuantity] = useState<number>(1);
    const [files, setFiles] = useState<Array<{ file: File; preview?: string }>>([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    
    // Payment confirmation state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
    const [_paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
    const [watchedOrderStatus, setWatchedOrderStatus] = useState<OrderStatusLocal | null>(null);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    // Down payment modal state for bulk orders
    const [showDownPaymentModal, setShowDownPaymentModal] = useState(false);
    const [dpMethod, setDpMethod] = useState<'gcash' | 'bank_transfer' | 'other'>('gcash');
    const [dpReceiptFile, setDpReceiptFile] = useState<File | null>(null);
    const [dpReceiptPreview, setDpReceiptPreview] = useState<string | null>(null);

    // Manage receipt preview URL lifecycle
    function handleDpFile(file: File | null) {
        // revoke previous preview
        if (dpReceiptPreview) {
            try { URL.revokeObjectURL(dpReceiptPreview); } catch { /* ignore */ }
            setDpReceiptPreview(null);
        }
        setDpReceiptFile(file);
        if (file && file.type && file.type.startsWith('image/')) {
            try {
                const url = URL.createObjectURL(file);
                setDpReceiptPreview(url);
            } catch {
                setDpReceiptPreview(null);
            }
        } else {
            setDpReceiptPreview(null);
        }
    }
    const [dpReference, setDpReference] = useState('');

    // Inventory cache for sizes
    const [inventoryCache, _setInventoryCache] = useState<Record<string, any>>({});
    const [sizeChoice, setSizeChoice] = useState<Record<string, string>>({});

    // Notification state
    const [notif, setNotif] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

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

    // Fetch services and best sellers
    useEffect(() => {
        let active = true;
        const fetchBestSelling = async (storeId: string) => {
            try {
                const bestRes = await api.get(`/analytics/best-selling/${storeId}`);
                if (!active) return;
                const listRaw = bestRes.data?.bestSelling ?? bestRes.data ?? [];
                const list: Array<{ serviceId?: string; _id?: string; serviceName?: string }> = Array.isArray(listRaw) ? listRaw : [];
                const ids = new Set<string>(list.map((x) => String((x.serviceId ?? x._id) || '')));
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

    // Filter dropdown positioning
    useEffect(() => {
        if (!showFilters) return;
        const calc = () => {
            const el = filterAnchorRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const width = 320;
            const gap = 8;
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

        const hasSizeVariant = (selected.variants || []).some(v => v.label.toLowerCase() === 'size');
        let selectedSizes: Array<{ productId: string; sizeName: string }> | undefined;
        
        if (!hasSizeVariant && selected.attributes && selected.attributes.length > 0) {
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

    // Payment status monitoring
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

    // Helper to submit orders; accepts optional downpayment payload
    async function submitOrders(downPayment?: { required?: boolean; amount?: number; method?: string; reference?: string; receipt?: File | null }) {
        if (!derivedStoreId) return;
        try {
            setSubmitting(true);
            setNotif(null);

            if (!token) {
                try {
                    await continueAsGuest();
                } catch {
                    setNotif({ type: 'error', message: 'Unable to start guest session.' });
                    setSubmitting(false);
                    return;
                }
            }

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

                if (item.selectedSizes && item.selectedSizes.length > 0) {
                    fd.append('selectedSizes', JSON.stringify(item.selectedSizes));
                } else {
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

                if (downPayment && downPayment.required) {
                    fd.append('downPaymentRequired', 'true');
                    if (typeof downPayment.amount === 'number') fd.append('downPaymentAmount', String(downPayment.amount));
                    if (downPayment.method) fd.append('downPaymentMethod', downPayment.method);
                    if (downPayment.reference) fd.append('downPaymentReference', downPayment.reference);
                    if (downPayment.receipt) fd.append('receipt', downPayment.receipt, downPayment.receipt.name);
                }

                const response = await api.post('/orders', fd);
                orderIds.push(response.data._id);
            }

            setNotif({ type: 'success', message: 'Orders placed successfully! We\'ll notify you when ready.' });
            setCart([]);
            setShowCart(false);
            if (orderIds.length > 0) {
                setPaymentOrderId(orderIds[0]);
                setWatchedOrderStatus(null);
                setReceiptUrl(null);
                setPaymentStatus('pending');
            }
        } catch (e) {
            console.error('submitOrders error', e);
            setNotif({ type: 'error', message: 'Failed to place order(s).' });
        } finally {
            setSubmitting(false);
        }
    }

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
        <div className="">
            {/* Fixed Notification with higher z-index */}
            {notif && (
                <div className={`fixed top-24 right-6 z-[100000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-sm border transform transition-all duration-300 animate-slide-in-right
                    ${notif.type === 'error' 
                        ? 'bg-gradient-to-r from-red-600/90 to-red-700/90 border-red-400/50 text-white' 
                        : 'bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 border-emerald-400/50 text-white'
                    }`}
                    style={{ minWidth: '320px', maxWidth: '90vw' }}
                >
                    {notif.type === 'error' ? (
                        <svg className="w-6 h-6 text-red-200 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-emerald-200 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    <span className="font-semibold text-sm">{notif.message}</span>
                </div>
            )}

            {/* Enhanced Header */}
            <div className="pt-8 pb-6 relative z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide mb-3">
                          SELECT A PRODUCT SERVICE
                        </h1>
                        <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                            Transform your ideas into stunning prints with our professional services
                        </p>
                    </div>

                    {/* Enhanced Search and Filters */}
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <div className="relative flex-1 max-w-2xl">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search services by name, description, or unit..."
                                    className="block w-full h-14 rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-600 text-white placeholder:text-slate-400 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg shadow-lg transition-all duration-200"
                                    aria-label="Search services"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="relative z-[60]" ref={filterAnchorRef}>
                                    <button
                                        onClick={() => setShowFilters((v) => !v)}
                                        className="inline-flex items-center justify-center gap-3 px-6 h-14 rounded-2xl bg-slate-800/40 backdrop-blur-sm text-white border border-slate-600 hover:bg-slate-700/40 hover:border-slate-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                                        aria-haspopup="true"
                                        aria-expanded={showFilters}
                                    >
                                        <FunnelIcon className="h-5 w-5" /> 
                                        <span className="font-medium">Filter & Sort</span>
                                    </button>
                                </div>

                                {/* Enhanced Cart Button */}
                                <button
                                    onClick={() => setShowCart(true)}
                                    className="relative inline-flex items-center justify-center gap-3 px-6 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500 hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl group"
                                >
                                    <div className="relative">
                                        <ShoppingCartIcon className="h-6 w-6" />
                                        {cart.length > 0 && (
                                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                                                {cart.length}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold">Cart</span>
                                    {cartTotal > 0 && (
                                        <span className="text-sm bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
                                            {formatMoney(cartTotal)}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Filter Dropdown */}
                    {showFilters && filterPos && createPortal(
                        <div
                            className="w-80 rounded-2xl border border-slate-600 bg-slate-800/95 backdrop-blur-sm p-6 z-[1000] shadow-2xl animate-fade-in"
                            style={{ position: 'fixed', top: `${filterPos.top}px`, left: `${filterPos.left}px` }}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="text-lg font-bold text-white">Sort Options</div>
                                <button 
                                    className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                                    onClick={() => setShowFilters(false)}
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <div className="text-sm font-semibold text-slate-300 mb-3">Sort by</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => { setSortKey('name'); setSortDir('asc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='name'&&sortDir==='asc' 
                                                    ? 'border-blue-500 text-blue-200 bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Name A–Z</div>
                                        </button>
                                        <button
                                            onClick={() => { setSortKey('name'); setSortDir('desc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='name'&&sortDir==='desc' 
                                                    ? 'border-blue-500 text-blue-200 bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Name Z–A</div>
                                        </button>
                                        <button
                                            onClick={() => { setSortKey('price'); setSortDir('asc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='price'&&sortDir==='asc' 
                                                    ? 'border-blue-500 text-blue-200 bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Price Low–High</div>
                                        </button>
                                        <button
                                            onClick={() => { setSortKey('price'); setSortDir('desc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='price'&&sortDir==='desc' 
                                                    ? 'border-blue-500 text-blue-200 bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Price High–Low</div>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700/50 transition-colors font-medium"
                                        onClick={() => { setSortKey('name'); setSortDir('asc'); }}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium shadow-lg"
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

            {/* Enhanced Content */}
            <div className="pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {!derivedStoreId && (
                        <div className="text-center py-20">
                            <div className="bg-slate-800/40 backdrop-blur-sm rounded-3xl p-12 border border-slate-600 max-w-2xl mx-auto shadow-2xl">
                                <div className="w-20 h-20 bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">No Shop Selected</h3>
                                <p className="text-slate-300 text-lg mb-8">Please choose a shop to explore our premium printing services</p>
                                <Link 
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-200 transform hover:scale-105"
                                    to="/customer/select-shop"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Choose a Shop
                                </Link>
                            </div>
                        </div>
                    )}

                    {derivedStoreId && (
                        <>
                            {loading && (
                                <div className="flex items-center justify-center py-24">
                                    <div className="text-center">
                                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-5 shadow-lg"></div>
                                        <div className="text-slate-300 text-lg font-medium">Loading premium services...</div>
                                    </div>
                                </div>
                            )}
                            
                            {error && (
                                <div className="text-center py-16">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-2xl mx-auto backdrop-blur-sm">
                                        <svg className="w-14 h-14 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-red-300 text-xl font-bold mb-2">Unable to Load Services</div>
                                        <div className="text-red-200">{error}</div>
                                    </div>
                                </div>
                            )}
                            
                            {!loading && !error && (
                                <>
                                    {filtered.length === 0 ? (
                                        <div className="text-center py-20">
                                            <div className="bg-slate-800/40 backdrop-blur-sm rounded-3xl p-12 border border-slate-600 max-w-2xl mx-auto shadow-2xl">
                                                <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <h3 className="text-2xl font-bold text-white mb-2">No Services Found</h3>
                                                <p className="text-slate-300">Try adjusting your search or filter criteria</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {filtered.map((svc) => {
                                                let hasImage = false;
                                                const raw = svc.imageFileId as unknown;
                                                if (typeof raw === 'string') hasImage = !!raw;
                                                else if (raw && typeof raw === 'object') {
                                                    const maybe = raw as { _id?: unknown; toString?: () => string };
                                                    if (typeof maybe._id === 'string') hasImage = true;
                                                    else if (typeof maybe.toString === 'function' && maybe.toString()) hasImage = true;
                                                }
                                                const imgSrc = hasImage ? `${api.defaults.baseURL}/services/${svc._id}/image` : undefined;
                                                const isBest = bestSellingIds.has(String(svc._id)) || bestSellingNames.has((svc.name || '').toLowerCase());
                                                
                                                // Check if active (default to true if undefined to be safe, or false if strictly required)
                                                const isActive = svc.active !== false; 

                                                return (
                                                    <div 
                                                        key={svc._id} 
                                                        className={`group cursor-pointer transition-all duration-300 h-full flex flex-col ${isActive ? 'hover:scale-[1.02]' : 'opacity-75 grayscale'}`}
                                                        onClick={() => {
                                                            if (!isActive) return; // Prevent click if disabled
                                                            if (showFilters) setShowFilters(false);
                                                            setSelected(svc);
                                                            const init: Record<string, number> = {};
                                                            (svc.variants || []).forEach((v) => { init[v.label] = 0; });
                                                            setVariantChoices(init);
                                                            setQuantity(1);
                                                            setFiles([]);
                                                            setNotes('');
                                                        }}
                                                    >
                                                        <div className="bg-gradient-to-br from-slate-800 to-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col group-hover:border-slate-600">
                                                            {/* Enhanced Image Section */}
                                                            <div className="relative aspect-[4/3] bg-slate-700 overflow-hidden">
                                                                {imgSrc ? (
                                                                    <img 
                                                                        src={imgSrc} 
                                                                        alt={`${svc.name} image`} 
                                                                        className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'group-hover:scale-110' : ''}`}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                                                                        <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* UNAVAILABLE OVERLAY */}
                                                                {!isActive && (
                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                                                        <span className="px-4 py-2 bg-slate-800/90 text-slate-300 rounded-lg font-bold border border-slate-600">
                                                                            UNAVAILABLE
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Enhanced Best Seller Badge */}
                                                                {isActive && isBest && (
                                                                    <div className="absolute top-3 left-3">
                                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                                            </svg>
                                                                            BEST SELLER
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Enhanced Price Overlay */}
                                                                <div className="absolute bottom-3 right-3">
                                                                    <div className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20 shadow-lg">
                                                                        <div className="text-lg font-bold text-white">
                                                                            {formatMoney(svc.basePrice, svc.currency || 'PHP')}
                                                                        </div>
                                                                        {svc.unit && (
                                                                            <div className="text-xs text-slate-300 text-center">{svc.unit}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Enhanced Content Section */}
                                                            <div className="p-5 flex-1 flex flex-col">
                                                                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-200 transition-colors">{svc.name}</h3>
                                                                {svc.description && (
                                                                    <p className="text-slate-300 text-sm line-clamp-3 mb-4 flex-1">{svc.description}</p>
                                                                )}
                                                                
                                                                {svc.variants && svc.variants.length > 0 && (
                                                                    <div className="mb-4">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {svc.variants.map((variant, vIdx) => (
                                                                                <span key={vIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs border border-blue-400/30">
                                                                                    {variant.label}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="mt-auto pt-4 border-t border-slate-700">
                                                                    <button 
                                                                        disabled={!isActive}
                                                                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                                                                            isActive 
                                                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 hover:shadow-xl transform hover:scale-105' 
                                                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                                                        }`}
                                                                    >
                                                                        {isActive ? 'Customize & Order' : 'Out of Stock'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Enhanced Order Modal */}
            {selected && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
                    <div className="relative z-10 mx-auto max-w-4xl w-[95%] rounded-3xl border border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
                        {/* Enhanced Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600 bg-slate-800/50 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Order Details</h2>
                                    <p className="text-slate-400 text-sm">Customize your {selected.name} order</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setSelected(null)}
                                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors hover:scale-105"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Enhanced Body */}
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Enhanced Product Summary */}
                            <div className="flex items-start gap-6 p-5 rounded-2xl bg-slate-700/30 border border-slate-600 backdrop-blur-sm">
                                <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-600 bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                                    {(() => {
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
                                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        );
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1">{selected.name}</h3>
                                            {selected.unit && (
                                                <div className="text-sm text-slate-300">{selected.unit}</div>
                                            )}
                                            {selected.description && (
                                                <p className="text-slate-400 text-sm mt-2">{selected.description}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-emerald-400">
                                                {formatMoney(unitPrice * safeQty, selected.currency || 'PHP')}
                                            </div>
                                            <div className="text-sm text-slate-300">
                                                {formatMoney(unitPrice, selected.currency || 'PHP')} × {safeQty}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Variants */}
                            {(selected.variants || []).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Customization Options</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(selected.variants || []).map((v) => (
                                            <div key={v.label} className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-200">{v.label}</label>
                                                <select
                                                    value={variantChoices[v.label] ?? 0}
                                                    onChange={(e) => setVariantChoices((prev) => ({ ...prev, [v.label]: Number(e.target.value) }))}
                                                    className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white transition-all duration-200 backdrop-blur-sm"
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

                            {/* Enhanced Quantity */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-200">Quantity</label>
                                <div className="flex items-center gap-4">
                                    <div className="inline-flex items-stretch rounded-xl border border-slate-600 bg-slate-700 overflow-hidden shadow-lg">
                                        <button
                                            type="button"
                                            className="px-4 py-3 hover:bg-slate-600 disabled:opacity-40 transition-colors"
                                            onClick={() => setQuantity((q) => Math.max(1, (q || 1) - 1))}
                                            aria-label="Decrease quantity"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
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
                                            className="no-spinner w-20 text-center bg-transparent focus:outline-none font-medium text-lg"
                                            aria-label="Quantity"
                                        />
                                        <button
                                            type="button"
                                            className="px-4 py-3 hover:bg-slate-600 transition-colors"
                                            onClick={() => setQuantity((q) => Math.min(9999, (q || 1) + 1))}
                                            aria-label="Increase quantity"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="text-lg font-semibold text-slate-200">
                                        Total: <span className="text-emerald-400">{formatMoney(unitPrice * safeQty, selected?.currency || 'PHP')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced File Upload */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-200">Upload Files</label>
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
                                    className="border-2 border-dashed border-slate-600 bg-slate-700/30 rounded-2xl p-6 text-center hover:bg-slate-700/50 transition-all duration-200 backdrop-blur-sm"
                                >
                                    <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-slate-300 mb-2 font-medium">Drag & drop files here</p>
                                    <p className="text-slate-400 text-sm mb-4">Supports: SVG, PDF, DOC, JPG, PNG, GIF, WEBP</p>
                                    <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-600 hover:bg-slate-500 border border-slate-500 cursor-pointer text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Browse Files
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
                                {files.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {files.map((f, idx) => (
                                            <div key={idx} className="relative rounded-xl border border-slate-600 bg-slate-700 p-3 group backdrop-blur-sm">
                                                {f.preview ? (
                                                    <div className="aspect-square rounded-lg overflow-hidden">
                                                        <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-square rounded-lg bg-slate-600 flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="mt-2 text-xs text-slate-300 truncate" title={f.file.name}>
                                                    {f.file.name}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 border border-white/20 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
                            </div>

                            {/* Enhanced Notes */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-200">Additional Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Add any special instructions or requirements for your order..."
                                    className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder:text-slate-400 transition-all duration-200 backdrop-blur-sm"
                                />
                            </div>

                            {/* Enhanced Actions */}
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold disabled:opacity-60 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105"
                                    disabled={submitting}
                                    onClick={addToCart}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Adding to Cart...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add to Cart
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="relative z-10 mx-auto max-w-4xl w-[95%] rounded-3xl border border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
                        {/* Enhanced Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600 bg-slate-800/50 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                    <ShoppingCartIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Shopping Cart</h2>
                                    <p className="text-slate-400 text-sm">{cart.length} item{cart.length !== 1 ? 's' : ''} in your cart</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCart(false)}
                                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors hover:scale-105"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-96 overflow-y-auto">
                            {cart.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <ShoppingCartIcon className="h-10 w-10 text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Your cart is empty</h3>
                                    <p className="text-slate-400">Add some services to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item, index) => (
                                        <div key={index} className="border border-slate-600 rounded-2xl p-5 bg-slate-700/30 backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-200">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <h3 className="text-lg font-semibold text-white">{item.service.name}</h3>
                                                        <div className="text-right ml-4">
                                                            <div className="text-lg font-bold text-emerald-400">
                                                                {formatMoney(
                                                                    (item.service.basePrice + item.selectedOptions.reduce((sum, opt) => {
                                                                        const variant = item.service.variants?.find(v => v.label === opt.variantLabel);
                                                                        const optionData = variant?.options.find(o => o.name === opt.optionName);
                                                                        return sum + (optionData?.priceDelta || 0);
                                                                    }, 0)) * item.quantity,
                                                                    item.service.currency
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-slate-300">
                                                                {formatMoney(
                                                                    item.service.basePrice + item.selectedOptions.reduce((sum, opt) => {
                                                                        const variant = item.service.variants?.find(v => v.label === opt.variantLabel);
                                                                        const optionData = variant?.options.find(o => o.name === opt.optionName);
                                                                        return sum + (optionData?.priceDelta || 0);
                                                                    }, 0),
                                                                    item.service.currency
                                                                )} × {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {item.selectedOptions.length > 0 && (
                                                        <div className="mb-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.selectedOptions.map((option, optIndex) => (
                                                                    <span key={optIndex} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-sm border border-blue-400/30">
                                                                        {option.variantLabel}: {option.optionName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.selectedSizes && item.selectedSizes.length > 0 && (
                                                        <div className="mb-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.selectedSizes.map((s, i) => (
                                                                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-sm border border-purple-400/30">
                                                                        Size: {s.sizeName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-6 text-sm text-slate-300">
                                                        <span>Quantity: {item.quantity}</span>
                                                        <span>Unit: {item.service.unit}</span>
                                                        <span>Files: {item.files.length}</span>
                                                        {item.notes && (
                                                            <span className="text-slate-400">Notes: {item.notes}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enhanced Quantity Controls */}
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                                        className="w-8 h-8 rounded-lg bg-slate-600 hover:bg-slate-500 flex items-center justify-center transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                                                    <button 
                                                        onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                                        className="w-8 h-8 rounded-lg bg-slate-600 hover:bg-slate-500 flex items-center justify-center transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(index)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/30 transition-all duration-200"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-600 bg-slate-800/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-2xl font-bold text-white">
                                        Total: {formatMoney(cartTotal)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={clearCart}
                                        className="flex-1 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 font-medium"
                                    >
                                        Clear Cart
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!derivedStoreId) return;
                                            // If bulk (>2000) require downpayment first
                                            if (cartTotal > 2000) {
                                                setShowDownPaymentModal(true);
                                                return;
                                            }
                                            // otherwise place orders normally
                                            await submitOrders();
                                        }}
                                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold disabled:opacity-60 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Placing Orders...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Place Order ({formatMoney(cartTotal)})
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Down Payment Modal for bulk orders (>2000) */}
            {showDownPaymentModal && (
                <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDownPaymentModal(false)} />
                    <div className="relative z-10 max-w-lg w-full rounded-3xl border border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600 bg-slate-800/50 backdrop-blur-sm">
                            <div className="text-lg font-bold">Down Payment Required</div>
                            <button type="button" onClick={() => setShowDownPaymentModal(false)} className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-sm text-slate-300">Bulk order detected. For orders over ₱2,000 a down payment is required.</div>
                            <div className="p-4 rounded-2xl bg-slate-700/30 border border-slate-600">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-slate-300">Order Total</div>
                                    <div className="text-lg font-bold">{formatMoney(cartTotal)}</div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-300">Required Down Payment (1/2)</div>
                                    <div className="text-lg font-bold text-emerald-400">{formatMoney(Math.round((cartTotal / 2) * 100) / 100)}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-200">Payment Method</label>
                                <select value={dpMethod} onChange={(e) => setDpMethod(e.target.value as 'gcash'|'bank_transfer'|'other')} className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-3 text-white">
                                    <option value="gcash">GCash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-200">Upload Receipt</label>
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        const fl = Array.from(e.dataTransfer.files || []);
                                        if (!fl.length) return;
                                        const file = fl[0];
                                        if (!file) return;
                                        handleDpFile(file);
                                    }}
                                    className="relative border-2 border-dashed border-slate-600 bg-slate-700/30 rounded-2xl p-8 min-h-[180px] text-center hover:bg-slate-700/50 transition-all duration-200 backdrop-blur-sm flex items-center justify-center gap-4 cursor-pointer"
                                >
                                    {/* Content (visual) sits below the invisible input so clicks open file picker; remove button sits above input */}
                                    <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                                        {dpReceiptFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                {dpReceiptPreview ? (
                                                    <img src={dpReceiptPreview} alt={dpReceiptFile.name} className="w-36 h-36 object-cover rounded-lg border border-slate-600" />
                                                ) : (
                                                    <div className="w-36 h-36 rounded-lg bg-slate-600 flex items-center justify-center text-sm text-slate-300 border border-slate-600">{dpReceiptFile.name.split('.').pop()?.toUpperCase() || 'FILE'}</div>
                                                )}
                                                <div className="text-sm text-slate-200 truncate max-w-[260px]" title={dpReceiptFile.name}>{dpReceiptFile.name}</div>
                                            </div>
                                        ) : (
                                            <>
                                                <svg className="w-14 h-14 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-200">Drag & drop receipt here</div>
                                                    <div className="text-xs text-slate-400">Supports: JPG, PNG, PDF</div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Invisible full-size file input so the whole dropbox is clickable; placed above visual but below the remove button */}
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        onChange={(e) => handleDpFile(e.target.files ? e.target.files[0] : null)}
                                    />

                                    {/* Remove button sits on top so it remains clickable when preview shown */}
                                    {dpReceiptFile && (
                                        <button type="button" onClick={() => handleDpFile(null)} className="absolute top-3 right-3 z-30 text-red-400 hover:text-red-300 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-200">Reference Number</label>
                                <input value={dpReference} onChange={(e) => setDpReference(e.target.value)} className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-3 text-white" placeholder="e.g. GCash reference or bank transaction ID" />
                            </div>

                                <div className="flex items-center gap-3 pt-2">
                                <button onClick={() => setShowDownPaymentModal(false)} className="flex-1 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all">Cancel</button>
                                <button disabled={!dpReceiptFile} onClick={async () => {
                                    if (!dpReceiptFile) {
                                        setNotif({ type: 'error', message: 'Please upload a receipt to proceed.' });
                                        return;
                                    }
                                    setShowDownPaymentModal(false);
                                    await submitOrders({ required: true, amount: Math.round((cartTotal / 2) * 100) / 100, method: dpMethod, reference: dpReference, receipt: dpReceiptFile });
                                }} className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold disabled:opacity-50">Submit</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Payment Confirmation Modal */}
            {showPaymentModal && paymentOrderId && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative z-10 max-w-md w-full rounded-3xl border border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600 bg-slate-800/50 backdrop-blur-sm">
                            <div className="text-xl font-bold">
                                Order Status
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Status Display */}
                            <div className="text-center">
                                <div className="text-sm text-slate-400 mb-2">Current Status</div>
                                <div className={`text-2xl font-bold ${
                                    watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed' 
                                        ? 'text-emerald-400' 
                                        : 'text-blue-400'
                                }`}>
                                    {watchedOrderStatus === 'pending' && 'Waiting for Confirmation'}
                                    {watchedOrderStatus === 'processing' && 'Being Prepared'}
                                    {watchedOrderStatus === 'ready' && 'Ready for Pickup!'}
                                    {watchedOrderStatus === 'completed' && 'Order Completed'}
                                    {watchedOrderStatus === 'cancelled' && 'Order Cancelled'}
                                </div>
                            </div>

                            {/* QR Code / Receipt */}
                            {(watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed') && (
                                <div className="space-y-4">
                                    {watchedOrderStatus === 'ready' && (
                                        <div className="text-center">
                                            <div className="text-sm text-slate-300 mb-3">Show this QR code at pickup</div>
                                            <div className="flex items-center justify-center p-4 bg-white rounded-2xl shadow-2xl">
                                                <QRCodeCanvas 
                                                    value={`ORDER:${paymentOrderId}`} 
                                                    size={180} 
                                                    includeMargin 
                                                    className="rounded-lg"
                                                />
                                            </div>
                                            <div className="text-xs text-slate-400 mt-3">
                                                Present this QR code to collect your order
                                            </div>
                                        </div>
                                    )}
                                    {watchedOrderStatus === 'completed' && receiptUrl && (
                                        <div className="text-center">
                                            <div className="text-sm text-slate-300 mb-3">Your receipt is ready</div>
                                            <a 
                                                href={receiptUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                View Receipt
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-full px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 font-medium"
                                >
                                    Close
                                </button>
                                {(watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed') && (
                                    <button 
                                        onClick={() => setShowPaymentModal(false)}
                                        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        {watchedOrderStatus === 'ready' ? 'Got It, Pick Up Soon!' : 'View Order History'}
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