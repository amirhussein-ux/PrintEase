import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../shared_components/DashboardLayout';
import api from '../../../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { CiClock1 } from 'react-icons/ci';
import { BiNotepad } from 'react-icons/bi';
import { IoIosAttach } from 'react-icons/io';

type OrderStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
type TabValue = Exclude<OrderStatus, 'cancelled'> | 'return_refund';

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
	evidence?: OrderFile[];
	chatForward?: ReturnRequestChatForward;
	reviewNotes?: string;
};
type Order = {
	_id: string;
	user: string | { _id?: string } | null;
	store: string;
	items: OrderItem[];
	notes?: string;
	files: OrderFile[];
	status: OrderStatus;
	paymentStatus?: 'unpaid' | 'paid' | 'refunded';
	subtotal: number;
	currency?: string;
	createdAt?: string;
	updatedAt?: string;
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

	// Down payment fields (may be present)
	downPaymentRequired?: boolean;
	downPaymentAmount?: number;
	downPaymentPaid?: boolean;
	downPaymentPaidAt?: string;
	downPaymentMethod?: string;
	downPaymentReceipt?: string | null;
	downPaymentReference?: string | null;
};

const STATUS_LABELS: { label: string; value: Exclude<OrderStatus, 'cancelled'> }[] = [
	{ label: 'Not yet Started', value: 'pending' },
	{ label: 'In Progress', value: 'processing' },
	{ label: 'Ready For Pick-up', value: 'ready' },
	{ label: 'Completed', value: 'completed' },
];

const ORDER_TABS: { label: string; value: TabValue }[] = [
	...STATUS_LABELS.map((tab) => ({ label: tab.label, value: tab.value as TabValue })),
	{ label: 'Return / Refund', value: 'return_refund' },
];

const DATE_FILTERS = [
	{ label: 'All Time', value: 'all' },
	{ label: 'Today', value: 'today' },
	{ label: 'Past Week', value: 'week' },
	{ label: 'Past 30 Days', value: '30days' },
	{ label: 'Past Year', value: 'year' },
];

const PANEL_SURFACE = 'rounded-2xl border border-gray-200/80 dark:border-gray-600 bg-white/90 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm dark:shadow-none';
const INPUT_SURFACE = 'rounded-xl border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm';
const MUTED_TEXT = 'text-gray-600 dark:text-gray-300';

