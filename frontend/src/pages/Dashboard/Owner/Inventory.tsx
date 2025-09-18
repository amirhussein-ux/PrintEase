import React, { useState } from "react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";

const mockSummary = {
	stockPrize: 120000,
	profit: 45000,
	expenses: 75000,
	employees: 12,
};
const mockProducts = [
	{ product: "Mug", amount: 120, minAmount: 10, entryPrice: 50, price: 80 },
	{ product: "T-shirt", amount: 80, minAmount: 5, entryPrice: 100, price: 150 },
	{ product: "Sticker", amount: 200, minAmount: 20, entryPrice: 10, price: 25 },
];

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];
// PRODUCTS will be derived from products state
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
	const [products, setProducts] = useState(mockProducts);
	const [year, setYear] = useState(2025);
	const [product, setProduct] = useState(products.length > 0 ? products[0].product : "");
	const [editIndex, setEditIndex] = useState<number | null>(null);

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

	const handleSave = () => {
		const newErrors = validateFields();
		setErrors(newErrors);
		if (Object.keys(newErrors).length > 0) return;
		if (editIndex !== null) {
			// Edit existing product
			const updated = [...products];
			updated[editIndex] = {
				product: form.product,
				amount: Number(form.amount),
				minAmount: Number(form.minAmount),
				entryPrice: Number(form.entryPrice),
				price: Number(form.price),
			};
			setProducts(updated);
			setEditIndex(null);
			setProduct(form.product); // select edited product
		} else {
			// Add new product
			setProducts([...products, {
				product: form.product,
				amount: Number(form.amount),
				minAmount: Number(form.minAmount),
				entryPrice: Number(form.entryPrice),
				price: Number(form.price),
			}]);
			setProduct(form.product); // select new product
		}
		setShowModal(false);
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

	const handleDelete = (idx: number) => {
		const updated = products.filter((_, i) => i !== idx);
		setProducts(updated);
		// If deleted product was selected, select first product or empty
		if (products[idx].product === product) {
			setProduct(updated.length > 0 ? updated[0].product : "");
		}
	};
	const handleCancel = () => setShowModal(false);

	return (
		<DashboardLayout role="owner">
			<div className="transition-all duration-300 font-crimson p-20">
				<div className="w-full max-w-7xl mx-auto space-y-6">
					{/* Summary Cards */}
					<div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
						<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
							<span className="text-2xl bg-white rounded-full p-2">🅿️</span>
							<div className="text-xl font-bold text-gray-900">P {mockSummary.stockPrize.toLocaleString()}</div>
							<div className="text-gray-800 text-xs uppercase">Stock <b>Prize</b></div>
						</div>
						<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
							<span className="text-2xl bg-white rounded-full p-2">💰</span>
							<div className="text-xl font-bold text-gray-900">P {mockSummary.profit.toLocaleString()}</div>
							<div className="text-gray-800 text-xs uppercase">Profit</div>
						</div>
						<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
							<span className="text-2xl bg-white rounded-full p-2">💸</span>
							<div className="text-xl font-bold text-gray-900">P {mockSummary.expenses.toLocaleString()}</div>
							<div className="text-gray-800 text-xs uppercase">Expenses</div>
						</div>
						<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
							<span className="text-2xl bg-white rounded-full p-2">👥</span>
							<div className="text-xl font-bold text-gray-900">{mockSummary.employees}</div>
							<div className="text-gray-800 text-xs uppercase">Employees</div>
						</div>
					</div>

					{/* Stock Amount & Stock Prize Graphs with selectors on right */}
					<div className="flex flex-col lg:flex-row gap-3 mb-8">
						<div className="flex-1 flex flex-col gap-3">
							<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col">
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
							<div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col">
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
					<div className="flex gap-4 mb-6">
						<input type="text" placeholder="Search Product" className="flex-1 px-4 py-2 rounded-lg border border-gray-400 text-lg bg-gray-800 text-white" />
						<button className="bg-blue-900 text-white rounded-lg px-6 py-2 font-bold text-lg flex items-center gap-2">🔍 Search</button>
						<button className="bg-green-400 text-black rounded-lg px-6 py-2 font-bold text-lg" onClick={handleCreate}>+ Create</button>
					</div>

					{/* Products Table */}
					<div className="bg-white/90 rounded-xl shadow-md p-4">
						<div className="font-bold text-2xl text-center mb-4">PRODUCTS</div>
						<table className="w-full border-collapse">
							<thead>
								<tr className="font-bold text-lg border-b-2 border-gray-400">
									<td>Product</td>
									<td>Amount</td>
									<td>Min. Amount</td>
									<td>Entry Price</td>
									<td>Price</td>
								</tr>
							</thead>
							<tbody>
								{products.map((p, i) => (
									<tr key={i} className="text-lg">
										<td>{p.product}</td>
										<td>{p.amount}</td>
										<td>{p.minAmount}</td>
										<td>{p.entryPrice}</td>
										<td>{p.price}</td>
										<td className="flex gap-2 items-center justify-center">
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

					{/* Modal for Create Product */}
					{showModal && (
						<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
							<div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-6 relative">
								<button className="absolute top-3 right-3 cursor-pointer" onClick={handleCancel}>✕</button>
								<div className="font-bold text-xl text-center mb-2">{editIndex !== null ? "Edit Product" : "Add Product"}</div>
								<input className="rounded-lg px-4 py-2 bg-gray-400 text-black mb-1" placeholder="Product" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
								{errors.product && <div className="text-red-500 text-xs mb-2">{errors.product}</div>}
								<input className="rounded-lg px-4 py-2 bg-gray-400 text-black mb-1" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
								{errors.amount && <div className="text-red-500 text-xs mb-2">{errors.amount}</div>}
								<input className="rounded-lg px-4 py-2 bg-gray-400 text-black mb-1" placeholder="Min. Amount" value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))} />
								{errors.minAmount && <div className="text-red-500 text-xs mb-2">{errors.minAmount}</div>}
								<input className="rounded-lg px-4 py-2 bg-gray-400 text-black mb-1" placeholder="Entry Price" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} />
								{errors.entryPrice && <div className="text-red-500 text-xs mb-2">{errors.entryPrice}</div>}
								<input className="rounded-lg px-4 py-2 bg-gray-400 text-black mb-1" placeholder="Price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
								{errors.price && <div className="text-red-500 text-xs mb-2">{errors.price}</div>}
								<div className="flex gap-4 mt-2">
									<button className="bg-red-400 text-white rounded-lg px-6 py-2 font-bold flex-1" onClick={handleCancel}>✖ Cancel</button>
									<button className="bg-green-400 text-white rounded-lg px-6 py-2 font-bold flex-1" onClick={handleSave}>✔ Save</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</DashboardLayout>
		);
};

export default Inventory;
