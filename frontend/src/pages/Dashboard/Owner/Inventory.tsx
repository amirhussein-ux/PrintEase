import React, { useEffect, useState } from "react";
import { PencilSquareIcon, TrashIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";

import { BanknotesIcon, ChartBarIcon, ArrowTrendingDownIcon, UsersIcon } from "@heroicons/react/24/outline";
import api from "../../../lib/api";
import { isAxiosError } from "axios";

const mockSummary = {
	stockPrice: 120000,
	profit: 45000,
	expenses: 75000,
	employees: 12,
};
type ApiInventoryItem = {
	_id: string;
	name: string;
	amount: number;
	minAmount: number;
	entryPrice: number;
	price: number;
	currency?: string;
};

type InventoryItem = {
	id: string;
	product: string;
	amount: number;
	minAmount: number;
	entryPrice: number;
	price: number;
	currency?: string;
};

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];
// PRODUCTS will be derived from products state
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function mapFromApi(i: ApiInventoryItem): InventoryItem {
	return {
		id: i._id,
		product: i.name,
		amount: i.amount ?? 0,
		minAmount: i.minAmount ?? 0,
		entryPrice: i.entryPrice ?? 0,
		price: i.price ?? 0,
		currency: i.currency,
	};
}

const ProductButtons = ({ selected, set, products }: { selected: string; set: (p: string) => void, products: Array<{ product: string }> }) => (
	<div className="flex flex-row lg:flex-col gap-2 mt-4 lg:mt-0 lg:ml-4 justify-center">
		{products.map(p => (
			<button key={p.product} onClick={() => set(p.product)}
				className={`rounded-lg py-2 text-sm font-bold uppercase transition ${
					selected === p.product ? "bg-gray-600 text-white" : "bg-gray-300 text-gray-900 hover:bg-gray-400"
				}`}>{p.product}</button>
		))}
	</div>
);

const YearSelector = ({ selected, set }: { selected: number; set: (y: number) => void }) => (
	<div className="w-32 bg-blue-900 rounded-xl shadow-md p-3">
		<h3 className="text-white text-sm font-bold text-center mb-2">Year</h3>
		<div className="grid grid-cols-2 gap-2">
			{YEARS.map(y => (
				<button key={y} onClick={() => set(y)}
					className={`rounded-lg py-2 text-sm transition ${
						selected === y ? "bg-gray-600 text-white" : "bg-gray-400 hover:bg-gray-500"
					}`}>{y}</button>
			))}
		</div>
	</div>
);