function money(v: number, currency: string = 'PHP') {
	try {
		return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
	} catch {
		const prefix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₱';
		return `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
	}
}

function statusBadgeClasses(status: OrderStatus) {
	switch (status) {
		case 'pending':
			return 'border-gray-300 text-gray-700 bg-gray-100 dark:border-gray-500 dark:text-gray-200 dark:bg-gray-400/10';
		case 'processing':
			return 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-400 dark:text-amber-200 dark:bg-amber-400/10';
		case 'ready':
			return 'border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-400 dark:text-indigo-200 dark:bg-indigo-400/10';
		case 'completed':
			return 'border-green-300 text-green-700 bg-green-50 dark:border-green-400 dark:text-green-200 dark:bg-green-400/10';
		case 'cancelled':
			return 'border-red-300 text-red-700 bg-red-50 dark:border-red-400 dark:text-red-200 dark:bg-red-400/10';
		default:
			return 'border-gray-300 text-gray-700 bg-gray-100 dark:border-white/20 dark:text-white/80 dark:bg-white/5';
	}
}

function nextStatus(status: OrderStatus): Exclude<OrderStatus, 'cancelled'> | null {
	if (status === 'pending') return 'processing';
	if (status === 'processing') return 'ready';
	if (status === 'ready') return 'completed';
	return null;
}

function getTimeRemaining(order: Order): string {
	if (!order.timeEstimates || !order.stageTimestamps) return '';
	
	const now = new Date();
	const currentStage = order.status;
	
	if (currentStage === 'pending') {
		const estimate = order.timeEstimates.processing;
		return `Est. ${estimate}h to complete`;
	} else if (currentStage === 'processing') {
		const startTime = new Date(order.stageTimestamps.processing || order.stageTimestamps.pending);
		const elapsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
		const remaining = Math.max(0, order.timeEstimates.processing - elapsed);
		return `~${remaining.toFixed(1)}h remaining`;
	} else if (currentStage === 'ready') {
		return 'Ready for pickup';
	} else if (currentStage === 'completed') {
		return 'Completed';
	}
	
	return '';
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

function getDateRange(filter: string): { start: Date; end: Date } | null {
	const now = new Date();
	const end = new Date();
	
		switch (filter) {
			case 'today': {
				const startOfToday = new Date(now);
				startOfToday.setHours(0, 0, 0, 0);
				return { start: startOfToday, end };
			}
			case 'week': {
				const startOfWeek = new Date(now);
				startOfWeek.setDate(now.getDate() - 7);
				return { start: startOfWeek, end };
			}
			case '30days': {
				const startOf30Days = new Date(now);
				startOf30Days.setDate(now.getDate() - 30);
				return { start: startOf30Days, end };
			}
			case 'year': {
				const startOfYear = new Date(now);
				startOfYear.setFullYear(now.getFullYear() - 1);
				return { start: startOfYear, end };
			}
			default:
				return null;
		}
}

function returnRefundPriority(order: Order): number {
	const normalizedStatus = order.returnRequest?.status ? order.returnRequest.status.toLowerCase() : undefined;
	if (normalizedStatus === 'pending') return 0;
	if (normalizedStatus === 'approved' || normalizedStatus === 'denied') return 2;
	if (order.returnRequest) return 1;
	if (order.status === 'completed' || order.paymentStatus === 'refunded') return 3;
	return 4;
}

export default function OrderManagement() {
	const { user } = useAuth();
	const isOwner = user?.role === 'owner';
	const isFrontDesk = user?.role === 'employee' && user.employeeRole === 'Front Desk';
	const isOperationsManager = user?.role === 'employee' && user.employeeRole === 'Operations Manager';
	const isPrinterOperator = user?.role === 'employee' && user.employeeRole === 'Printer Operator';
	const hasStoreAccess = Boolean(isOwner || isFrontDesk || isOperationsManager || isPrinterOperator);
	const [storeId, setStoreId] = useState<string | null>(null);
	const [orders, setOrders] = useState<Order[]>([]);
	const [viewReturnRequestFor, setViewReturnRequestFor] = useState<string | null>(null);
	const [dpPreviewOrder, setDpPreviewOrder] = useState<Order | null>(null);
	const [returnDecisionLoading, setReturnDecisionLoading] = useState<{ orderId: string | null; action: 'approved' | 'denied' | null }>({ orderId: null, action: null });
	const [returnDecisionNotes, setReturnDecisionNotes] = useState('');
	const [returnDecisionError, setReturnDecisionError] = useState<string | null>(null);
	const [dpPreviewUrl, setDpPreviewUrl] = useState<string | null>(null);
	const [dpPreviewMime, setDpPreviewMime] = useState<string | null>(null);
	const [dpPreviewFilename, setDpPreviewFilename] = useState<string | null>(null);
	const [dpLoading, setDpLoading] = useState(false);
	const dpCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const [evidencePreview, setEvidencePreview] = useState<{ open: boolean; loading: boolean; fileName?: string; mime?: string; url?: string; error?: string }>({ open: false, loading: false });
	const evidencePreviewUrlRef = useRef<string | null>(null);
	const orderCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastFocusParamRef = useRef<string | null>(null);
	const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
	const [pendingHighlightOrder, setPendingHighlightOrder] = useState<string | null>(null);

	// Draw image into canvas when preview URL changes
	useEffect(() => {
		if (!dpPreviewUrl || !dpPreviewMime) return;
		if (!dpPreviewMime.startsWith('image/')) return;
		const canvas = dpCanvasRef.current;
		if (!canvas) return;
		const img = new Image();
		img.onload = () => {
			try {
				// scale canvas to fit max height while preserving aspect
				const maxH = Math.min(window.innerHeight * 0.6, 800);
				const scale = Math.min(1, maxH / img.height);
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				const ctx = canvas.getContext('2d');
				if (!ctx) return;
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					} catch (err) {
						void err;
					}
		};
		img.onerror = () => { /* ignore */ };
		img.src = dpPreviewUrl;
		return () => {
			// nothing to cleanup for img; keep object URL revocation handled on modal close
		};
	}, [dpPreviewUrl, dpPreviewMime]);

	useEffect(() => {
		return () => {
			revokeEvidencePreviewUrl();
		};
	}, []);

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				clearTimeout(highlightTimeoutRef.current);
			}
		};
	}, []);

	const [loading, setLoading] = useState(true);
	// UI transition helpers
	const [showSkeleton, setShowSkeleton] = useState(true);
	const [contentReady, setContentReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const getStatusFromSearch = (search: string): TabValue => {
		const s = new URLSearchParams(search).get('status') || '';
		if (s === 'pending' || s === 'processing' || s === 'ready' || s === 'completed') return s;
		if (s === 'return_refund') return 'return_refund';
		return 'pending';
	};

	const [activeTab, setActiveTab] = useState<TabValue>(() =>
		typeof window !== 'undefined' ? getStatusFromSearch(window.location.search) : 'pending'
	);
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [dateFilter, setDateFilter] = useState<string>('all');
	const [showDateFilter, setShowDateFilter] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const st = getStatusFromSearch(location.search);
		setActiveTab(st);
	}, [location.search]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const focusParam = params.get('focus') || params.get('focusOrder');
		if (focusParam && focusParam !== lastFocusParamRef.current) {
			lastFocusParamRef.current = focusParam;
			setPendingHighlightOrder(focusParam);
		}
	}, [location.search]);

	useEffect(() => {
		if (!viewReturnRequestFor) {
			setReturnDecisionNotes('');
			setReturnDecisionError(null);
			return;
		}
		const ord = orders.find((o) => o._id === viewReturnRequestFor);
		setReturnDecisionNotes(ord?.returnRequest?.reviewNotes || '');
		setReturnDecisionError(null);
	}, [viewReturnRequestFor, orders]);

	useEffect(() => {
		let cancelled = false;
		async function resolveStore() {
			if (!hasStoreAccess) {
				setStoreId(null);
				setOrders([]);
				setLoading(false);
				setError('You do not have permission to manage orders.');
				return;
			}
			try {
				setError(null);
				const storeRes = await api.get('/print-store/mine');
				if (cancelled) return;
				const sid = (storeRes.data?._id as string) || '';
				if (!sid) {
					setStoreId(null);
					setOrders([]);
					setLoading(false);
					return;
				}
				setStoreId(sid);
			} catch (e) {
				if (cancelled) return;
				const err = e as { response?: { status?: number; data?: { message?: string } } };
				if (err?.response?.status === 404) {
					setError('No print store found.');
					setStoreId(null);
				} else {
					setError(err?.response?.data?.message || 'Failed to load your store');
				}
				setOrders([]);
				setLoading(false);
			}
		}
		resolveStore();
		return () => {
			cancelled = true;
		};
	}, [hasStoreAccess]);

	useEffect(() => {
		if (!hasStoreAccess || !storeId) return;
		let cancelled = false;
		const fetchOrdersForTab = async () => {
			setLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams({ tab: activeTab });
				const ordRes = await api.get(`/orders/store/${storeId}?${params.toString()}`);
				if (cancelled) return;
				setOrders(Array.isArray(ordRes.data) ? ordRes.data : []);
			} catch (e) {
				if (cancelled) return;
				const err = e as { response?: { data?: { message?: string } } };
				setError(err?.response?.data?.message || 'Failed to load orders');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		fetchOrdersForTab();
		return () => {
			cancelled = true;
		};
	}, [storeId, activeTab, hasStoreAccess]);
	// Crossfade skeleton -> content
	useEffect(() => {
		if (loading) {
			setContentReady(false);
			setShowSkeleton(true);
		} else {
			setContentReady(true);
			const t = setTimeout(() => setShowSkeleton(false), 250);
			return () => clearTimeout(t);
		}
	}, [loading]);

	const matchesTab = (order: Order, tab: TabValue) => {
		if (tab === 'return_refund') {
			return order.paymentStatus === 'refunded' || Boolean(order.returnRequest);
		}
		if (tab === 'completed' && order.returnRequest) {
			return false;
		}
		return order.status === tab;
	};

	const counts = useMemo(() => {
		const map: Record<TabValue, number> = {
			pending: 0,
			processing: 0,
			ready: 0,
			completed: 0,
			return_refund: 0,
		};
		for (const o of orders) {
			const hasReturnRequest = Boolean(o.returnRequest);
			if ((o.status === 'pending' || o.status === 'processing' || o.status === 'ready' || o.status === 'completed') && !(o.status === 'completed' && hasReturnRequest)) {
				map[o.status] += 1;
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

	// Filter orders based on active tab, search query, and date filter
	const filtered = useMemo(() => {
		const list = orders.filter((order) => {
			// Status / tab filter
			if (!matchesTab(order, activeTab)) return false;
			
			// Date filter
			if (dateFilter !== 'all' && order.createdAt) {
				const dateRange = getDateRange(dateFilter);
				if (dateRange) {
					const orderDate = new Date(order.createdAt);
					if (orderDate < dateRange.start || orderDate > dateRange.end) {
						return false;
					}
				}
			}
			
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchesId = order._id.toLowerCase().includes(query);
				const matchesService = order.items.some(item => 
					item.serviceName?.toLowerCase().includes(query)
				);
				const matchesNotes = order.notes?.toLowerCase().includes(query);
				const matchesFiles = order.files.some(file => 
					file.filename?.toLowerCase().includes(query)
				);
				
				return matchesId || matchesService || matchesNotes || matchesFiles;
			}
			
			return true;
		});

		if (activeTab === 'return_refund') {
			return [...list].sort((a, b) => {
				const priorityDiff = returnRefundPriority(a) - returnRefundPriority(b);
				if (priorityDiff !== 0) return priorityDiff;
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

		return list;
	}, [orders, activeTab, searchQuery, dateFilter]);

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
		const initialScrollTimer = setTimeout(() => attemptScroll(), 350);
		return () => {
			cancelled = true;
			clearTimeout(initialScrollTimer);
			if (retryTimer) {
				clearTimeout(retryTimer);
			}
		};
	}, [pendingHighlightOrder, scrollToOrderCard, navigate, location.pathname, location.search, loading]);

	async function updateStatus(id: string, status: Exclude<OrderStatus, 'cancelled'>) {
		try {
			setUpdatingId(id);
				const payload: Record<string, unknown> = { status };
				if (status === 'completed') {
					payload.paymentStatus = 'paid';
				}
				const res = await api.patch(`/orders/${id}/status`, payload);
			const updated: Order = res.data;
			setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			alert(err?.response?.data?.message || err?.message || 'Failed to update order');
		} finally {
			setUpdatingId(null);
		}
	}

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

	async function handleReturnDecision(orderId: string, status: 'approved' | 'denied') {
		const notes = returnDecisionNotes.trim();
		if (status === 'denied' && !notes) {
			setReturnDecisionError('Please provide a reason for rejecting this request.');
			return;
		}
		if (status === 'approved') {
			setReturnDecisionError(null);
		}
		setReturnDecisionLoading({ orderId, action: status });
		try {
			const payload: Record<string, unknown> = { status };
			if (status === 'denied') payload.reviewNotes = notes;
			const res = await api.patch(`/orders/${orderId}/return-request`, payload);
			const updated: Order = res.data;
			setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
			setReturnDecisionError(null);
		} catch (e) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			const msg = err?.response?.data?.message || err?.message || 'Failed to update return request';
			setReturnDecisionError(msg);
			alert(msg);
		} finally {
			setReturnDecisionLoading({ orderId: null, action: null });
		}
	}

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

	const previewReturnEvidence = async (orderId: string, file: OrderFile) => {
		if (!file?.fileId) return;
		revokeEvidencePreviewUrl();
		setEvidencePreview({ open: true, loading: true, fileName: file.filename || 'Attachment', mime: file.mimeType });
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

	const goToReturnRequestChat = (order: Order) => {
		const chatId = order.returnRequest?.chatForward?.chatId;
		const customerId = typeof order.user === 'string' ? order.user : (order.user as unknown as { _id?: string })?._id;
		if (!chatId && !customerId) return;
		const params = new URLSearchParams();
		if (chatId) params.set('chatId', String(chatId));
		if (customerId) params.set('customerId', String(customerId));
		params.set('focusOrder', order._id);
		const anchorId = order.returnRequest?.chatForward?.anchorId;
		if (anchorId) params.set('focusAnchor', anchorId);
		navigate(`/dashboard/chat-store?${params.toString()}`);
		setViewReturnRequestFor(null);
	};

	const pageHeader = (
		<div className="mb-8">
			<h1 className="text-3xl md:text-4xl font-bold">Order Management</h1>
			<p className={`text-lg mt-2 ${MUTED_TEXT}`}>Track and update customer orders.</p>
		</div>
	);

	if (!hasStoreAccess) {
		return (
			<DashboardLayout role="owner">
				<div className="max-w-5xl mx-auto text-center text-gray-900 dark:text-gray-100 px-4 sm:px-6 lg:px-8 pt-8 pb-10">
					{pageHeader}
					<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
						You do not have permission to manage orders.
					</div>
				</div>

				{/* Downpayment Preview Modal */}
				{dpPreviewOrder && (() => {
					const ord = dpPreviewOrder;
					return (
						<div className="fixed inset-0 z-[500] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => {
							// close modal on backdrop click
							try { if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl); } catch (e) { console.warn('revoke failed', e); }
							setDpPreviewOrder(null); setDpPreviewUrl(null); setDpPreviewMime(null); setDpPreviewFilename(null);
						}}>
							<div className="relative bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 w-auto max-w-[95vw] max-h-[90vh] overflow-auto min-w-[28rem] sm:min-w-[36rem]" onClick={(e) => e.stopPropagation()}>
								<button className="absolute top-4 right-4 bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1.5 text-sm font-bold rounded-lg dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600" onClick={() => {
									try { if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl); } catch (e) { console.warn('revoke failed', e); }
									setDpPreviewOrder(null); setDpPreviewUrl(null); setDpPreviewMime(null); setDpPreviewFilename(null);
								}}>✕</button>
								<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Down Payment Receipt</h3>
								<div className={`text-sm mb-4 ${MUTED_TEXT}`}>
									Order <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span>
								</div>
								<div className="mb-4">
									{dpLoading ? (
										<div className="w-full h-[40vh] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
											<div className="flex flex-col items-center gap-3">
												<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
												<div className="text-sm">Loading receipt preview…</div>
											</div>
										</div>
									) : dpPreviewUrl && dpPreviewMime && dpPreviewMime.startsWith('image/') ? (
										<canvas
											ref={(el) => { dpCanvasRef.current = el; }}
											className="mx-auto rounded-lg border border-gray-200 dark:border-gray-700 block"
											style={{ maxHeight: '80vh', maxWidth: '90vw' }}
										/>
									) : dpPreviewUrl && dpPreviewMime === 'application/pdf' ? (
										<div className="w-full max-h-[80vh] overflow-auto">
											<iframe title="receipt" src={dpPreviewUrl || ''} className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700" style={{ minHeight: '60vh' }} />
										</div>
									) : dpPreviewUrl ? (
										<div className="w-full h-[40vh] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
											<a href={dpPreviewUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-300">Open receipt in new tab</a>
										</div>
									) : (
										<div className="w-full h-[40vh] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">No preview available.</div>
									)}
								</div>


								<div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 mt-4">
									<div className={`text-sm ${MUTED_TEXT}`}>
										Reference: <span className="font-medium text-gray-900 dark:text-white">{ord.downPaymentReference || '—'}</span>
									</div>
									<div className="flex items-center gap-3">
										<button onClick={() => {
											// download the file (prefer canvas data for images)
											if (!dpPreviewUrl) return;
											if (dpPreviewMime && dpPreviewMime.startsWith('image/') && dpCanvasRef.current) {
												try {
													const canvas = dpCanvasRef.current;
													const url = canvas.toDataURL('image/png');
													const a = document.createElement('a');
													a.href = url;
													a.download = dpPreviewFilename ? `${dpPreviewFilename.split('.').slice(0, -1).join('.') || 'receipt'}.png` : `${shortId(ord._id)}-downpayment.png`;
													document.body.appendChild(a);
													a.click();
													a.remove();
													return;
												} catch (e) {
													console.warn('canvas download failed', e);
												}
											}
											const a = document.createElement('a');
											a.href = dpPreviewUrl;
											a.download = dpPreviewFilename || `${shortId(ord._id)}-downpayment`;
											document.body.appendChild(a);
											a.click();
											a.remove();
										}} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold">Download</button>
										<button onClick={() => {
											try { if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl); } catch (e) { console.warn('revoke failed', e); }
										setDpPreviewOrder(null); setDpPreviewUrl(null); setDpPreviewMime(null); setDpPreviewFilename(null);
									}} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50">Close</button>
									</div>
								</div>
							</div>
						</div>
					);
				})()}
			</DashboardLayout>
		);
	}

	if (!storeId && !loading) {
		return (
			<DashboardLayout role="owner">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 text-gray-900 dark:text-gray-100">
					{pageHeader}

					<div className={`${PANEL_SURFACE} p-8 text-center ease-out transform transition-transform duration-200 hover:scale-[1.02]`}>
						<div className="flex flex-col items-center gap-4">
							<div className="text-6xl">🏪</div>
							<div>
								<div className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Print Store</div>
								<div className={MUTED_TEXT}>Create your store to start receiving orders.</div>
							</div>
							<button
								onClick={() => navigate('/owner/create-shop')}
								className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 ease-out transform transition-transform duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
							>
								Create Store
							</button>
						</div>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout role="owner">
			<div className="max-w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-gray-900 dark:text-gray-100">
				{pageHeader}

				{/* Filter header with integrated search and filter */}
				<div className={`${PANEL_SURFACE} mb-8 p-4 relative z-20`}>
					<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
						{/* Combined Status Tabs, Search and Filter */}
						<div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
							{/* Status Tabs */}
							<div className="flex flex-wrap justify-center sm:justify-start gap-3 flex-1">
								{ORDER_TABS.map(({ label, value }) => {
									const active = activeTab === value;
									return (
										<button
											key={value}
											onClick={() => {
												setActiveTab(value);
												navigate(`/dashboard/orders?status=${value}`);
											}}
											className={`flex-1 sm:flex-none min-w-[9rem] inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-sm font-medium ease-out transform transition-transform duration-200 hover:scale-105 ${
												active
													? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
													: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700/50'
											}`}
										>
											<span>{label}</span>
											<span className={`text-xs px-2 py-1 rounded-full border ${
												active
													? 'border-white/60 bg-white/30 text-white'
													: 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-500 dark:bg-gray-700/50 dark:text-gray-200'
											}`}>
												{counts[value] ?? 0}
											</span>
										</button>
									);
								})}
							</div>

							{/* Search and Filter Container */}
							<div className="flex flex-row gap-3 flex-1 lg:max-w-full">
								{/* Modern Search Bar */}
								<div className="relative flex-1">
									<div className="relative group">
										<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
											<svg className="h-4 w-4 text-gray-400 group-focus-within:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
											</svg>
										</div>
										<input
											type="text"
											placeholder="Search orders..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className={`w-full pl-11 pr-4 py-3 ${INPUT_SURFACE}`}
										/>
										{searchQuery && (
											<button
												onClick={() => setSearchQuery('')}
												className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-900 dark:hover:text-white"
											>
												<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										)}
									</div>
								</div>

								{/* Date Filter Dropdown */}
								<div className="relative z-30">
									<button
										onClick={() => setShowDateFilter(!showDateFilter)}
										className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 ease-out backdrop-blur-sm transform transition-transform duration-200 hover:scale-105 active:scale-95 min-w-[120px] dark:bg-gray-700/80 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600/80 dark:hover:border-gray-500"
									>
										<svg className="h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
										</svg>
										<span className="text-sm font-medium">Filter</span>
										<svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showDateFilter ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>

									{/* Dropdown Menu */}
										{showDateFilter && (
											<div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl backdrop-blur-sm z-40 dark:bg-gray-800 dark:border-gray-600">
											<div className="p-2 space-y-1">
												{DATE_FILTERS.map((filter) => (
													<button
														key={filter.value}
														onClick={() => {
															setDateFilter(filter.value);
															setShowDateFilter(false);
														}}
														className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
															dateFilter === filter.value
																? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
																: 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/50'
														}`}
													>
														{filter.label}
													</button>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Results Count */}
					<div className={`mt-4 text-sm ${MUTED_TEXT}`}>
						Showing {filtered.length} of {orders.filter(o => matchesTab(o, activeTab)).length} orders
						{searchQuery && (
							<span> for "<span className="text-gray-900 dark:text-white">{searchQuery}</span>"</span>
						)}
						{dateFilter !== 'all' && (
							<span> from <span className="text-gray-900 dark:text-white">{DATE_FILTERS.find(f => f.value === dateFilter)?.label}</span></span>
						)}
					</div>
				</div>

				{/* Loading/Error */}
				{showSkeleton && (
					<div
						aria-busy="true"
						className={`grid grid-cols-1 gap-4 mb-4 transition-opacity duration-300 ${contentReady ? 'opacity-0' : 'opacity-100'}`}
					>
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className={`${PANEL_SURFACE} p-6 animate-pulse`}>
								<div className="flex flex-col sm:flex-row sm:items-start gap-4">
									{/* Left skeleton section */}
									<div className="flex-1 min-w-0 space-y-3">
										<div className="flex items-center gap-2">
											<div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
											<div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
										</div>
										<div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
										<div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
										<div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
										<div className="h-3 w-36 rounded bg-gray-200 dark:bg-gray-700" />
									</div>

									{/* Right skeleton actions */}
									<div className="sm:text-right w-40 shrink-0 space-y-2">
										<div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-700 ml-auto" />
										<div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 ml-auto" />
										<div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 ml-auto" />
									</div>
								</div>
							</div>
						))}
					</div>
				)}
				{error && (
					<div className="mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-800 px-6 py-4 text-sm backdrop-blur-sm transform transition-transform duration-200 ease-out hover:scale-[1.02] dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
						{error}
					</div>
				)}

				{/* Orders list */}
				<div className={`grid grid-cols-1 gap-6 transition-opacity duration-300 ${contentReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
					{!loading && filtered.length === 0 && (
						<div className={`${PANEL_SURFACE} p-12 text-center text-gray-700 dark:text-gray-300 transform transition-transform duration-200 ease-out hover:scale-[1.02]`}>
							<div className="text-6xl mb-4">
								{searchQuery || dateFilter !== 'all' ? '🔍' : '📦'}
							</div>
							<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
								{searchQuery || dateFilter !== 'all' ? 'No matching orders' : 'No orders in this status'}
							</h3>
							<p className={MUTED_TEXT}>
								{searchQuery || dateFilter !== 'all' 
									? 'Try adjusting your search or filter criteria'
									: 'Orders will appear here as customers place them.'
								}
							</p>
							{(searchQuery || dateFilter !== 'all') && (
								<button
									onClick={() => {
										setSearchQuery('');
										setDateFilter('all');
									}}
									className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
								>
									Clear filters
								</button>
							)}
						</div>
					)}
					{filtered.map((o) => {
						const first = o.items[0];
						const canAdvance = nextStatus(o.status);
						const total = o.subtotal ?? first?.totalPrice ?? 0;
						const currency = o.currency || first?.currency || 'PHP';
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
								className={`${PANEL_SURFACE} p-6 transform transition-transform duration-200 ease-out hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 group scroll-mt-32 md:scroll-mt-40 ${isHighlighted ? 'ring-2 ring-amber-400 shadow-amber-400/30 scale-[1.01]' : ''}`}
							>
								<div className="flex flex-col sm:flex-row sm:items-start gap-4">
									{/* Left: main info */}
									<div className="flex-1 min-w-0 space-y-4">
										{/* Header */}
										<div className="flex items-center gap-3">
											<div className="text-gray-900 dark:text-white font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-200">
												{shortId(o._id)}
											</div>
											<span className={`text-xs px-3 py-1.5 rounded-full border transition-transform ${statusBadgeClasses(o.status)}`}>
												{STATUS_LABELS.find((s) => s.value === o.status)?.label || o.status}
											</span>
											{o.returnRequest && (
												<span className={`ml-2 text-[11px] px-2 py-1 rounded-full border ${returnRequestStatusBadge(o.returnRequest.status)}`}>
													{returnRequestStatusLabel(o.returnRequest.status)}
												</span>
											)}
										</div>

										{/* Date and Time */}
										<div className="space-y-2">
											<div className={`text-xs font-mono tabular-nums ${MUTED_TEXT}`}>
												{formatDateUTC(o.createdAt)}
											</div>
											{getTimeRemaining(o) && (
												<div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200 font-medium bg-blue-100 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg px-3 py-2 transform transition-transform duration-200 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20">
													<CiClock1 className="text-base" aria-hidden />
													<span>{getTimeRemaining(o)}</span>
												</div>
											)}
										</div>

										{/* Service Details */}
										<div className="space-y-3">
											<div>
												<div className="text-gray-900 dark:text-white font-semibold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-100">
													{first?.serviceName || 'Service'}
												</div>
												<div className={`text-sm mt-1 ${MUTED_TEXT}`}>
													Quantity: <span className="text-gray-900 dark:text-white font-medium">{first?.quantity}</span>
													{first?.unit && <span className="ml-2">· {first.unit}</span>}
												</div>
											</div>

											{first && (
												<div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 transform transition-transform duration-200 group-hover:bg-gray-200 dark:group-hover:bg-gray-700/50">
													{itemSummary(first)}
												</div>
											)}

											{o.notes && (
												<div className="flex gap-3 items-center text-sm text-yellow-900 dark:text-yellow-200 bg-yellow-50 border border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/30 rounded-lg px-3 py-2 transform transition-transform duration-200 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20">
													<BiNotepad className="text-2xl text-yellow-600 dark:text-yellow-300 flex-shrink-0" aria-hidden />
													<div className="flex flex-wrap items-center gap-1">
														<span className="font-semibold text-yellow-800 dark:text-yellow-200">Notes:</span>
														<span className="text-yellow-900 dark:text-yellow-100">{o.notes}</span>
													</div>
												</div>
											)}
										</div>

										{/* Files Section */}
										{o.files?.length > 0 && (
											<div className="border-t border-gray-200 dark:border-gray-600 pt-4">
												<div className={`text-xs font-medium mb-2 ${MUTED_TEXT}`}>Files ({o.files.length}):</div>
												<div className="space-y-2">
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
																	// try to extract filename from header
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
															className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 transition-transform duration-200 ease-out transform hover:translate-x-1 group/file dark:text-blue-300 dark:hover:text-blue-200"
															title={f.filename || 'file'}
														>
																<IoIosAttach className="text-lg" aria-hidden />
															<span className="truncate flex-1">{f.filename || String(f.fileId)}</span>
															<span className="text-xs opacity-0 group-hover/file:opacity-100 transition-opacity duration-150">↓</span>
														</a>
													))}
													{o.files.length > 3 && (
														<div className={`text-xs text-center ${MUTED_TEXT}`}>
															+{o.files.length - 3} more files
														</div>
													)}
												</div>
											</div>
										)}
									</div>

									{/* Right: totals and actions */}
									<div className="sm:text-right sm:w-48 shrink-0 space-y-4">
										<div>
											<div className="text-gray-900 dark:text-white font-bold text-2xl group-hover:text-blue-600 dark:group-hover:text-blue-200">
												{money(total, currency)}
											</div>
											<div className={`text-sm ${MUTED_TEXT}`}>Total Amount</div>
										</div>

										{/* Action Button */}
										{canAdvance && canAdvance !== 'completed' && (
											<button
												disabled={updatingId === o._id}
												onClick={() => {
													const ns = nextStatus(o.status);
													if (ns && ns !== 'completed') updateStatus(o._id, ns);
												}}
												className={`w-full px-4 py-3 rounded-xl text-sm font-medium border transform transition-transform duration-200 ease-out hover:scale-105 ${
													o.status === 'pending'
														? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-500 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-amber-500/25'
														: o.status === 'processing'
														? 'bg-gradient-to-r from-indigo-500 to-indigo-600 border-indigo-500 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-indigo-500/25'
														: 'bg-gradient-to-r from-green-500 to-green-600 border-green-500 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-green-500/25'
												} ${updatingId === o._id ? 'opacity-60 cursor-not-allowed scale-95' : ''}`}
											>
												{updatingId === o._id ? 'Updating…' : `Mark as ${STATUS_LABELS.find((s) => s.value === canAdvance)?.label}`}
											</button>
										)}

										{o.returnRequest && (
											<button
												onClick={() => setViewReturnRequestFor(o._id)}
												className="w-full px-4 py-3 rounded-xl text-sm font-medium border border-amber-500 text-amber-700 bg-white hover:bg-amber-50 transform transition-transform duration-200 ease-out hover:scale-105 dark:text-amber-100 dark:border-amber-300 dark:bg-transparent dark:hover:bg-white/5"
											>
												View Return Request
											</button>
										)}

										{/* Downpayment receipt view (if present) */}
										{o.downPaymentReceipt && o.downPaymentReference && (
											<button
												onClick={async () => {
												// Open modal immediately and show loading
												setDpPreviewOrder(o);
												setDpPreviewUrl(null);
												setDpPreviewMime(null);
												setDpPreviewFilename(null);
												setDpLoading(true);
												console.log('Fetching downpayment receipt for order', o._id);
												try {
													const res = await api.get(`/orders/${o._id}/downpayment/preview`, { responseType: 'blob' });
													const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
													const url = window.URL.createObjectURL(blob);
													const cd = res.headers['content-disposition'] || '';
													const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
													const headerName = decodeURIComponent((match?.[1] || match?.[2] || '').trim());
													setDpPreviewFilename(headerName || `downpayment-${o._id}`);
													setDpPreviewMime(res.headers['content-type'] || 'application/octet-stream');
													setDpPreviewUrl(url);
													console.log('Fetched downpayment receipt', {
														orderId: o._id,
														filename: headerName || null,
														contentType: res.headers['content-type'] || null,
														reference: o.downPaymentReference || null,
													});
												} catch (err) {
													const e2 = err as { response?: { data?: { message?: string } }; message?: string };
													console.warn('Failed to load downpayment receipt', e2?.response?.data?.message || e2?.message || err);
													alert(e2?.response?.data?.message || e2?.message || 'Failed to load downpayment receipt');
												} finally {
													setDpLoading(false);
												}
												}}
											className="w-full px-4 py-3 rounded-xl text-sm font-medium border transform transition-transform duration-200 bg-gradient-to-r from-amber-500 to-amber-600 border-amber-500 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-amber-500/25"
											>
											{dpLoading ? 'Loading…' : 'View Downpayment'}
										</button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
				{viewReturnRequestFor && (() => {
					const ord = orders.find((order) => order._id === viewReturnRequestFor);
					const request = ord?.returnRequest;
					if (!ord || !request) return null;
					return (
						<div className="fixed inset-0 z-[50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setViewReturnRequestFor(null)}>
							<div className={`${PANEL_SURFACE} relative w-full max-w-3xl p-6 bg-white dark:bg-gray-900`} onClick={(e) => e.stopPropagation()}>
								<button
									onClick={() => setViewReturnRequestFor(null)}
									className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
								>
									✕
								</button>
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-500/20 dark:text-amber-200">
										<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
										</svg>
									</div>
									<div className="flex-1">
										<h3 className="text-xl font-bold text-gray-900 dark:text-white">Return / Refund Request</h3>
										<p className={`${MUTED_TEXT} text-sm mt-1`}>
											Order <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span>
										</p>
									</div>
								</div>

								<div className="mt-5 space-y-4 text-sm">
									<div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</p>
											<p className="text-base font-semibold text-gray-900 dark:text-white">{returnRequestStatusLabel(request.status)}</p>
										</div>
										<span className={`px-3 py-1 text-xs font-semibold rounded-full border ${returnRequestStatusBadge(request.status)}`}>
											{returnRequestStatusLabel(request.status)}
										</span>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-800/40">
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason</p>
											<p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{request.reason}</p>
										</div>
										<div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-800/40">
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Submitted</p>
											<p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{formatDateUTC(request.submittedAt)}</p>
										</div>
									</div>

									{request.details && (
										<div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Details</p>
											<p className="mt-3 whitespace-pre-line text-gray-800 dark:text-gray-200">{request.details}</p>
										</div>
									)}

									<div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
										<div className="flex items-center justify-between mb-3">
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Photos/Videos</p>
											<span className="text-xs text-gray-500 dark:text-gray-400">{request.evidence?.length || 0} file(s)</span>
										</div>
										{request.evidence && request.evidence.length > 0 ? (
											<ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
												{request.evidence.map((file, idx) => (
													<li key={`${String(file.fileId)}-${idx}`}>
														<button
															type="button"
															onClick={() => previewReturnEvidence(ord._id, file)}
															className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-left transform transition-transform duration-200 hover:border-amber-400 hover:bg-amber-50/60 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-amber-300 dark:hover:bg-gray-800/80"
														>
															<div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-400/20">
																<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
																</svg>
															</div>
															<div className="flex-1 min-w-0">
																<p className="truncate font-medium text-gray-900 dark:text-white">{file.filename || 'Attachment'}</p>
																<p className="text-[11px] text-gray-500 dark:text-gray-400">{file.mimeType || 'file'} · {formatEvidenceSize(file.size)}</p>
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
								</div>

								{request.status === 'pending' ? (
									<div className="rounded-2xl mt-5 border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
										<div className="flex items-center justify-between">
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Rejection Reason</p>
										</div>
										<textarea
											className={`${INPUT_SURFACE} p-4 mt-5 w-full min-h-[120px] resize-y text-sm`}
											placeholder="Explain why this request is being rejected..."
											value={returnDecisionNotes}
											onChange={(e) => {
												setReturnDecisionNotes(e.target.value);
												if (returnDecisionError) setReturnDecisionError(null);
											}}
										/>
										{returnDecisionError && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{returnDecisionError}</p>}
									</div>
								) : request.reviewNotes && request.status === 'denied' ? (
									<div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-500/10">
										<p className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">Rejection Reason</p>
										<p className="mt-2 text-base text-gray-900 dark:text-white whitespace-pre-line">{request.reviewNotes}</p>
									</div>
								) : null}

								<div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
									{(request.chatForward?.chatId || ord.user) && (
										<button
											onClick={() => goToReturnRequestChat(ord)}
											className="px-6 py-3 rounded-xl border border-amber-500/70 text-amber-700 font-semibold bg-white hover:bg-amber-50 dark:border-amber-300/80 dark:text-amber-100 dark:bg-transparent dark:hover:bg-white/5"
										>
											Open In Chat
										</button>
									)}
									{request.status === 'pending' && (
										<>
											<button
												onClick={() => handleReturnDecision(ord._id, 'denied')}
												disabled={returnDecisionLoading.orderId === ord._id}
												className={`px-6 py-3 rounded-xl border border-red-500 text-red-600 font-semibold hover:bg-red-50 dark:border-red-400 dark:text-red-200 dark:hover:bg-red-400/10 ${returnDecisionLoading.orderId === ord._id ? 'opacity-60 cursor-not-allowed' : ''}`}
											>
												{returnDecisionLoading.orderId === ord._id && returnDecisionLoading.action === 'denied' ? 'Rejecting…' : 'Reject'}
											</button>
											<button
												onClick={() => handleReturnDecision(ord._id, 'approved')}
												disabled={returnDecisionLoading.orderId === ord._id}
												className={`px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 ${returnDecisionLoading.orderId === ord._id ? 'opacity-60 cursor-not-allowed' : ''}`}
											>
												{returnDecisionLoading.orderId === ord._id && returnDecisionLoading.action === 'approved' ? 'Approving…' : 'Accept'}
											</button>
										</>
									)}
									<button
										onClick={() => setViewReturnRequestFor(null)}
										className="px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900"
									>
										Close
									</button>
								</div>
							</div>
						</div>
					);
				})()}
				{evidencePreview.open && (
					<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeEvidencePreview}>
						<div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 p-6" onClick={(e) => e.stopPropagation()}>
							<button onClick={closeEvidencePreview} className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100">✕</button>
							<h3 className="text-xl font-bold text-gray-900 dark:text-white pr-10">Attachment Preview</h3>
							<p className={`mt-1 text-sm ${MUTED_TEXT}`}>{evidencePreview.fileName || 'Attachment'}</p>
							<div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 min-h-[240px] flex items-center justify-center text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
								{evidencePreview.loading ? (
									<div className="flex flex-col items-center gap-3">
										<div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
										<p>Loading preview…</p>
									</div>
								) : evidencePreview.error ? (
									<p className="text-center text-red-600 dark:text-red-300">{evidencePreview.error}</p>
								) : evidencePreview.url ? (
									(() => {
										const mime = evidencePreview.mime || '';
										if (mime.startsWith('image/')) {
											return <img src={evidencePreview.url} alt={evidencePreview.fileName || 'Attachment preview'} className="max-h-[70vh] max-w-full rounded-xl border border-gray-200 object-contain dark:border-gray-700" />;
										}
										if (mime.startsWith('video/')) {
											return <video controls src={evidencePreview.url} className="w-full max-h-[70vh] rounded-xl border border-gray-200 bg-black dark:border-gray-700" />;
										}
										if (mime === 'application/pdf') {
											return <iframe title="Evidence PDF" src={evidencePreview.url} className="w-full h-[70vh] rounded-xl border border-gray-200 dark:border-gray-700" />;
										}
										return (
											<div className="flex flex-col items-center gap-3 text-center">
												<p>No inline preview available for this file type.</p>
												<a href={evidencePreview.url} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-300">Open in new tab</a>
											</div>
										);
									})()
								) : (
									<p>Unable to load preview.</p>
								)}
							</div>
							<div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-3">
								<div className={`text-xs ${MUTED_TEXT}`}>
									Type: <span className="font-medium text-gray-900 dark:text-white">{evidencePreview.mime || 'Unknown'}</span>
								</div>
								<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
									{evidencePreview.url && (
										<button
											onClick={() => {
												const temp = document.createElement('a');
												temp.href = evidencePreview.url || '#';
												temp.download = evidencePreview.fileName || 'attachment';
												document.body.appendChild(temp);
												temp.click();
												temp.remove();
											}}
											className="px-5 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500"
										>
											Download
										</button>
										)}
									<button onClick={closeEvidencePreview} className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">Close</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
			{/* Downpayment Preview Modal */}
			{dpPreviewOrder && (() => {
				const ord = dpPreviewOrder;
				return (
					<div className="fixed inset-0 z-[500] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => {
						try { if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl); } catch (e) { console.warn('revoke failed', e); }
						setDpPreviewOrder(null); setDpPreviewUrl(null); setDpPreviewMime(null); setDpPreviewFilename(null);
					}}>
						<div className="relative bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 w-auto max-w-[95vw] max-h-[90vh] overflow-auto min-w-[28rem] sm:min-w-[36rem]" onClick={(e) => e.stopPropagation()}>
							<button className="absolute top-4 right-4 bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1.5 text-sm font-bold rounded-lg dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600" onClick={() => {
								try { if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl); } catch (e) { console.warn('revoke failed', e); }
								setDpPreviewOrder(null); setDpPreviewUrl(null); setDpPreviewMime(null); setDpPreviewFilename(null);
							}}>✕</button>
							<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Down Payment Receipt</h3>
							<div className={`text-sm mb-4 ${MUTED_TEXT}`}>
								Order <span className="font-mono text-blue-600 dark:text-blue-300">{shortId(ord._id)}</span>
							</div>
							<div className="mb-4">
								{dpLoading ? (
									<div className="w-full h-[40vh] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
										<div className="flex flex-col items-center gap-3">
											<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
											<div className="text-sm">Loading receipt preview…</div>
										</div>
									</div>
								) : dpPreviewUrl && dpPreviewMime && dpPreviewMime.startsWith('image/') ? (
									<canvas
										ref={(el) => { dpCanvasRef.current = el; }}
										className="mx-auto rounded-lg border border-gray-200 dark:border-gray-700 block"
										style={{ maxHeight: '80vh', maxWidth: '90vw' }}
									/>
								) : dpPreviewUrl && dpPreviewMime === 'application/pdf' ? (
									<div className="w-full max-h-[80vh] overflow-auto">
										<iframe title="receipt" src={dpPreviewUrl || ''} className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700" style={{ minHeight: '60vh' }} />
									</div>
								) : dpPreviewUrl ? (
									<div className="w-full h-[40vh] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
										<a href={dpPreviewUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-300">Open receipt in new tab</a>
									</div>
								) : (
									<div className="w-full h-[40vh] flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">No preview available.</div>
								)}
							</div>
							<div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 mt-4">
								<div className={`text-sm ${MUTED_TEXT}`}>
									Reference Number: <span className="font-medium text-gray-900 dark:text-white">{ord.downPaymentReference || '—'}</span>
								</div>
								<div className="flex items-center gap-3">
									<button onClick={() => {
										if (!dpPreviewUrl) return;
										if (dpPreviewMime && dpPreviewMime.startsWith('image/') && dpCanvasRef.current) {
											try {
												const canvas = dpCanvasRef.current;
												const url = canvas.toDataURL('image/png');
												const a = document.createElement('a');
												a.href = url;
												a.download = dpPreviewFilename ? `${dpPreviewFilename.split('.').slice(0, -1).join('.') || 'receipt'}.png` : `${shortId(ord._id)}-downpayment.png`;
												document.body.appendChild(a);
												a.click();
												a.remove();
												return;
											} catch (e) { console.warn('canvas download failed', e); }
										}
										const a = document.createElement('a');
										a.href = dpPreviewUrl;
										a.download = dpPreviewFilename || `${shortId(ord._id)}-downpayment`;
										document.body.appendChild(a);
										a.click();
										a.remove();
									}} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold">Download</button>
									<button onClick={() => {
										try { if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl); } catch (e) { console.warn('revoke failed', e); }
										setDpPreviewOrder(null); setDpPreviewUrl(null); setDpPreviewMime(null); setDpPreviewFilename(null);
									}} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50">Close</button>
								</div>
							</div>
						</div>
					</div>
				);
				})()}
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

function formatEvidenceSize(size?: number) {
	if (!size) return '—';
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}