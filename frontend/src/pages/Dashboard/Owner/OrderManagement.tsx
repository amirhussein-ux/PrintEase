import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../shared_components/DashboardLayout';
import api from '../../../lib/api';
import { useNavigate } from 'react-router-dom';

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

const STATUS_LABELS: { label: string; value: Exclude<OrderStatus, 'cancelled'> }[] = [
	{ label: 'Not yet Started', value: 'pending' },
	{ label: 'In Progress', value: 'processing' },
	{ label: 'Ready For Pick-up', value: 'ready' },
	{ label: 'Completed', value: 'completed' },
];

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

export default function OrderManagement() {
	const [storeId, setStoreId] = useState<string | null>(null);
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	// UI transition helpers
	const [showSkeleton, setShowSkeleton] = useState(true);
	const [contentReady, setContentReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<Exclude<OrderStatus, 'cancelled'>>('pending');
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;
		async function loadStoreAndOrders() {
			try {
				setLoading(true);
				setError(null);
				// get owner store
				const storeRes = await api.get('/print-store/mine');
				if (cancelled) return;
				const sid = (storeRes.data?._id as string) || '';
				if (!sid) {
					setStoreId(null);
					setOrders([]);
					return;
				}
				setStoreId(sid);
				// list orders for store
				const ordRes = await api.get(`/orders/store/${sid}`);
				if (cancelled) return;
				setOrders(Array.isArray(ordRes.data) ? ordRes.data : []);
			} catch (e: unknown) {
				// if no store: redirect to create
				const err = e as { response?: { status?: number; data?: { message?: string } } };
				if (err?.response?.status === 404) {
					setError('No print store found.');
					setStoreId(null);
				} else {
					setError(err?.response?.data?.message || 'Failed to load orders');
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		loadStoreAndOrders();
		return () => {
			cancelled = true;
		};
	}, []);

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

	const counts = useMemo(() => {
		const map: Record<string, number> = {};
		for (const s of STATUS_LABELS) map[s.value] = 0;
		for (const o of orders) {
			if (o.status in map) map[o.status] += 1;
		}
		return map as Record<Exclude<OrderStatus, 'cancelled'>, number>;
	}, [orders]);

	const filtered = useMemo(() => orders.filter((o) => o.status === activeTab), [orders, activeTab]);

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

	const pageHeader = (
		<div className="mb-6">
			<h1 className="text-2xl md:text-3xl font-bold text-white">Order Management</h1>
			<p className="text-gray-300 text-sm">Track and update customer orders.</p>
		</div>
	);

	if (!storeId && !loading) {
		return (
			<DashboardLayout role="owner">
				<div className="max-w-5xl mx-auto">
					{pageHeader}
					<div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-200">
						<div className="flex items-center justify-between gap-3">
							<div>
								<div className="text-lg font-semibold">No Print Store</div>
								<div className="text-sm text-gray-300">Create your store to start receiving orders.</div>
							</div>
							<button
								onClick={() => navigate('/owner/create-shop')}
								className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-600"
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
			<div className="max-w-7xl mx-auto">
				{pageHeader}

				{/* Filter header */}
				<div className="mb-5">
					<div className="inline-flex flex-wrap gap-2 bg-gray-900/50 border border-white/10 rounded-xl p-2">
						{STATUS_LABELS.map(({ label, value }) => {
							const active = activeTab === value;
							return (
								<button
									key={value}
									onClick={() => setActiveTab(value)}
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

				{/* Loading/Error */}
				{showSkeleton && (
					<div
						aria-busy="true"
						className={`grid grid-cols-1 gap-4 mb-4 transition-opacity duration-300 ${contentReady ? 'opacity-0' : 'opacity-100'}`}
					>
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="rounded-xl border shadow-2xl border-blue-800 bg-blue-800 p-4 animate-pulse">
								<div className="flex flex-col sm:flex-row sm:items-start gap-3">
									{/* Left skeleton section */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<div className="h-4 w-16 rounded bg-white/10" />
											<div className="h-4 w-24 rounded-full bg-white/10" />
										</div>
										<div className="mt-1 h-3 w-40 rounded bg-white/10" />
										<div className="mt-3 space-y-2">
											<div className="h-4 w-48 rounded bg-white/10" />
											<div className="h-3 w-32 rounded bg-white/10" />
											<div className="h-3 w-56 rounded bg-white/10" />
										</div>
									</div>

									{/* Right skeleton actions */}
									<div className="sm:text-right w-40 shrink-0">
										<div className="ml-auto h-5 w-24 rounded bg-white/10" />
										<div className="mt-1 h-3 w-12 rounded bg-white/10 ml-auto" />
										<div className="mt-3 h-8 w-28 rounded-lg bg-white/10 ml-auto" />
									</div>
								</div>
							</div>
						))}
					</div>
				)}
				{error && (
					<div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>
				)}

				{/* Orders list */}
				<div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
					{!loading && filtered.length === 0 && (
						<div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">No orders in this status.</div>
					)}
					{filtered.map((o) => {
						const first = o.items[0];
						const canAdvance = nextStatus(o.status);
						const total = o.subtotal ?? first?.totalPrice ?? 0;
						const currency = o.currency || first?.currency || 'PHP';
						return (
							<div key={o._id} className="rounded-xl border shadow-2xl border-blue-800 bg-blue-800 p-4">
								<div className="flex flex-col sm:flex-row sm:items-start gap-3">
									{/* Left: main info */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<div className="text-white font-semibold">{shortId(o._id)}</div>
											<span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClasses(o.status)}`}>
												{STATUS_LABELS.find((s) => s.value === o.status)?.label || o.status}
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
												<div className="text-xs text-gray-200 mt-2"><span className="text-gray-400">Notes:</span> {o.notes}</div>
											)}
										</div>
									</div>

									{/* Right: totals and actions */}
									<div className="sm:text-right">
										<div className="text-white font-semibold">{money(total, currency)}</div>
										<div className="text-xs text-gray-200">Total</div>
										<div className="mt-2 flex sm:justify-end gap-2">
											{/* The following conditional rendering and onClick handler is modified to exclude 'completed' status advancement */}
											{canAdvance && canAdvance !== 'completed' && (
												<button
													disabled={updatingId === o._id}
													onClick={() => {
														const ns = nextStatus(o.status);
														if (ns && ns !== 'completed') updateStatus(o._id, ns);
													}}
													className={`px-3 py-1.5 rounded-lg text-sm border ${
														o.status === 'pending'
															? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-500'
															: o.status === 'processing'
															? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500'
															: 'bg-green-600 border-green-600 text-white hover:bg-green-500'
													} ${updatingId === o._id ? 'opacity-60 cursor-not-allowed' : ''}`}
												>
													{updatingId === o._id ? 'Updating…' : `Mark as ${STATUS_LABELS.find((s) => s.value === canAdvance)?.label}`}
												</button>
											)}
										</div>
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
							</div>
						);
					})}
				</div>
			</div>
		</DashboardLayout>
	);
}