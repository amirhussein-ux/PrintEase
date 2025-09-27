import React, { useState, useMemo } from "react";
import { PencilSquareIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const Inventory: React.FC = () => {
    // Product state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ product: "", quantity: "", minQuantity: "", unitPrice: "" });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [products, setProducts] = useState<any[]>([]);
    const [product, setProduct] = useState("");
    const [editIndex, setEditIndex] = useState<number | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [productStatusFilter, setProductStatusFilter] = useState<"ALL" | "LOW" | "OK">("ALL");
    const [productSortKey, setProductSortKey] = useState<"product" | "quantity" | "unitPrice">("product");
    const [productSortDir, setProductSortDir] = useState<"asc" | "desc">("asc");
    const [showProductFilters, setShowProductFilters] = useState(false);

    // Employee state
    const [employees, setEmployees] = useState<any[]>([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [employeeForm, setEmployeeForm] = useState({ fullName: "", role: "" });
    const [employeeErrors, setEmployeeErrors] = useState<{ [key: string]: string }>({});
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState<"ALL" | "Manager" | "Staff">("ALL");
    const [employeeSortKey, setEmployeeSortKey] = useState<"fullName" | "role">("fullName");
    const [employeeSortDir, setEmployeeSortDir] = useState<"asc" | "desc">("asc");
    const [showEmployeeFilters, setShowEmployeeFilters] = useState(false);
    const [editEmployeeIndex, setEditEmployeeIndex] = useState<number | null>(null);

    // Graph data: aggregate by month for selected product
    const stockAmountData = MONTHS.map((month, idx) => ({
        month,
        amount: products
            .filter(p => p.product === product && new Date(p.createdAt).getMonth() === idx)
            .reduce((sum, p) => sum + Number(p.quantity), 0)
    }));
    const stockPrizeData = MONTHS.map((month, idx) => ({
        month,
        prize: products
            .filter(p => p.product === product && new Date(p.createdAt).getMonth() === idx)
            .reduce((sum, p) => sum + Number(p.unitPrice), 0)
    }));

    // Product handlers
    const handleCreate = () => {
        setShowModal(true);
        setForm({ product: "", quantity: "", minQuantity: "", unitPrice: "" });
        setErrors({});
        setEditIndex(null);
    };

    const validateFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.product.trim()) newErrors.product = "Product name is required.";
        if (!form.quantity.trim() || isNaN(Number(form.quantity))) newErrors.quantity = "Quantity must be a number.";
        if (!form.minQuantity.trim() || isNaN(Number(form.minQuantity))) newErrors.minQuantity = "Min. Quantity must be a number.";
        if (!form.unitPrice.trim() || isNaN(Number(form.unitPrice))) newErrors.unitPrice = "Unit Price must be a number.";
        return newErrors;
    };

    const generateProductId = () => {
        return "P-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000);
    };

    const handleSave = () => {
        const newErrors = validateFields();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        const now = new Date();
        if (editIndex !== null) {
            const updated = [...products];
            updated[editIndex] = {
                ...updated[editIndex],
                product: form.product,
                quantity: Number(form.quantity),
                minQuantity: Number(form.minQuantity),
                unitPrice: Number(form.unitPrice),
                createdAt: updated[editIndex].createdAt || now.toISOString(),
            };
            setProducts(updated);
            setProduct(form.product);
        } else {
            setProducts([...products, {
                productId: generateProductId(),
                product: form.product,
                quantity: Number(form.quantity),
                minQuantity: Number(form.minQuantity),
                unitPrice: Number(form.unitPrice),
                createdAt: now.toISOString(),
            }]);
            setProduct(form.product);
        }
        setShowModal(false);
    };

    const handleEdit = (idx: number) => {
        const p = products[idx];
        setForm({
            product: p.product,
            quantity: String(p.quantity),
            minQuantity: String(p.minQuantity),
            unitPrice: String(p.unitPrice),
        });
        setEditIndex(idx);
        setShowModal(true);
        setErrors({});
    };

    const handleDelete = (idx: number) => {
        const updated = products.filter((_, i) => i !== idx);
        setProducts(updated);
        if (products[idx].product === product) {
            setProduct(updated.length > 0 ? updated[0].product : "");
        }
    };

    const handleCancel = () => setShowModal(false);

    // Improved filteredProducts using useMemo (like Service Management)
    const filteredProducts = useMemo(() => {
        let base = products.filter(p => {
            const qOK =
                p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.productId && p.productId.toLowerCase().includes(searchTerm.toLowerCase()));
            let statusOK = true;
            if (productStatusFilter === "LOW") statusOK = Number(p.quantity) <= Number(p.minQuantity);
            if (productStatusFilter === "OK") statusOK = Number(p.quantity) > Number(p.minQuantity);
            return qOK && statusOK;
        });
        let sorted = [...base].sort((a, b) => {
            let cmp = 0;
            if (productSortKey === "product") cmp = a.product.localeCompare(b.product);
            else if (productSortKey === "quantity") cmp = Number(a.quantity) - Number(b.quantity);
            else if (productSortKey === "unitPrice") cmp = Number(a.unitPrice) - Number(b.unitPrice);
            return productSortDir === "asc" ? cmp : -cmp;
        });
        return sorted;
    }, [products, searchTerm, productStatusFilter, productSortKey, productSortDir]);

    // Employee filter and sort (like Service Management)
    const filteredEmployees = useMemo(() => {
        let base = employees.filter(e => {
            const qOK =
                e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                e.role.toLowerCase().includes(employeeSearch.toLowerCase());
            let roleOK = true;
            if (employeeRoleFilter !== "ALL") roleOK = e.role === employeeRoleFilter;
            return qOK && roleOK;
        });
        let sorted = [...base].sort((a, b) => {
            let cmp = 0;
            if (employeeSortKey === "fullName") cmp = a.fullName.localeCompare(b.fullName);
            else if (employeeSortKey === "role") cmp = a.role.localeCompare(b.role);
            return employeeSortDir === "asc" ? cmp : -cmp;
        });
        return sorted;
    }, [employees, employeeSearch, employeeRoleFilter, employeeSortKey, employeeSortDir]);

    // Employee handlers
    const handleAddEmployee = () => {
        setShowEmployeeModal(true);
        setEmployeeForm({ fullName: "", role: "" });
        setEmployeeErrors({});
        setEditEmployeeIndex(null);
    };

    const validateEmployeeFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!employeeForm.fullName.trim()) newErrors.fullName = "Full name is required.";
        if (!employeeForm.role.trim()) newErrors.role = "Role is required.";
        return newErrors;
    };

    const handleSaveEmployee = () => {
        const newErrors = validateEmployeeFields();
        setEmployeeErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        if (editEmployeeIndex !== null) {
            const updated = [...employees];
            updated[editEmployeeIndex] = { ...employeeForm };
            setEmployees(updated);
        } else {
            setEmployees([...employees, { ...employeeForm }]);
        }
        setShowEmployeeModal(false);
    };

    const handleEditEmployee = (idx: number) => {
        const e = employees[idx];
        setEmployeeForm({
            fullName: e.fullName,
            role: e.role,
        });
        setEditEmployeeIndex(idx);
        setShowEmployeeModal(true);
        setEmployeeErrors({});
    };

    const handleDeleteEmployee = (idx: number) => {
        const updated = employees.filter((_, i) => i !== idx);
        setEmployees(updated);
    };

    const handleCancelEmployee = () => setShowEmployeeModal(false);

    return (
        <DashboardLayout role="owner">
            <div className="transition-all duration-300 font-crimson p-8">
                <div className="w-full max-w-7xl mx-auto space-y-4">
                    {/* Summary Cards */}
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">🅿️</span>
                            <div className="text-base font-bold text-gray-900">
                                P {products.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0)}
                            </div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Stock <b>Prize</b></div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">💰</span>
                            <div className="text-base font-bold text-gray-900">P 0</div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Profit</div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">💸</span>
                            <div className="text-base font-bold text-gray-900">P 0</div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Expenses</div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">👥</span>
                            <div className="text-base font-bold text-gray-900">{employees.length}</div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Employees</div>
                        </div>
                    </div>

                    {/* Merged Graphs & Product Selection */}
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="bg-[#e7ecf7] rounded-xl shadow-md p-3 flex relative" style={{ border: "3px solid #3b4a6b" }}>
                            <div className="flex-1 flex flex-col gap-4 justify-center">
                                {/* Stock Amount Graph */}
                                <div>
                                    <h2 className="text-[0.95rem] font-bold mb-1">Stock Amount</h2>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <BarChart data={stockAmountData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" fontSize={12} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip formatter={(v: number) => [v, "Amount"]} />
                                            <Bar dataKey="amount" fill="#2a3b7c" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Stock Prize Graph */}
                                <div>
                                    <h2 className="text-[0.95rem] font-bold mb-1">Stock Prize</h2>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <BarChart data={stockPrizeData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" fontSize={12} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip formatter={(v: number) => ["₱" + v, "Prize"]} />
                                            <Bar dataKey="prize" fill="#2a3b7c" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            {/* Product selection styled and inside merged graph border */}
                            <div className="flex flex-col gap-1 ml-4 justify-center min-w-[120px]">
                                {products.map((p, idx) => (
                                    <button
                                        key={p.productId}
                                        onClick={() => setProduct(p.product)}
                                        className={`rounded-lg py-1 px-2 text-[0.85rem] font-bold uppercase transition text-left
                                            ${product === p.product
                                                ? "bg-gray-600 text-white"
                                                : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                                            }`}
                                        style={{
                                            border: product === p.product ? "2px solid #3b4a6b" : "2px solid transparent",
                                            boxShadow: product === p.product ? "0 2px 8px #3b4a6b22" : undefined,
                                        }}
                                    >
                                        {p.product}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Search + Filter Bar */}
                    <div className="flex gap-2 mb-4 items-center">
                        <input
                            type="text"
                            placeholder="Search Product"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-1 px-3 py-1 rounded-lg border border-gray-400 text-[0.95rem] bg-gray-800 text-white"
                        />
                        <button
                            className="bg-gray-800 text-white rounded-lg px-4 py-1 font-bold text-[0.95rem] flex items-center gap-2"
                            onClick={() => setShowProductFilters(v => !v)}
                            aria-haspopup="true"
                            aria-expanded={showProductFilters}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0013 14.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 017 17v-2.586a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" /></svg>
                            Filter
                        </button>
                        <button className="bg-green-400 text-black rounded-lg px-4 py-1 font-bold text-[0.95rem]" onClick={handleCreate}>+ Create</button>
                        {showProductFilters && (
                            <div className="absolute z-20 mt-2 right-8 w-72 rounded-lg border border-gray-300 bg-white p-3 shadow-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-semibold text-gray-800">Filters</div>
                                    <button
                                        className="text-xs text-gray-500 hover:text-gray-800"
                                        onClick={() => setShowProductFilters(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Stock Status</div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {(["ALL", "LOW", "OK"] as const).map((s) => (
                                                <label key={s} className="inline-flex items-center gap-1 text-xs text-gray-700">
                                                    <input
                                                        type="radio"
                                                        name="productStatusFilter"
                                                        className="h-3 w-3"
                                                        checked={productStatusFilter === s}
                                                        onChange={() => setProductStatusFilter(s)}
                                                    />
                                                    {s === "ALL" ? "All" : s === "LOW" ? "Low Stock" : "OK" ? "In Stock" : ""}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Sort by</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => { setProductSortKey("product"); setProductSortDir("asc"); }}
                                                className={`text-xs px-2 py-1 rounded border transition ${productSortKey === "product" && productSortDir === "asc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                            >
                                                Product A–Z
                                            </button>
                                            <button
                                                onClick={() => { setProductSortKey("product"); setProductSortDir("desc"); }}
                                                className={`text-xs px-2 py-1 rounded border transition ${productSortKey === "product" && productSortDir === "desc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                            >
                                                Product Z–A
                                            </button>
                                            <button
                                                onClick={() => { setProductSortKey("quantity"); setProductSortDir("desc"); }}
                                                className={`text-xs px-2 py-1 rounded border transition ${productSortKey === "quantity" && productSortDir === "desc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                            >
                                                Most Quantity
                                            </button>
                                            <button
                                                onClick={() => { setProductSortKey("quantity"); setProductSortDir("asc"); }}
                                                className={`text-xs px-2 py-1 rounded border transition ${productSortKey === "quantity" && productSortDir === "asc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                            >
                                                Least Quantity
                                            </button>
                                            <button
                                                onClick={() => { setProductSortKey("unitPrice"); setProductSortDir("desc"); }}
                                                className={`text-xs px-2 py-1 rounded border transition ${productSortKey === "unitPrice" && productSortDir === "desc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                            >
                                                Highest Price
                                            </button>
                                            <button
                                                onClick={() => { setProductSortKey("unitPrice"); setProductSortDir("asc"); }}
                                                className={`text-xs px-2 py-1 rounded border transition ${productSortKey === "unitPrice" && productSortDir === "asc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                            >
                                                Lowest Price
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Products Table */}
                    <div className="bg-white/90 rounded-xl shadow-md p-3">
                        <div className="font-bold text-lg text-center mb-2">PRODUCTS</div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[0.95rem] border-b-2 border-gray-400">
                                    <td>Product ID</td>
                                    <td>Product</td>
                                    <td>Quantity</td>
                                    <td>Min. Quantity</td>
                                    <td>Unit Price</td>
                                    <td></td>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((p, i) => (
                                    <tr key={p.productId} className="text-[0.95rem]">
                                        <td>{p.productId}</td>
                                        <td>{p.product}</td>
                                        <td>{p.quantity}</td>
                                        <td>{p.minQuantity}</td>
                                        <td>{p.unitPrice}</td>
                                        <td className="flex gap-1 items-center justify-center">
                                            <button
                                                className="p-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEdit(i)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                onClick={() => handleDelete(i)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal for Create/Edit Product */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-4 relative">
                                <button className="absolute top-2 right-2 cursor-pointer text-[1.1rem]" onClick={handleCancel}>✕</button>
                                <div className="font-bold text-lg text-center mb-2">{editIndex !== null ? "Edit Product" : "Add Product"}</div>
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Product" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
                                {errors.product && <div className="text-red-500 text-xs mb-1">{errors.product}</div>}
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Quantity" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                                {errors.quantity && <div className="text-red-500 text-xs mb-1">{errors.quantity}</div>}
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Min. Quantity" value={form.minQuantity} onChange={e => setForm(f => ({ ...f, minQuantity: e.target.value }))} />
                                {errors.minQuantity && <div className="text-red-500 text-xs mb-1">{errors.minQuantity}</div>}
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Unit Price" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                                {errors.unitPrice && <div className="text-red-500 text-xs mb-1">{errors.unitPrice}</div>}
                                <div className="flex gap-2 mt-2">
                                    <button className="bg-red-400 text-white rounded-lg px-4 py-1 font-bold flex-1 text-[0.95rem]" onClick={handleCancel}>✖ Cancel</button>
                                    <button className="bg-green-400 text-white rounded-lg px-4 py-1 font-bold flex-1 text-[0.95rem]" onClick={handleSave}>✔ Save</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Employee List Section - identical to Product Table UI */}
                    <div className="bg-white/90 rounded-xl shadow-md p-3 mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className="font-bold text-lg">Employee List</div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search Employee"
                                    value={employeeSearch}
                                    onChange={e => setEmployeeSearch(e.target.value)}
                                    className="px-3 py-1 rounded-lg border border-gray-400 text-[0.95rem] bg-gray-800 text-white"
                                />
                                <button
                                    className="bg-gray-800 text-white rounded-lg px-4 py-1 font-bold text-[0.95rem] flex items-center gap-2"
                                    onClick={() => setShowEmployeeFilters(v => !v)}
                                    aria-haspopup="true"
                                    aria-expanded={showEmployeeFilters}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0013 14.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 017 17v-2.586a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" /></svg>
                                    Filter
                                </button>
                                <button
                                    className="bg-green-400 text-black rounded-lg px-4 py-1 font-bold text-[0.95rem] flex items-center gap-2"
                                    onClick={handleAddEmployee}
                                >
                                    <UserPlusIcon className="w-4 h-4" /> Add Employee
                                </button>
                                {showEmployeeFilters && (
                                    <div className="absolute z-20 mt-2 right-8 w-64 rounded-lg border border-gray-300 bg-white p-3 shadow-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-sm font-semibold text-gray-800">Filters</div>
                                            <button
                                                className="text-xs text-gray-500 hover:text-gray-800"
                                                onClick={() => setShowEmployeeFilters(false)}
                                            >
                                                Close
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Role</div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {(["ALL", "Manager", "Staff"] as const).map((r) => (
                                                        <label key={r} className="inline-flex items-center gap-1 text-xs text-gray-700">
                                                            <input
                                                                type="radio"
                                                                name="employeeRoleFilter"
                                                                className="h-3 w-3"
                                                                checked={employeeRoleFilter === r}
                                                                onChange={() => setEmployeeRoleFilter(r)}
                                                            />
                                                            {r}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Sort by</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => { setEmployeeSortKey("fullName"); setEmployeeSortDir("asc"); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${employeeSortKey === "fullName" && employeeSortDir === "asc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                                    >
                                                        Name A–Z
                                                    </button>
                                                    <button
                                                        onClick={() => { setEmployeeSortKey("fullName"); setEmployeeSortDir("desc"); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${employeeSortKey === "fullName" && employeeSortDir === "desc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                                    >
                                                        Name Z–A
                                                    </button>
                                                    <button
                                                        onClick={() => { setEmployeeSortKey("role"); setEmployeeSortDir("asc"); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${employeeSortKey === "role" && employeeSortDir === "asc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                                    >
                                                        Role A–Z
                                                    </button>
                                                    <button
                                                        onClick={() => { setEmployeeSortKey("role"); setEmployeeSortDir("desc"); }}
                                                        className={`text-xs px-2 py-1 rounded border transition ${employeeSortKey === "role" && employeeSortDir === "desc" ? "border-blue-500 text-blue-700 bg-blue-500/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                                                    >
                                                        Role Z–A
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                    onClick={() => {
                                                        setEmployeeRoleFilter("ALL");
                                                        setEmployeeSortKey("fullName");
                                                        setEmployeeSortDir("asc");
                                                    }}
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                                                    onClick={() => setShowEmployeeFilters(false)}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[0.95rem] border-b-2 border-gray-400">
                                    <td>Full Name</td>
                                    <td>Role</td>
                                    <td></td>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((e, i) => (
                                    <tr key={i} className="text-[0.95rem]">
                                        <td>{e.fullName}</td>
                                        <td>{e.role}</td>
                                        <td className="flex gap-1 items-center justify-center">
                                            <button
                                                className="p-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEditEmployee(i)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                onClick={() => handleDeleteEmployee(i)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal for Add/Edit Employee */}
                    {showEmployeeModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-4 relative">
                                <button className="absolute top-2 right-2 cursor-pointer text-[1.1rem]" onClick={handleCancelEmployee}>✕</button>
                                <div className="font-bold text-lg text-center mb-2">{editEmployeeIndex !== null ? "Edit Employee" : "Add Employee"}</div>
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Full Name" value={employeeForm.fullName} onChange={e => setEmployeeForm(f => ({ ...f, fullName: e.target.value }))} />
                                {employeeErrors.fullName && <div className="text-red-500 text-xs mb-1">{employeeErrors.fullName}</div>}
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Role" value={employeeForm.role} onChange={e => setEmployeeForm(f => ({ ...f, role: e.target.value }))} />
                                {employeeErrors.role && <div className="text-red-500 text-xs mb-1">{employeeErrors.role}</div>}
                                <div className="flex gap-2 mt-2">
                                    <button className="bg-red-400 text-white rounded-lg px-4 py-1 font-bold flex-1 text-[0.95rem]" onClick={handleCancelEmployee}>✖ Cancel</button>
                                    <button className="bg-green-400 text-white rounded-lg px-4 py-1 font-bold flex-1 text-[0.95rem]" onClick={handleSaveEmployee}>✔ Save</button>
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