import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { FunnelIcon, ShoppingCartIcon, TrashIcon, XMarkIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { QRCodeCanvas } from 'qrcode.react';
import { getServiceStockInfo, getStockForService, checkStockAvailability, getMaxAllowedQuantity } from '../../../lib/inventoryApi';

// Theme Variables for consistent dark/light mode - WHITE THEME
const PANEL_SURFACE = "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const SOFT_PANEL = "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const INPUT_SURFACE = "rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400";
const MUTED_TEXT = "text-gray-600 dark:text-gray-300";
const MUTED_TEXT_LIGHT = "text-gray-500 dark:text-gray-400";
const BACKGROUND_GRADIENT = "bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800";
const CARD_BACKGROUND = "bg-white dark:bg-gray-800";
const CARD_BORDER = "border border-gray-200 dark:border-gray-700";
const CARD_HOVER = "hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl transition-all duration-300";
const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700";
const BUTTON_SECONDARY = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500";
const BUTTON_FILTER_ACTIVE = "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
const BUTTON_FILTER_INACTIVE = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700";
const STATS_CARD = "bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700";
const MODAL_OVERLAY = "bg-black/50 dark:bg-black/70";
const IMAGE_BACKGROUND = "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900";
const DROPZONE_BORDER = "border border-gray-300 dark:border-gray-600";
const DROPZONE_HOVER = "hover:border-blue-400 dark:hover:border-blue-500";
const DROPZONE_ACTIVE = "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20";

type Service = {
    _id: string;
    name: string;
    description?: string;
    basePrice: number;
    unit: 'per page' | 'per sq ft' | 'per item' | string;
    currency?: string;
    imageFileId?: unknown;
    active?: boolean;
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

type ServiceWithStock = Service & {
  stockInfo?: {
    hasStockLimit: boolean;
    availableStock: number | null;
    maxAllowedQuantity: number;
    inventoryItemName: string | null;
    inventoryPerUnit: number;
  };
};

type CartItem = {
    service: ServiceWithStock;
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

// ✅ UPDATED: Get stock badge class with proper dark mode support
const getStockBadgeClass = (availableStock: number | null, hasStockLimit: boolean) => {
  if (!hasStockLimit || availableStock === null) {
    return "bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700";
  }
  
  if (availableStock === 0) {
    return "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700";
  }
  
  if (availableStock <= 10) {
    return "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700";
  }
  
  return "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700";
};

// ✅ UPDATED: Format stock display with dark mode support
const formatStockDisplay = (availableStock: number | null, hasStockLimit: boolean) => {
  if (!hasStockLimit || availableStock === null) {
    return <span className="text-green-700 dark:text-green-300 font-medium">Unlimited Stock</span>;
  }
  
  if (availableStock === 0) {
    return <span className="text-red-700 dark:text-red-300 font-medium">Out of Stock</span>;
  }
  
  if (availableStock <= 10) {
    return <span className="text-amber-700 dark:text-amber-300 font-medium">Low Stock: {availableStock}</span>;
  }
  
  return <span className="text-emerald-700 dark:text-emerald-300 font-medium">In Stock: {availableStock}</span>;
};

export default function OrderPage() {
    const { token, continueAsGuest } = useAuth();
    const location = useLocation() as { state: LocationState };
    const params = useParams<{ storeId?: string }>();

    const derivedStoreId = useMemo(() => {
        return (
            location?.state?.storeId ||
            params.storeId ||
            (typeof window !== 'undefined' ? localStorage.getItem('selectedStoreId') || undefined : undefined)
        );
    }, [location?.state?.storeId, params.storeId]);

    useEffect(() => {
        if (derivedStoreId && typeof window !== 'undefined') {
            localStorage.setItem('selectedStoreId', derivedStoreId);
        }
    }, [derivedStoreId]);

    const [services, setServices] = useState<ServiceWithStock[]>([]);
    const [bestSellingIds, setBestSellingIds] = useState<Set<string>>(new Set());
    const [bestSellingNames, setBestSellingNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingStock, setLoadingStock] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    
    const [showFilters, setShowFilters] = useState(false);
    const filterAnchorRef = useRef<HTMLDivElement | null>(null);
    const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null);
    const [sortKey, setSortKey] = useState<'name' | 'price'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [selected, setSelected] = useState<ServiceWithStock | null>(null);
    const [variantChoices, setVariantChoices] = useState<Record<string, number>>({});
    const [quantity, setQuantity] = useState<number>(1);
    const [maxQuantity, setMaxQuantity] = useState<number>(9999);
    const [files, setFiles] = useState<Array<{ file: File; preview?: string }>>([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
    const [watchedOrderStatus, setWatchedOrderStatus] = useState<OrderStatusLocal | null>(null);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    
    const [showDownPaymentModal, setShowDownPaymentModal] = useState(false);
    const [dpMethod, setDpMethod] = useState<'gcash' | 'bank_transfer' | 'other'>('gcash');
    const [dpReceiptFile, setDpReceiptFile] = useState<File | null>(null);
    const [dpReceiptPreview, setDpReceiptPreview] = useState<string | null>(null);
    const [dpReference, setDpReference] = useState('');

    const [inventoryCache, setInventoryCache] = useState<Record<string, any>>({});
    const [sizeChoice, setSizeChoice] = useState<Record<string, string>>({});

    const [notif, setNotif] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

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

    const safeQty = useMemo(() => {
        if (!selected) return 1;
        const qty = quantity || 1;
        return Math.min(maxQuantity, Math.max(1, qty));
    }, [quantity, maxQuantity, selected]);

    const fetchStockInfo = async (storeId: string, serviceList: Service[]) => {
        try {
            setLoadingStock(true);
            const stockData = await getServiceStockInfo(storeId);
            
            if (stockData.success && stockData.stockInfo) {
                const enrichedServices = serviceList.map(service => {
                    const stockInfo = stockData.stockInfo.find(
                        (stock: any) => stock.serviceId === service._id
                    );
                    
                    return {
                        ...service,
                        stockInfo: stockInfo ? {
                            hasStockLimit: stockInfo.hasStockLimit,
                            availableStock: stockInfo.availableStock,
                            maxAllowedQuantity: Math.max(0, stockInfo.maxAllowedQuantity),
                            inventoryItemName: stockInfo.inventoryItemName,
                            inventoryPerUnit: stockInfo.inventoryPerUnit || 1
                        } : undefined
                    };
                });
                
                setServices(enrichedServices);
            }
        } catch (error) {
            console.error('Error fetching stock info:', error);
            setServices(serviceList);
        } finally {
            setLoadingStock(false);
        }
    };

    useEffect(() => {
        const checkSelectedServiceStock = async () => {
            if (!selected || !derivedStoreId) return;
            
            try {
                const maxQty = await getMaxAllowedQuantity(derivedStoreId, selected._id);
                setMaxQuantity(maxQty);
                
                if (quantity > maxQty) {
                    setQuantity(maxQty);
                }
            } catch (error) {
                console.error('Error checking service stock:', error);
                setMaxQuantity(9999);
            }
        };
        
        checkSelectedServiceStock();
    }, [selected, derivedStoreId, quantity]);

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
                
                const serviceList = res.data || [];
                setServices(serviceList);
                
                await fetchStockInfo(derivedStoreId, serviceList);
                
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
                api.get(`/services/store/${derivedStoreId}`)
                    .then(res => fetchStockInfo(derivedStoreId, res.data || []))
                    .catch(console.error);
            }
        };
        
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            active = false;
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [derivedStoreId]);

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

    const validateStockBeforeAdd = async (service: ServiceWithStock, qty: number, selectedOptions: any[]) => {
        if (!derivedStoreId) return true;
        
        try {
            const stockCheck = await checkStockAvailability({
                storeId: derivedStoreId,
                serviceId: service._id,
                quantity: qty,
                selectedOptions: selectedOptions.map(opt => ({
                    label: opt.variantLabel,
                    optionIndex: service.variants?.find(v => v.label === opt.variantLabel)?.options.findIndex(o => o.name === opt.optionName) || 0
                }))
            });
            
            return stockCheck.canFulfill;
        } catch (error) {
            console.error('Stock validation error:', error);
            return false;
        }
    };

    const addToCart = async () => {
        if (!selected) return;

        const isActive = selected.active !== false;
        const hasStock = !selected.stockInfo?.hasStockLimit || 
                        (selected.stockInfo?.availableStock !== null && 
                         selected.stockInfo.availableStock > 0);
        
        if (!isActive || (selected.stockInfo?.hasStockLimit && !hasStock)) {
            setNotif({ 
                type: 'error', 
                message: selected.stockInfo?.availableStock === 0 
                    ? 'This item is out of stock.' 
                    : 'This item is not available.' 
            });
            return;
        }

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

        const canAddToCart = await validateStockBeforeAdd(selected, quantity, selectedOptions);
        if (!canAddToCart) {
            setNotif({ 
                type: 'error', 
                message: `Cannot add to cart: Insufficient stock. Maximum allowed: ${maxQuantity}` 
            });
            return;
        }

        const cartItem: CartItem = {
            service: selected,
            quantity: safeQty,
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
        
        if (derivedStoreId) {
            setTimeout(() => {
                api.get(`/services/store/${derivedStoreId}`)
                    .then(res => fetchStockInfo(derivedStoreId, res.data || []))
                    .catch(console.error);
            }, 500);
        }
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateCartItemQuantity = (index: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(index);
            return;
        }
        
        const item = cart[index];
        if (item.service.stockInfo?.hasStockLimit) {
            const maxAllowed = item.service.stockInfo.maxAllowedQuantity;
            if (newQuantity > maxAllowed) {
                setNotif({ 
                    type: 'error', 
                    message: `Maximum allowed quantity is ${maxAllowed}` 
                });
                newQuantity = maxAllowed;
            }
        }
        
        setCart(prev => prev.map((item, i) => 
            i === index ? { ...item, quantity: newQuantity } : item
        ));
    };

    const clearCart = () => {
        setCart([]);
    };

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
            
            if (derivedStoreId) {
                setTimeout(() => {
                    api.get(`/services/store/${derivedStoreId}`)
                        .then(res => fetchStockInfo(derivedStoreId, res.data || []))
                        .catch(console.error);
                }, 1000);
            }
        } catch (e: any) {
            console.error('submitOrders error', e);
            const errorMessage = e.response?.data?.message || 'Failed to place order(s).';
            
            if (errorMessage.includes('stock') || errorMessage.includes('available') || errorMessage.includes('quantity')) {
                setNotif({ 
                    type: 'error', 
                    message: `Order failed: ${errorMessage}. Please adjust quantities and try again.` 
                });
                
                if (derivedStoreId) {
                    api.get(`/services/store/${derivedStoreId}`)
                        .then(res => fetchStockInfo(derivedStoreId, res.data || []))
                        .catch(console.error);
                }
            } else {
                setNotif({ type: 'error', message: errorMessage });
            }
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

    useEffect(() => {
        if (notif) {
            const timer = setTimeout(() => setNotif(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [notif]);

    return (
        <div className={`${BACKGROUND_GRADIENT} min-h-screen`}>
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

            <div className="pt-8 pb-6 relative z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-wide mb-3">
                          SELECT A PRODUCT SERVICE
                        </h1>
                        <p className={`${MUTED_TEXT} text-lg max-w-2xl mx-auto leading-relaxed`}>
                            Transform your ideas into stunning prints with our professional services
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <div className="relative flex-1 max-w-2xl">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search services by name, description, or unit..."
                                    className={`block w-full h-14 rounded-2xl ${CARD_BACKGROUND} backdrop-blur-sm border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg shadow-lg transition-all duration-200`}
                                    aria-label="Search services"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="relative z-[60]" ref={filterAnchorRef}>
                                    <button
                                        onClick={() => setShowFilters((v) => !v)}
                                        className={`inline-flex items-center justify-center gap-3 px-6 h-14 rounded-2xl ${CARD_BACKGROUND} backdrop-blur-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-all duration-200 shadow-lg hover:shadow-xl`}
                                        aria-haspopup="true"
                                        aria-expanded={showFilters}
                                    >
                                        <FunnelIcon className="h-5 w-5" /> 
                                        <span className="font-medium">Filter & Sort</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowCart(true)}
                                    className={`relative inline-flex items-center justify-center gap-3 px-6 h-14 rounded-2xl ${BUTTON_PRIMARY} border border-blue-500 dark:border-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl group`}
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

                    {showFilters && filterPos && createPortal(
                        <div
                            className={`w-80 rounded-2xl border border-gray-300 dark:border-gray-600 ${PANEL_SURFACE} backdrop-blur-sm p-6 z-[1000] shadow-2xl animate-fade-in`}
                            style={{ position: 'fixed', top: `${filterPos.top}px`, left: `${filterPos.left}px` }}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="text-lg font-bold text-gray-900 dark:text-white">Sort Options</div>
                                <button 
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                    onClick={() => setShowFilters(false)}
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sort by</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => { setSortKey('name'); setSortDir('asc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='name'&&sortDir==='asc' 
                                                    ? 'border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Name A–Z</div>
                                        </button>
                                        <button
                                            onClick={() => { setSortKey('name'); setSortDir('desc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='name'&&sortDir==='desc' 
                                                    ? 'border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Name Z–A</div>
                                        </button>
                                        <button
                                            onClick={() => { setSortKey('price'); setSortDir('asc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='price'&&sortDir==='asc' 
                                                    ? 'border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Price Low–High</div>
                                        </button>
                                        <button
                                            onClick={() => { setSortKey('price'); setSortDir('desc'); }}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 group ${
                                                sortKey==='price'&&sortDir==='desc' 
                                                    ? 'border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 shadow-lg shadow-blue-500/25' 
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="text-sm font-medium">Price High–Low</div>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-medium"
                                        onClick={() => { setSortKey('name'); setSortDir('asc'); }}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        className={`px-5 py-2.5 rounded-lg ${BUTTON_PRIMARY} transition-colors font-medium shadow-lg`}
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

            <div className="pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {!derivedStoreId && (
                        <div className="text-center py-20">
                            <div className={`${PANEL_SURFACE} backdrop-blur-sm p-12 max-w-2xl mx-auto shadow-2xl`}>
                                <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Shop Selected</h3>
                                <p className={`${MUTED_TEXT} text-lg mb-8`}>Please choose a shop to explore our premium printing services</p>
                                <Link 
                                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl ${BUTTON_PRIMARY} font-semibold hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-200 transform hover:scale-105`}
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
                                        <div className={`${MUTED_TEXT} text-lg font-medium`}>Loading premium services...</div>
                                    </div>
                                </div>
                            )}
                            
                            {error && (
                                <div className="text-center py-16">
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-2xl mx-auto backdrop-blur-sm">
                                        <svg className="w-14 h-14 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-red-600 dark:text-red-400 text-xl font-bold mb-2">Unable to Load Services</div>
                                        <div className="text-red-500 dark:text-red-300">{error}</div>
                                    </div>
                                </div>
                            )}
                            
                            {!loading && !error && (
                                <>
                                    {filtered.length === 0 ? (
                                        <div className="text-center py-20">
                                            <div className={`${PANEL_SURFACE} backdrop-blur-sm p-12 max-w-2xl mx-auto shadow-2xl`}>
                                                <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Services Found</h3>
                                                <p className={MUTED_TEXT}>Try adjusting your search or filter criteria</p>
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
                                                
                                                const isActive = svc.active !== false;
                                                const hasStock = !svc.stockInfo?.hasStockLimit || 
                                                                (svc.stockInfo?.availableStock !== null && 
                                                                 svc.stockInfo.availableStock > 0);
                                                const canOrder = isActive && hasStock;

                                                return (
                                                    <div 
                                                        key={svc._id} 
                                                        className={`group cursor-pointer transition-all duration-300 h-full flex flex-col ${canOrder ? 'hover:scale-[1.02]' : 'opacity-75 grayscale'}`}
                                                        onClick={() => {
                                                            if (!canOrder) return;
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
                                                        <div className={`${CARD_BACKGROUND} rounded-2xl ${CARD_BORDER} overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col group-hover:border-blue-300 dark:group-hover:border-blue-600`}>
                                                            <div className={`relative aspect-[4/3] ${IMAGE_BACKGROUND} overflow-hidden`}>
                                                                {imgSrc ? (
                                                                    <img 
                                                                        src={imgSrc} 
                                                                        alt={`${svc.name} image`} 
                                                                        className={`w-full h-full object-cover transition-transform duration-500 ${canOrder ? 'group-hover:scale-110' : ''}`}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                
                                                                {!canOrder && (
                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                                                        <span className="px-4 py-2 bg-gray-800/90 dark:bg-gray-900/90 text-gray-300 dark:text-gray-400 rounded-lg font-bold border border-gray-600 dark:border-gray-700">
                                                                            {!isActive ? 'UNAVAILABLE' : 'OUT OF STOCK'}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {canOrder && isBest && (
                                                                    <div className="absolute top-3 left-3">
                                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                                            </svg>
                                                                            BEST SELLER
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="absolute bottom-3 right-3">
                                                                    <div className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20 shadow-lg">
                                                                        <div className="text-lg font-bold text-white">
                                                                            {formatMoney(svc.basePrice, svc.currency || 'PHP')}
                                                                        </div>
                                                                        {svc.unit && (
                                                                            <div className="text-xs text-gray-300 dark:text-gray-400 text-center">{svc.unit}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {svc.stockInfo?.hasStockLimit && (
                                                                    <div className="absolute top-3 right-3">
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm border ${getStockBadgeClass(svc.stockInfo.availableStock, svc.stockInfo.hasStockLimit)}`}>
                                                                            {svc.stockInfo.availableStock === 0 ? (
                                                                                <NoSymbolIcon className="w-3 h-3" />
                                                                            ) : (
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                                                </svg>
                                                                            )}
                                                                            {svc.stockInfo.availableStock === 0 ? 'SOLD OUT' : 
                                                                             svc.stockInfo.availableStock && svc.stockInfo.availableStock <= 10 ? `LOW: ${svc.stockInfo.availableStock}` : 
                                                                             svc.stockInfo.availableStock ? `STOCK: ${svc.stockInfo.availableStock}` : ''}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="p-5 flex-1 flex flex-col">
                                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{svc.name}</h3>
                                                                {svc.description && (
                                                                    <p className={`${MUTED_TEXT} text-sm line-clamp-3 mb-4 flex-1`}>{svc.description}</p>
                                                                )}
                                                                
                                                                {svc.stockInfo && (
                                                                    <div className="mb-3">
                                                                        <div className={`text-sm ${svc.stockInfo.hasStockLimit ? 
                                                                            (svc.stockInfo.availableStock === 0 ? 'text-red-700 dark:text-red-300' : 
                                                                             svc.stockInfo.availableStock && svc.stockInfo.availableStock <= 10 ? 'text-amber-700 dark:text-amber-300' : 
                                                                             'text-emerald-700 dark:text-emerald-300') : 
                                                                            'text-green-700 dark:text-green-300'}`}>
                                                                            {formatStockDisplay(svc.stockInfo.availableStock, svc.stockInfo.hasStockLimit)}
                                                                            {svc.stockInfo.inventoryItemName && (
                                                                                <span className={`text-xs ${MUTED_TEXT_LIGHT} ml-1`}>
                                                                                    ({svc.stockInfo.inventoryItemName})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {svc.variants && svc.variants.length > 0 && (
                                                                    <div className="mb-4">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {svc.variants.map((variant, vIdx) => (
                                                                                <span key={vIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-200 text-xs border border-blue-400/30">
                                                                                    {variant.label}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                                                                    <button 
                                                                        disabled={!canOrder}
                                                                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                                                                            canOrder 
                                                                            ? `${BUTTON_PRIMARY} hover:shadow-xl transform hover:scale-105` 
                                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-600'
                                                                        }`}
                                                                    >
                                                                        {canOrder ? 'Customize & Order' : 
                                                                         !isActive ? 'Unavailable' : 'Out of Stock'}
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

            {selected && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${MODAL_OVERLAY} backdrop-blur-sm`} onClick={() => setSelected(null)} />
                    <div className={`relative z-10 mx-auto max-w-4xl w-[95%] rounded-3xl ${PANEL_SURFACE} shadow-2xl overflow-hidden`}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
                                    <p className={`${MUTED_TEXT} text-sm`}>Customize your {selected.name} order</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setSelected(null)}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors hover:scale-105"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className={`flex items-start gap-6 p-5 rounded-2xl ${SOFT_PANEL} backdrop-blur-sm`}>
                                <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-lg">
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
                                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        );
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{selected.name}</h3>
                                            {selected.unit && (
                                                <div className={`text-sm ${MUTED_TEXT}`}>{selected.unit}</div>
                                            )}
                                            {selected.description && (
                                                <p className={`${MUTED_TEXT_LIGHT} text-sm mt-2`}>{selected.description}</p>
                                            )}
                                            
                                            {selected.stockInfo && (
                                                <div className="mt-3">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStockBadgeClass(selected.stockInfo.availableStock, selected.stockInfo.hasStockLimit)}`}>
                                                                        {selected.stockInfo.availableStock === 0 ? (
                                                                            <NoSymbolIcon className="w-3.5 h-3.5" />
                                                                        ) : (
                                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                                            </svg>
                                                                        )}
                                                                        {formatStockDisplay(selected.stockInfo.availableStock, selected.stockInfo.hasStockLimit)}
                                                                        {selected.stockInfo.inventoryItemName && (
                                                                            <span className="text-xs ml-1 dark:text-gray-300">({selected.stockInfo.inventoryItemName})</span>
                                                                        )}
                                                                    </div>
                                                    {selected.stockInfo.hasStockLimit && selected.stockInfo.availableStock !== null && selected.stockInfo.availableStock > 0 && (
                                                        <div className={`text-xs ${MUTED_TEXT_LIGHT} mt-1`}>
                                                            Maximum order quantity: {selected.stockInfo.maxAllowedQuantity}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatMoney(unitPrice * safeQty, selected.currency || 'PHP')}
                                            </div>
                                            <div className={`text-sm ${MUTED_TEXT}`}>
                                                {formatMoney(unitPrice, selected.currency || 'PHP')} × {safeQty}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {(selected.variants || []).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customization Options</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(selected.variants || []).map((v) => (
                                            <div key={v.label} className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{v.label}</label>
                                                <select
                                                    value={variantChoices[v.label] ?? 0}
                                                    onChange={(e) => setVariantChoices((prev) => ({ ...prev, [v.label]: Number(e.target.value) }))}
                                                    className={`w-full rounded-xl ${INPUT_SURFACE} px-4 py-3 backdrop-blur-sm`}
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

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Quantity</label>
                                    {selected.stockInfo?.hasStockLimit && selected.stockInfo.availableStock !== null && (
                                        <div className={`text-sm ${selected.stockInfo.availableStock <= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            Available: {selected.stockInfo.maxAllowedQuantity}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="inline-flex items-stretch rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 overflow-hidden shadow-lg">
                                        <button
                                            type="button"
                                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
                                            onClick={() => setQuantity((q) => Math.max(1, (q || 1) - 1))}
                                            disabled={quantity <= 1}
                                            aria-label="Decrease quantity"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            max={maxQuantity}
                                            value={quantity}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                const max = selected.stockInfo?.maxAllowedQuantity || 9999;
                                                const clamped = Math.min(max, Math.max(1, Number.isFinite(val) ? val : 1));
                                                setQuantity(clamped);
                                            }}
                                            onBlur={(e) => {
                                                const val = Number(e.target.value);
                                                const max = selected.stockInfo?.maxAllowedQuantity || 9999;
                                                const clamped = Math.min(max, Math.max(1, Number.isFinite(val) ? val : 1));
                                                setQuantity(clamped);
                                            }}
                                            className="no-spinner w-20 text-center bg-transparent focus:outline-none font-medium text-lg text-gray-900 dark:text-white"
                                            aria-label="Quantity"
                                        />
                                        <button
                                            type="button"
                                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
                                            onClick={() => setQuantity((q) => {
                                                const max = selected.stockInfo?.maxAllowedQuantity || 9999;
                                                return Math.min(max, (q || 1) + 1);
                                            })}
                                            disabled={quantity >= maxQuantity}
                                            aria-label="Increase quantity"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                        Total: <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(unitPrice * safeQty, selected?.currency || 'PHP')}</span>
                                    </div>
                                </div>
                                {selected.stockInfo?.hasStockLimit && quantity >= maxQuantity && maxQuantity > 0 && (
                                    <div className={`text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800`}>
                                        Maximum quantity reached ({maxQuantity}). You cannot order more than available stock.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Upload Files</label>
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
                                    className={`${DROPZONE_BORDER} ${DROPZONE_HOVER} border-2 border-dashed bg-gray-50/30 dark:bg-gray-700/30 rounded-2xl p-6 text-center backdrop-blur-sm transition-all duration-200`}
                                >
                                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className={`${MUTED_TEXT} mb-2 font-medium`}>Drag & drop files here</p>
                                    <p className={`${MUTED_TEXT_LIGHT} text-sm mb-4`}>Supports: SVG, PDF, DOC, JPG, PNG, GIF, WEBP</p>
                                    <label className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${BUTTON_SECONDARY} cursor-pointer font-medium transition-all duration-200 shadow-lg hover:shadow-xl`}>
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
                                            <div key={idx} className={`relative rounded-xl border border-gray-300 dark:border-gray-600 ${CARD_BACKGROUND} p-3 group backdrop-blur-sm`}>
                                                {f.preview ? (
                                                    <div className="aspect-square rounded-lg overflow-hidden">
                                                        <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className={`aspect-square rounded-lg ${IMAGE_BACKGROUND} flex items-center justify-center`}>
                                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 truncate" title={f.file.name}>
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

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Additional Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Add any special instructions or requirements for your order..."
                                    className={`w-full rounded-xl ${INPUT_SURFACE} px-4 py-3 backdrop-blur-sm`}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className={`px-6 py-3 rounded-xl ${BUTTON_SECONDARY} transition-all duration-200 font-medium`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`px-8 py-3 rounded-xl ${BUTTON_PRIMARY} font-semibold disabled:opacity-60 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105`}
                                    disabled={submitting || (selected.stockInfo?.hasStockLimit && selected.stockInfo.availableStock === 0)}
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
                                            {selected.stockInfo?.hasStockLimit && selected.stockInfo.availableStock === 0 
                                                ? 'Out of Stock' 
                                                : 'Add to Cart'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCart && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${MODAL_OVERLAY} backdrop-blur-sm`} onClick={() => setShowCart(false)} />
                    <div className={`relative z-10 mx-auto max-w-4xl w-[95%] rounded-3xl ${PANEL_SURFACE} shadow-2xl overflow-hidden`}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                    <ShoppingCartIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shopping Cart</h2>
                                    <p className={`${MUTED_TEXT} text-sm`}>{cart.length} item{cart.length !== 1 ? 's' : ''} in your cart</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCart(false)}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors hover:scale-105"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-96 overflow-y-auto">
                            {cart.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <ShoppingCartIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
                                    <p className={MUTED_TEXT}>Add some services to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item, index) => (
                                        <div key={index} className={`border border-gray-300 dark:border-gray-600 rounded-2xl p-5 ${SOFT_PANEL} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.service.name}</h3>
                                                            {item.service.stockInfo && (
                                                                <div className={`text-xs mt-1 ${item.service.stockInfo.hasStockLimit ? 
                                                                    (item.service.stockInfo.availableStock === 0 ? 'text-red-700 dark:text-red-300' : 
                                                                     'text-emerald-700 dark:text-emerald-300') : 
                                                                    'text-green-700 dark:text-green-300'}`}>
                                                                    {formatStockDisplay(item.service.stockInfo.availableStock, item.service.stockInfo.hasStockLimit)}
                                                                    {item.service.stockInfo.inventoryItemName && (
                                                                        <span className={`text-xs ${MUTED_TEXT_LIGHT} ml-1`}>
                                                                            ({item.service.stockInfo.inventoryItemName})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                                {formatMoney(
                                                                    (item.service.basePrice + item.selectedOptions.reduce((sum, opt) => {
                                                                        const variant = item.service.variants?.find(v => v.label === opt.variantLabel);
                                                                        const optionData = variant?.options.find(o => o.name === opt.optionName);
                                                                        return sum + (optionData?.priceDelta || 0);
                                                                    }, 0)) * item.quantity,
                                                                    item.service.currency
                                                                )}
                                                            </div>
                                                            <div className={`text-sm ${MUTED_TEXT}`}>
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
                                                                    <span key={optIndex} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-200 text-sm border border-blue-400/30">
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
                                                                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-200 text-sm border border-purple-400/30">
                                                                        Size: {s.sizeName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                                                        <span>Quantity: {item.quantity}</span>
                                                        <span>Unit: {item.service.unit}</span>
                                                        <span>Files: {item.files.length}</span>
                                                        {item.notes && (
                                                            <span className="text-gray-500 dark:text-gray-400">Notes: {item.notes}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-40"
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-12 text-center font-medium text-gray-900 dark:text-white">{item.quantity}</span>
                                                    <button 
                                                        onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-40"
                                                        disabled={item.service.stockInfo?.hasStockLimit && 
                                                                item.quantity >= (item.service.stockInfo.maxAllowedQuantity || 9999)}
                                                    >
                                                        +
                                                    </button>
                                                    {item.service.stockInfo?.hasStockLimit && (
                                                        <div className={`text-xs ml-2 ${item.service.stockInfo.availableStock !== null && item.quantity >= item.service.stockInfo.maxAllowedQuantity ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                            Max: {item.service.stockInfo.maxAllowedQuantity}
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(index)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 border border-red-500/30 transition-all duration-200"
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
                            <div className="px-6 py-4 border-t border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Total: {formatMoney(cartTotal)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={clearCart}
                                        className={`flex-1 px-6 py-3 rounded-xl ${BUTTON_SECONDARY} transition-all duration-200 font-medium`}
                                    >
                                        Clear Cart
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!derivedStoreId) return;
                                            if (cartTotal > 2000) {
                                                setShowDownPaymentModal(true);
                                                return;
                                            }
                                            await submitOrders();
                                        }}
                                        className={`flex-1 px-6 py-3 rounded-xl ${BUTTON_PRIMARY} font-semibold disabled:opacity-60 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
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

            {showDownPaymentModal && (
                <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${MODAL_OVERLAY} backdrop-blur-sm`} onClick={() => setShowDownPaymentModal(false)} />
                    <div className={`relative z-10 max-w-lg w-full rounded-3xl ${PANEL_SURFACE} shadow-2xl overflow-hidden`}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">Down Payment Required</div>
                            <button type="button" onClick={() => setShowDownPaymentModal(false)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className={`text-sm ${MUTED_TEXT}`}>Bulk order detected. For orders over ₱2,000 a down payment is required.</div>
                            <div className={`p-4 rounded-2xl ${SOFT_PANEL}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`text-sm ${MUTED_TEXT}`}>Order Total</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{formatMoney(cartTotal)}</div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className={`text-sm ${MUTED_TEXT}`}>Required Down Payment (1/2)</div>
                                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(Math.round((cartTotal / 2) * 100) / 100)}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Payment Method</label>
                                <select value={dpMethod} onChange={(e) => setDpMethod(e.target.value as 'gcash'|'bank_transfer'|'other')} className={`w-full rounded-xl ${INPUT_SURFACE} px-4 py-3`}>
                                    <option value="gcash">GCash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Upload Receipt</label>
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
                                    className={`relative ${DROPZONE_BORDER} ${DROPZONE_HOVER} border-2 border-dashed bg-gray-50/30 dark:bg-gray-700/30 rounded-2xl p-8 min-h-[180px] text-center backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-4 cursor-pointer`}
                                >
                                    <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                                        {dpReceiptFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                {dpReceiptPreview ? (
                                                    <img src={dpReceiptPreview} alt={dpReceiptFile.name} className="w-36 h-36 object-cover rounded-lg border border-gray-300 dark:border-gray-600" />
                                                ) : (
                                                    <div className={`w-36 h-36 rounded-lg ${IMAGE_BACKGROUND} flex items-center justify-center text-sm ${MUTED_TEXT} border border-gray-300 dark:border-gray-600`}>{dpReceiptFile.name.split('.').pop()?.toUpperCase() || 'FILE'}</div>
                                                )}
                                                <div className={`text-sm ${MUTED_TEXT} truncate max-w-[260px]`} title={dpReceiptFile.name}>{dpReceiptFile.name}</div>
                                            </div>
                                        ) : (
                                            <>
                                                <svg className="w-14 h-14 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <div>
                                                    <div className={`text-sm font-medium ${MUTED_TEXT}`}>Drag & drop receipt here</div>
                                                    <div className={`text-xs ${MUTED_TEXT_LIGHT}`}>Supports: JPG, PNG, PDF</div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        onChange={(e) => handleDpFile(e.target.files ? e.target.files[0] : null)}
                                    />

                                    {dpReceiptFile && (
                                        <button type="button" onClick={() => handleDpFile(null)} className="absolute top-3 right-3 z-30 text-red-400 hover:text-red-300 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Reference Number</label>
                                <input value={dpReference} onChange={(e) => setDpReference(e.target.value)} className={`w-full rounded-xl ${INPUT_SURFACE} px-4 py-3`} placeholder="e.g. GCash reference or bank transaction ID" />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={() => setShowDownPaymentModal(false)} className={`flex-1 px-6 py-3 rounded-xl ${BUTTON_SECONDARY} transition-all`}>Cancel</button>
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

            {showPaymentModal && paymentOrderId && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                    <div className={`absolute inset-0 ${MODAL_OVERLAY} backdrop-blur-sm`} onClick={() => setShowPaymentModal(false)} />
                    <div className={`relative z-10 max-w-md w-full rounded-3xl ${PANEL_SURFACE} shadow-2xl overflow-hidden`}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                Order Status
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <div className={`text-sm ${MUTED_TEXT} mb-2`}>Current Status</div>
                                <div className={`text-2xl font-bold ${
                                    watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed' 
                                        ? 'text-emerald-600 dark:text-emerald-400' 
                                        : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                    {watchedOrderStatus === 'pending' && 'Waiting for Confirmation'}
                                    {watchedOrderStatus === 'processing' && 'Being Prepared'}
                                    {watchedOrderStatus === 'ready' && 'Ready for Pickup!'}
                                    {watchedOrderStatus === 'completed' && 'Order Completed'}
                                    {watchedOrderStatus === 'cancelled' && 'Order Cancelled'}
                                </div>
                            </div>

                            {(watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed') && (
                                <div className="space-y-4">
                                    {watchedOrderStatus === 'ready' && (
                                        <div className="text-center">
                                            <div className={`text-sm ${MUTED_TEXT} mb-3`}>Show this QR code at pickup</div>
                                            <div className="flex items-center justify-center p-4 bg-white rounded-2xl shadow-2xl">
                                                <QRCodeCanvas 
                                                    value={`ORDER:${paymentOrderId}`} 
                                                    size={180} 
                                                    includeMargin 
                                                    className="rounded-lg"
                                                />
                                            </div>
                                            <div className={`text-xs ${MUTED_TEXT_LIGHT} mt-3`}>
                                                Present this QR code to collect your order
                                            </div>
                                        </div>
                                    )}
                                    {watchedOrderStatus === 'completed' && receiptUrl && (
                                        <div className="text-center">
                                            <div className={`text-sm ${MUTED_TEXT} mb-3`}>Your receipt is ready</div>
                                            <a 
                                                href={receiptUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl`}
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

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => setShowPaymentModal(false)}
                                    className={`w-full px-6 py-3 rounded-xl ${BUTTON_SECONDARY} transition-all duration-200 font-medium`}
                                >
                                    Close
                                </button>
                                {(watchedOrderStatus === 'ready' || watchedOrderStatus === 'completed') && (
                                    <button 
                                        onClick={() => setShowPaymentModal(false)}
                                        className={`w-full px-6 py-3 rounded-xl ${BUTTON_PRIMARY} font-semibold transition-all duration-200 shadow-lg hover:shadow-xl`}
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