const Inventory: React.FC = () => {
	const [showModal, setShowModal] = useState(false);
	const [form, setForm] = useState({ product: "", amount: "", minAmount: "", entryPrice: "", price: "" });
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [products, setProducts] = useState<InventoryItem[]>([]);
	const [year, setYear] = useState(2025);
	const [product, setProduct] = useState("");
	const [editIndex, setEditIndex] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancel = false;
		async function load() {
			try {
				setLoading(true);
				setError(null);
				const res = await api.get("/inventory/mine");
				if (cancel) return;
				const list: InventoryItem[] = (res.data || []).map(mapFromApi);
				setProducts(list);
				setProduct(list.length ? list[0].product : "");
			} catch (e: unknown) {
				const msg = isAxiosError(e) ? (e.response?.data?.message || e.message) : (e as Error)?.message || "Failed to load inventory";
				if (!cancel) setError(msg);
			} finally {
				if (!cancel) setLoading(false);
			}
		}
		load();
		return () => { cancel = true; };
	}, []);

	   // Sales data by month (mock, similar to OwnerDashboardContent)
	   const stockAmountData = MONTHS.map((m, i) => ({
		   month: m,
		   amount: product === "MUGS" ? 120 + (i * 10) % 80 :
					product === "SHIRTS" ? 80 + (i * 8) % 60 :
					product === "DOCUMENTS" ? 200 + (i * 15) % 100 :
					150 + (i * 12) % 90
	   }));
	   const stockPrizeData = MONTHS.map((m, i) => ({
		   month: m,
		   prize: product === "MUGS" ? 100 + (i * 12) % 60 :
					product === "SHIRTS" ? 150 + (i * 10) % 80 :
					product === "DOCUMENTS" ? 180 + (i * 14) % 70 :
					130 + (i * 11) % 50
	   }));

	const handleCreate = () => {
		setShowModal(true);
		setForm({ product: "", amount: "", minAmount: "", entryPrice: "", price: "" });
		setErrors({});
	};

	const validateFields = () => {
		const newErrors: { [key: string]: string } = {};
		if (!form.product.trim()) newErrors.product = "Product name is required.";
		if (!form.amount.trim() || isNaN(Number(form.amount))) newErrors.amount = "Amount must be a number.";
		if (!form.minAmount.trim() || isNaN(Number(form.minAmount))) newErrors.minAmount = "Min. Amount must be a number.";
		if (!form.entryPrice.trim() || isNaN(Number(form.entryPrice))) newErrors.entryPrice = "Entry Price must be a number.";
		if (!form.price.trim() || isNaN(Number(form.price))) newErrors.price = "Price must be a number.";
		return newErrors;
	};

	const handleSave = async () => {
		const newErrors = validateFields();
		setErrors(newErrors);
		if (Object.keys(newErrors).length > 0) return;
		const payload = {
			name: form.product,
			amount: Number(form.amount),
			minAmount: Number(form.minAmount),
			entryPrice: Number(form.entryPrice),
			price: Number(form.price),
		};
		try {
			setError(null);
			if (editIndex !== null) {
				const id = products[editIndex]?.id;
				if (!id) return;
				const res = await api.put(`/inventory/${id}`, payload);
				const updated = mapFromApi(res.data);
				setProducts(prev => prev.map((p, i) => (i === editIndex ? updated : p)));
				setEditIndex(null);
				setProduct(updated.product);
			} else {
				const res = await api.post(`/inventory`, payload);
				const created = mapFromApi(res.data);
				setProducts(prev => [...prev, created]);
				setProduct(created.product);
			}
			setShowModal(false);
		} catch (e: unknown) {
			const msg = isAxiosError(e) ? (e.response?.data?.message || e.message) : (e as Error)?.message || "Failed to save item";
			setError(msg);
		}
	};

	const handleEdit = (idx: number) => {
		const p = products[idx];
		setForm({
			product: p.product,
			amount: String(p.amount),
			minAmount: String(p.minAmount),
			entryPrice: String(p.entryPrice),
			price: String(p.price),
		});
		setEditIndex(idx);
		setShowModal(true);
		setErrors({});
	};

	const handleDelete = async (idx: number) => {
		const item = products[idx];
		if (!item) return;
		try {
			setError(null);
			await api.delete(`/inventory/${item.id}`);
			const updated = products.filter((_, i) => i !== idx);
			setProducts(updated);
			if (item.product === product) {
				setProduct(updated.length > 0 ? updated[0].product : "");
			}
		} catch (e: unknown) {
			const msg = isAxiosError(e) ? (e.response?.data?.message || e.message) : (e as Error)?.message || "Failed to delete item";
			setError(msg);
		}
	};
	const handleCancel = () => setShowModal(false);

		return (
			<DashboardLayout role="owner">
				<div className="transition-all duration-300 font-crimson p-6 sm:p-8">
					<div className="w-full max-w-7xl mx-auto space-y-6">
						{/* Summary Cards */}
									<div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
										<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
											<span className="bg-white rounded-full p-2 flex items-center justify-center"><BanknotesIcon className="h-7 w-7 text-blue-900" /></span>
											<div className="text-xl font-bold text-gray-900">P {mockSummary.stockPrice.toLocaleString()}</div>
											<div className="text-gray-800 text-xs uppercase">Stock <b>Price</b></div>
										</div>
										<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
											<span className="bg-white rounded-full p-2 flex items-center justify-center"><ChartBarIcon className="h-7 w-7 text-green-700" /></span>
											<div className="text-xl font-bold text-gray-900">P {mockSummary.profit.toLocaleString()}</div>
											<div className="text-gray-800 text-xs uppercase">Profit</div>
										</div>
										<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
											<span className="bg-white rounded-full p-2 flex items-center justify-center"><ArrowTrendingDownIcon className="h-7 w-7 text-red-600" /></span>
											<div className="text-xl font-bold text-gray-900">P {mockSummary.expenses.toLocaleString()}</div>
											<div className="text-gray-800 text-xs uppercase">Expenses</div>
										</div>
										<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
											<span className="bg-white rounded-full p-2 flex items-center justify-center"><UsersIcon className="h-7 w-7 text-gray-700" /></span>
											<div className="text-xl font-bold text-gray-900">{mockSummary.employees}</div>
											<div className="text-gray-800 text-xs uppercase">Employees</div>
										</div>
									</div>

						{/* Stock Amount & Stock Prize Graphs with selectors on right */}
						<div className="flex flex-col lg:flex-row gap-3 mb-8">
							<div className="flex-1 flex flex-col gap-3">
								<div className="bg-white/90 rounded-xl shadow-md p-6 flex flex-col">
									<h2 className="text-base font-bold mb-4">Stock Amount</h2>
									<ResponsiveContainer width="100%" height={220}>
										<BarChart data={stockAmountData}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="month" /><YAxis allowDecimals={false} />
											<Tooltip formatter={(v: number) => [v,"Amount"]} />
											<Bar dataKey="amount" fill="#2563eb" radius={[6,6,0,0]} />
										</BarChart>
									</ResponsiveContainer>
								</div>
								<div className="bg-white/90 rounded-xl shadow-md p-6 flex flex-col">
									<h2 className="text-base font-bold mb-4">Stock Prize</h2>
									<ResponsiveContainer width="100%" height={220}>
										<BarChart data={stockPrizeData}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="month" /><YAxis allowDecimals={false} />
											<Tooltip formatter={(v: number) => ["₱"+v,"Prize"]} />
											<Bar dataKey="prize" fill="#1e3a8a" radius={[6,6,0,0]} />
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
							<div className="flex flex-col gap-4 lg:ml-6 items-end justify-start min-w-[180px]">
								<ProductButtons selected={product} set={setProduct} products={products} />
								<YearSelector selected={year} set={setYear} />
							</div>
						</div>

									{/* Search and Create Bar */}
									<div className="w-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
										<input
											type="text"
											placeholder="Search products"
											className="flex-1 rounded-lg px-4 py-2 bg-gray-900/60 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
										/>
										<div className="relative flex items-center gap-2">
											<button
												// onClick={...} // Add filter logic if needed
												className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg border border-white/10 hover:bg-gray-700 transition"
												aria-haspopup="true"
												aria-expanded="false"
											>
												<FunnelIcon className="h-5 w-5" /> Filter
											</button>
											<button
												className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-500 transition"
												onClick={handleCreate}
											>
												+ Create
											</button>
										</div>
									</div>

						{/* Products Table */}
						<div className="bg-white/90 rounded-xl shadow-md p-6">
							<div className="font-bold text-2xl text-center mb-4">PRODUCTS</div>
							{error && (
								<div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-700 px-3 py-2 text-sm">{error}</div>
							)}
							<div className="overflow-x-auto">
								<table className="w-full border-collapse">
									<thead>
										<tr className="font-bold text-lg border-b-2 border-gray-400">
											<td className="py-2">Product</td>
											<td className="py-2">Amount</td>
											<td className="py-2">Min. Amount</td>
											<td className="py-2">Entry Price</td>
											<td className="py-2">Price</td>
											<td className="py-2 text-center">Actions</td>
										</tr>
									</thead>
										<tbody>
											{loading && (
												<tr><td colSpan={6} className="py-4 text-center text-gray-500">Loading…</td></tr>
											)}
											{!loading && products.length === 0 && (
												<tr><td colSpan={6} className="py-4 text-center text-gray-500">No products yet.</td></tr>
											)}
											{!loading && products.map((p, i) => (
											<tr key={i} className="text-lg border-b border-gray-200 last:border-0 hover:bg-gray-50">
												<td className="py-2">{p.product}</td>
												<td className="py-2">{p.amount}</td>
												<td className="py-2">{p.minAmount}</td>
												<td className="py-2">{p.entryPrice}</td>
												<td className="py-2">{p.price}</td>
												<td className="py-2 flex gap-2 items-center justify-center">
													<button
														className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
														title="Edit"
														onClick={() => handleEdit(i)}
													>
														<PencilSquareIcon className="w-5 h-5" />
													</button>
													<button
														className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
														title="Delete"
														onClick={() => handleDelete(i)}
													>
														<TrashIcon className="w-5 h-5" />
													</button>
												</td>
											</tr>
											))}
									</tbody>
								</table>
							</div>
						</div>

									{/* Modal for Create/Edit Product - styled like ServiceManagement */}
									{showModal && (
										<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
											<div className="bg-gray-900 text-white rounded-xl border border-white/10 shadow-xl w-full max-w-2xl p-0 relative">
												<div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
													<div className="text-lg font-semibold">{editIndex !== null ? "Edit Product" : "Add Product"}</div>
													<button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
														<span className="text-xl">✕</span>
													</button>
												</div>
												<form onSubmit={e => { e.preventDefault(); handleSave(); }} className="p-4 sm:p-5 space-y-4">
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
														<div>
															<label className="block text-xs text-gray-300 mb-1">Product name</label>
															<input
																value={form.product}
																onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
																required
																className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
																placeholder="e.g. Custom Mug"
															/>
															{errors.product && <div className="text-red-400 text-xs mt-1">{errors.product}</div>}
														</div>
														<div>
															<label className="block text-xs text-gray-300 mb-1">Amount</label>
															<input
																type="number"
																min={0}
																value={form.amount}
																onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
																className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
																placeholder="0"
															/>
															{errors.amount && <div className="text-red-400 text-xs mt-1">{errors.amount}</div>}
														</div>
													</div>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
														<div>
															<label className="block text-xs text-gray-300 mb-1">Min. Amount</label>
															<input
																type="number"
																min={0}
																value={form.minAmount}
																onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))}
																className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
																placeholder="0"
															/>
															{errors.minAmount && <div className="text-red-400 text-xs mt-1">{errors.minAmount}</div>}
														</div>
														<div>
															<label className="block text-xs text-gray-300 mb-1">Entry Price</label>
															<input
																type="number"
																min={0}
																value={form.entryPrice}
																onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))}
																className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
																placeholder="0"
															/>
															{errors.entryPrice && <div className="text-red-400 text-xs mt-1">{errors.entryPrice}</div>}
														</div>
													</div>
													<div>
														<label className="block text-xs text-gray-300 mb-1">Price</label>
														<input
															type="number"
															min={0}
															value={form.price}
															onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
															className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
															placeholder="0"
														/>
														{errors.price && <div className="text-red-400 text-xs mt-1">{errors.price}</div>}
													</div>
													<div className="pt-2 flex justify-end gap-2">
														<button type="button" onClick={handleCancel} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10">
															Cancel
														</button>
														<button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold">
															{editIndex !== null ? "Save changes" : "Create product"}
														</button>
													</div>
												</form>
											</div>
										</div>
									)}
					</div>
				</div>
			</DashboardLayout>
		);
};

export default Inventory;
