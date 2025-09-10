import { useEffect, useMemo, useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../../../lib/api';

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
		options: Array<{ name: string; priceDelta: number }>;
	}>;
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

export default function OrderPage() {
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
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	// Filters (customer: sort only)
	const [showFilters, setShowFilters] = useState(false);
	const [sortKey, setSortKey] = useState<'name' | 'price'>('name');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
	const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);
	const [storeName, setStoreName] = useState<string>('');

	// Modal state
	const [selected, setSelected] = useState<Service | null>(null);
	const [variantChoices, setVariantChoices] = useState<Record<string, number>>({});
	const [quantity, setQuantity] = useState<number>(1);
	const [files, setFiles] = useState<Array<{ file: File; preview?: string }>>([]);
	const [notes, setNotes] = useState('');
	const [submitting, setSubmitting] = useState(false);


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
		const run = async () => {
			if (!derivedStoreId) return;
			setLoading(true);
			setError(null);
			try {
				const res = await api.get(`/services/store/${derivedStoreId}`);
				if (!active) return;
				setServices(res.data || []);
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
		return () => {
			active = false;
		};
	}, [derivedStoreId]);

		// Load store logo/name
		useEffect(() => {
			let active = true;
			const loadStore = async () => {
				if (!derivedStoreId) return;
				try {
					const res = await api.get('/print-store/list');
					if (!active) return;
					const list = (res.data || []) as Array<{ _id: string; name: string; logoFileId?: unknown }>;
					const found = list.find((s) => s._id === derivedStoreId);
					if (!found) return;
					setStoreName(found.name || '');
					// derive logo id robustly
					let logoId: string | undefined;
					const raw = found.logoFileId as unknown;
					if (typeof raw === 'string') logoId = raw;
					else if (raw && typeof raw === 'object') {
						const maybe = raw as { _id?: unknown; toString?: () => string };
						if (typeof maybe._id === 'string') logoId = maybe._id;
						else if (typeof maybe.toString === 'function') logoId = maybe.toString();
					}
					setStoreLogoUrl(logoId ? `${api.defaults.baseURL}/print-store/logo/${logoId}` : null);
				} catch {
					/* ignore */
				}
			};
			loadStore();
			return () => { active = false; };
		}, [derivedStoreId]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		let items = services.filter((s) =>
			[s.name, s.description, s.unit]
				.filter(Boolean)
				.some((t) => String(t).toLowerCase().includes(q))
		);

		// Sorting
		items = [...items].sort((a, b) => {
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
	}, [query, services, sortKey, sortDir]);

	return (
		<div className="w-full">
			{/* Header */}
			<div className="mt-6">
			{/* Center on desktop view */}
			<div className="max-w-4xl mx-auto px-4 lg:transform lg:-translate-x-32">
				<h1 className="text-center text-white text-2xl md:text-3xl tracking-widest font-semibold">
				SELECT A SERVICE
				</h1>
				
				<div className="mt-4">
					<div className="relative flex items-center justify-center gap-2">
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search services"
							className="block w-full max-w-md h-11 rounded-full bg-white/10 text-white placeholder:text-gray-300 px-5 focus:outline-none border border-white/20 focus:border-white/40 backdrop-blur"
							aria-label="Search services"
						/>
						<div className="relative">
							<button
								onClick={() => setShowFilters((v) => !v)}
								className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/15"
								aria-haspopup="true"
								aria-expanded={showFilters}
							>
								<FunnelIcon className="h-5 w-5" /> Filter
							</button>
							{showFilters && (
								<div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-white/10 bg-gray-900 p-3 z-20 shadow-xl">
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
									</div>
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
																																											return (
																	<li key={svc._id} className="group">
																		<div
																			className="h-full overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
																			onClick={() => {
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
														<div className="aspect-video w-full bg-white/5 overflow-hidden">
															<img src={imgSrc} alt={`${svc.name} image`} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
														</div>
													) : (
														<div className="aspect-video w-full bg-white/5 flex items-center justify-center text-white/60 text-sm">No image</div>
													)}
													<div className="p-4">
														<div className="flex items-start justify-between gap-3">
															<h3 className="text-base font-semibold text-white">{svc.name}</h3>
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
									onClick={async () => {
									if (!selected || !derivedStoreId) return;
									try {
										setSubmitting(true);
										const options = (selected.variants || []).map((v) => ({
											label: v.label,
											optionIndex: Number.isFinite(variantChoices[v.label]) ? Number(variantChoices[v.label]) : 0,
										}));
										const fd = new FormData();
										fd.append('storeId', derivedStoreId);
										fd.append('serviceId', selected._id);
										fd.append('quantity', String(safeQty));
										fd.append('notes', notes || '');
										fd.append('selectedOptions', JSON.stringify(options));
										if (Array.isArray(files)) {
											for (const f of files) {
												fd.append('files', f.file, f.file.name);
											}
										}
										const res = await api.post('/orders', fd);
										console.log('Order created', res.data);
										setSelected(null);
										setFiles([]);
										setNotes('');
									} catch (e: unknown) {
										const err = e as { response?: { data?: { message?: string } }; message?: string };
										const msg = err?.response?.data?.message || err?.message || 'Failed to place order';
										alert(msg);
									} finally {
										setSubmitting(false);
									}
								}}
								>
									{submitting ? 'Ordering…' : 'Order'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}

