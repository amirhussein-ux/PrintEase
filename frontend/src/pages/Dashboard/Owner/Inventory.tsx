import React, { useState, useMemo, useEffect, Fragment, useRef } from "react";
import { Dialog, DialogPanel, Transition } from "@headlessui/react";
import {
    PencilSquareIcon,
    TrashIcon,
    UserPlusIcon,
    FunnelIcon,
    PlusIcon,
    XMarkIcon,
    CheckIcon,
    BanknotesIcon,
    CurrencyDollarIcon,
    ArrowTrendingDownIcon,
    UsersIcon
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";
import api from "../../../lib/api";
import { isAxiosError } from "axios";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Types
interface InventoryItem {
    _id: string;
    name: string;
    category?: string;
    amount: number;
    minAmount: number;
    entryPrice: number;
    price: number;
    currency: string;
    createdAt: string;
}

interface Employee {
    _id: string;
    fullName: string;
    role: string;
    email?: string;
    phone?: string;
    active: boolean;
    createdAt: string;
}

function toErrorMessage(e: unknown, fallback: string): string {
    if (isAxiosError(e)) {
        const data = e.response?.data as { message?: string } | undefined;
        return data?.message || e.message || fallback;
    }
    if (e instanceof Error) return e.message || fallback;
    return fallback;
}

const Inventory: React.FC = () => {
    // Product state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ product: "", category: "", quantity: "", minQuantity: "", unitPrice: "" });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [product, setProduct] = useState("");
    const [editIndex, setEditIndex] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [productStatusFilter, setProductStatusFilter] = useState<"ALL" | "LOW" | "OK">("ALL");
    const [productSortKey, setProductSortKey] = useState<"product" | "quantity" | "unitPrice">("product");
    const [productSortDir, setProductSortDir] = useState<"asc" | "desc">("asc");
    const [showProductFilters, setShowProductFilters] = useState(false);

    // Employee state
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [employeeForm, setEmployeeForm] = useState({ fullName: "", role: "" });
    const [employeeErrors, setEmployeeErrors] = useState<{ [key: string]: string }>({});
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState<"ALL" | "Manager" | "Staff">("ALL");
    const [employeeSortKey, setEmployeeSortKey] = useState<"fullName" | "role">("fullName");
    const [employeeSortDir, setEmployeeSortDir] = useState<"asc" | "desc">("asc");
    const [showEmployeeFilters, setShowEmployeeFilters] = useState(false);
    const [editEmployeeIndex, setEditEmployeeIndex] = useState<string | null>(null);

    // Load data from backend
    useEffect(() => {
        let cancelled = false;
        async function loadData() {
            try {
                // (loading indicator removed)
                setError(null);
                
                // Load inventory items
                const inventoryRes = await api.get("/inventory/mine");
                if (cancelled) return;
                const inventoryItems: InventoryItem[] = inventoryRes.data || [];
                setProducts(inventoryItems);
                
                // Load employees
                const employeeRes = await api.get("/employees/mine");
                if (cancelled) return;
                const employeeList: Employee[] = employeeRes.data || [];
                setEmployees(employeeList);
                
                // Set first product as selected if available
                if (inventoryItems.length > 0 && !product) {
                    setProduct(inventoryItems[0].name);
                }
            } catch (e: unknown) {
                if (!cancelled) setError(toErrorMessage(e, "Failed to load data"));
            } finally {
                // (loading indicator removed)
            }
        }
        loadData();
        return () => {
            cancelled = true;
        };
    }, [product]);

    // Graph data: aggregate by month for selected product
    const stockAmountData = MONTHS.map((month, idx) => ({
        month,
        amount: products
            .filter(p => p.name === product && new Date(p.createdAt).getMonth() === idx)
            .reduce((sum, p) => sum + Number(p.amount), 0)
    }));
    const stockPrizeData = MONTHS.map((month, idx) => ({
        month,
        prize: products
            .filter(p => p.name === product && new Date(p.createdAt).getMonth() === idx)
            .reduce((sum, p) => sum + Number(p.price), 0)
    }));

    // Product handlers
    const handleCreate = () => {
        setShowModal(true);
    setForm({ product: "", category: "", quantity: "", minQuantity: "", unitPrice: "" });
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

    // removed unused generateProductId that was part of previous local-only ID creation

    const handleSave = async () => {
        const newErrors = validateFields();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            setError(null);
            if (editIndex !== null) {
                // Update existing item
                const res = await api.put(`/inventory/${editIndex}`, {
                    name: form.product,
                    category: form.category || undefined,
                    amount: Number(form.quantity),
                    minAmount: Number(form.minQuantity),
                    price: Number(form.unitPrice),
                });
                const updated = res.data;
                setProducts(prev => prev.map(p => p._id === editIndex ? updated : p));
                setProduct(form.product);
            } else {
                // Create new item
                const res = await api.post("/inventory", {
                    name: form.product,
                    category: form.category || undefined,
                    amount: Number(form.quantity),
                    minAmount: Number(form.minQuantity),
                    price: Number(form.unitPrice),
                });
                const created = res.data;
                setProducts(prev => [created, ...prev]);
                setProduct(form.product);
            }
            setShowModal(false);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to save product"));
        }
    };

    const handleEdit = (id: string) => {
        const p = products.find(prod => prod._id === id);
        if (!p) return;
        setForm({
            product: p.name,
            category: p.category || "",
            quantity: String(p.amount),
            minQuantity: String(p.minAmount),
            unitPrice: String(p.price),
        });
        setEditIndex(id);
        setShowModal(true);
        setErrors({});
    };

    const handleDelete = async (id: string) => {
        try {
            setError(null);
            await api.delete(`/inventory/${id}`);
            const updated = products.filter(p => p._id !== id);
            setProducts(updated);
            const deletedProduct = products.find(p => p._id === id);
            if (deletedProduct && deletedProduct.name === product) {
                setProduct(updated.length > 0 ? updated[0].name : "");
            }
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to delete product"));
        }
    };

    const handleCancel = () => setShowModal(false);

    // Category dropdown state
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [categoryHighlight, setCategoryHighlight] = useState<number>(-1);
    const categoryWrapperRef = useRef<HTMLDivElement | null>(null);
    const categoryInputRef = useRef<HTMLInputElement | null>(null);

    const categorySuggestions = useMemo(() => {
        const set = new Set<string>();
        products.forEach(p => { if (p.category) set.add(p.category); });
        return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }, [products]);

    const filteredCategorySuggestions = useMemo(() => {
        if (!form.category.trim()) return categorySuggestions;
        const q = form.category.toLowerCase();
        return categorySuggestions.filter(c => c.toLowerCase().includes(q));
    }, [form.category, categorySuggestions]);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!categoryWrapperRef.current) return;
            if (categoryWrapperRef.current.contains(e.target as Node)) return;
            setShowCategoryMenu(false);
            setCategoryHighlight(-1);
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    function openCategoryMenu() {
        if (!categorySuggestions.length) return;
        setShowCategoryMenu(true);
        setCategoryHighlight(-1);
    }

    function selectCategory(value: string) {
        setForm(f => ({ ...f, category: value }));
        setShowCategoryMenu(false);
        setCategoryHighlight(-1);
        // re-focus input for quick editing
        requestAnimationFrame(()=>categoryInputRef.current?.focus());
    }

    function onCategoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!showCategoryMenu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            openCategoryMenu();
            e.preventDefault();
            return;
        }
        if (!showCategoryMenu) return;
        if (e.key === 'Escape') {
            setShowCategoryMenu(false);
            setCategoryHighlight(-1);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCategoryHighlight(h => {
                const list = filteredCategorySuggestions;
                if (!list.length) return -1;
                const next = h + 1 >= list.length ? 0 : h + 1;
                return next;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCategoryHighlight(h => {
                const list = filteredCategorySuggestions;
                if (!list.length) return -1;
                const next = h - 1 < 0 ? list.length - 1 : h - 1;
                return next;
            });
        } else if (e.key === 'Enter') {
            if (categoryHighlight >= 0 && categoryHighlight < filteredCategorySuggestions.length) {
                e.preventDefault();
                selectCategory(filteredCategorySuggestions[categoryHighlight]);
            }
        }
    }

    // Improved filteredProducts using useMemo (like Service Management)
    const filteredProducts = useMemo(() => {
    const base = products.filter(p => {
            const qOK =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p._id && p._id.toLowerCase().includes(searchTerm.toLowerCase()));
            let statusOK = true;
            if (productStatusFilter === "LOW") statusOK = Number(p.amount) <= Number(p.minAmount);
            if (productStatusFilter === "OK") statusOK = Number(p.amount) > Number(p.minAmount);
            return qOK && statusOK;
        });
    const sorted = [...base].sort((a, b) => {
            let cmp = 0;
            if (productSortKey === "product") cmp = a.name.localeCompare(b.name);
            else if (productSortKey === "quantity") cmp = Number(a.amount) - Number(b.amount);
            else if (productSortKey === "unitPrice") cmp = Number(a.price) - Number(b.price);
            return productSortDir === "asc" ? cmp : -cmp;
        });
        return sorted;
    }, [products, searchTerm, productStatusFilter, productSortKey, productSortDir]);

    // Employee filter and sort (like Service Management)
    const filteredEmployees = useMemo(() => {
    const base = employees.filter(e => {
            const qOK =
                e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                e.role.toLowerCase().includes(employeeSearch.toLowerCase());
            let roleOK = true;
            if (employeeRoleFilter !== "ALL") roleOK = e.role === employeeRoleFilter;
            return qOK && roleOK;
        });
    const sorted = [...base].sort((a, b) => {
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

    const handleSaveEmployee = async () => {
        const newErrors = validateEmployeeFields();
        setEmployeeErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            setError(null);
            if (editEmployeeIndex !== null) {
                // Update existing employee
                const res = await api.put(`/employees/${editEmployeeIndex}`, employeeForm);
                const updated = res.data;
                setEmployees(prev => prev.map(e => e._id === editEmployeeIndex ? updated : e));
            } else {
                // Create new employee
                const res = await api.post("/employees", employeeForm);
                const created = res.data;
                setEmployees(prev => [created, ...prev]);
            }
            setShowEmployeeModal(false);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to save employee"));
        }
    };

    const handleEditEmployee = (id: string) => {
        const e = employees.find(emp => emp._id === id);
        if (!e) return;
        setEmployeeForm({
            fullName: e.fullName,
            role: e.role,
        });
        setEditEmployeeIndex(id);
        setShowEmployeeModal(true);
        setEmployeeErrors({});
    };

    const handleDeleteEmployee = async (id: string) => {
        try {
            setError(null);
            await api.delete(`/employees/${id}`);
            const updated = employees.filter(e => e._id !== id);
            setEmployees(updated);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to delete employee"));
        }
    };

    const handleCancelEmployee = () => setShowEmployeeModal(false);

    return (
        <DashboardLayout role="owner">
            <div className="transition-all duration-300 font-crimson p-8">
                <div className="w-full max-w-7xl mx-auto space-y-4">
                    {/* Summary Cards */}
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <BanknotesIcon className="w-5 h-5 text-gray-700" />
                            </span>
                            <div className="text-base font-bold text-gray-900">
                                P {products.reduce((sum, p) => sum + (p.price * p.amount), 0)}
                            </div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Stock Price</div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                            </span>
                            <div className="text-base font-bold text-gray-900">P 0</div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Profit</div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
                            </span>
                            <div className="text-base font-bold text-gray-900">P 0</div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Expenses</div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <UsersIcon className="w-5 h-5 text-blue-700" />
                            </span>
                            <div className="text-base font-bold text-gray-900">{employees.length}</div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Employees</div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>
                    )}

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
                                {products.map((p) => (
                                    <button
                                        key={p._id}
                                        onClick={() => setProduct(p.name)}
                                        className={`rounded-lg py-1 px-2 text-[0.85rem] font-bold uppercase transition text-left
                                            ${product === p.name
                                                ? "bg-gray-600 text-white"
                                                : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                                            }`}
                                        style={{
                                            border: product === p.name ? "2px solid #3b4a6b" : "2px solid transparent",
                                            boxShadow: product === p.name ? "0 2px 8px #3b4a6b22" : undefined,
                                        }}
                                    >
                                        {p.name}
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
                            className="bg-gray-800 text-white rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-2"
                            onClick={() => setShowProductFilters(v => !v)}
                            aria-haspopup="true"
                            aria-expanded={showProductFilters}
                        >
                            <FunnelIcon className="w-5 h-5" />
                            Filter
                        </button>
                        <button className="bg-green-400 text-black rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-1" onClick={handleCreate}>
                            <PlusIcon className="w-5 h-5" /> Create
                        </button>
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
                                                    {s === "ALL" ? "All" : s === "LOW" ? "Low Stock" : s === "OK" ? "In Stock" : ""}
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
                                    <td>Category</td>
                                    <td>Quantity</td>
                                    <td>Min. Quantity</td>
                                    <td>Unit Price</td>
                                    <td></td>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((p) => (
                                    <tr key={p._id} className="text-[0.95rem]">
                                        <td>{p._id.slice(-6).toUpperCase()}</td>
                                        <td>{p.name}</td>
                                        <td>{p.category || '-'}</td>
                                        <td>{p.amount}</td>
                                        <td>{p.minAmount}</td>
                                        <td>{p.price}</td>
                                        <td className="flex gap-1 items-center justify-center">
                                            <button
                                                className="p-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEdit(p._id)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                onClick={() => handleDelete(p._id)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal for Create/Edit Product (headlessui for cohesive styling) */}
                    <Transition show={showModal} as={Fragment}>
                        <Dialog onClose={handleCancel} className="relative z-50">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="fixed inset-0 bg-black/50" />
                            </Transition.Child>
                            <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 flex items-center justify-center min-h-screen">
                                <div className="w-full max-w-md">
                                    <Transition.Child
                                        as={Fragment}
                                        enter="ease-out duration-200"
                                        enterFrom="opacity-0 translate-y-2"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 translate-y-1"
                                    >
                                        <DialogPanel className="rounded-xl bg-gray-900 text-white border border-white/10 shadow-xl">
                                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                                <Dialog.Title className="text-lg font-semibold">{editIndex !== null ? "Edit Product" : "Add Product"}</Dialog.Title>
                                                <button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <form
                                                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                                                className="p-4 space-y-4"
                                            >
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Product Name</label>
                                                    <input
                                                        value={form.product}
                                                        onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                                                        className={`w-full rounded-lg bg-gray-800 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm placeholder-gray-400 ${errors.product ? 'border-red-500/60' : 'border-white/10'}`}
                                                        placeholder="e.g. A4 Bond Paper"
                                                        autoFocus
                                                    />
                                                    {errors.product && <p className="mt-1 text-xs text-red-400">{errors.product}</p>}
                                                </div>
                                                <div ref={categoryWrapperRef} className="relative">
                                                    <label className="block text-xs text-gray-300 mb-1">Category (optional)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            ref={categoryInputRef}
                                                            value={form.category}
                                                            onChange={e => { setForm(f => ({ ...f, category: e.target.value })); if (!showCategoryMenu) openCategoryMenu(); }}
                                                            onFocus={() => openCategoryMenu()}
                                                            onKeyDown={onCategoryKeyDown}
                                                            placeholder={categorySuggestions.length ? "Search or type category" : "Type a category"}
                                                            className="flex-1 rounded-md border border-white/10 bg-gray-800 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                            aria-expanded={showCategoryMenu}
                                                            aria-haspopup="listbox"
                                                            aria-controls="category-menu"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => showCategoryMenu ? setShowCategoryMenu(false) : openCategoryMenu()}
                                                            className="shrink-0 rounded-md border border-white/10 bg-gray-800 p-2 text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                            aria-label="Toggle categories"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`}>
                                                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.189l3.71-3.96a.75.75 0 111.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    {showCategoryMenu && (
                                                        <div
                                                            id="category-menu"
                                                            role="listbox"
                                                            className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-white/10 bg-gray-900 shadow-lg focus:outline-none"
                                                        >
                                                            <div className="max-h-56 overflow-auto py-1 text-sm">
                                                                {filteredCategorySuggestions.length === 0 && (
                                                                    <div className="px-3 py-2 text-xs text-gray-500">No matches. Press Enter to keep "{form.category}"</div>
                                                                )}
                                                                {filteredCategorySuggestions.map((c, idx) => (
                                                                    <div
                                                                        key={c}
                                                                        role="option"
                                                                        aria-selected={form.category === c}
                                                                        onMouseDown={(e) => { e.preventDefault(); selectCategory(c); }}
                                                                        onMouseEnter={() => setCategoryHighlight(idx)}
                                                                        className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-gray-200 hover:bg-white/10 ${idx === categoryHighlight ? 'bg-white/10' : ''}`}
                                                                    >
                                                                        <span className="truncate">{c}</span>
                                                                        {form.category === c && <span className="ml-auto text-[10px] rounded bg-blue-600/20 px-1.5 py-0.5 text-blue-300">Selected</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {form.category && !filteredCategorySuggestions.includes(form.category) && (
                                                                <div className="border-t border-white/5 bg-gray-800/60 px-3 py-2 text-[11px] text-gray-400">Press Enter to use custom category</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs text-gray-300 mb-1">Quantity</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={form.quantity}
                                                            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                                            className={`w-full rounded-lg bg-gray-800 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${errors.quantity ? 'border-red-500/60' : 'border-white/10'}`}
                                                            placeholder="0"
                                                        />
                                                        {errors.quantity && <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-300 mb-1">Min. Quantity</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={form.minQuantity}
                                                            onChange={e => setForm(f => ({ ...f, minQuantity: e.target.value }))}
                                                            className={`w-full rounded-lg bg-gray-800 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${errors.minQuantity ? 'border-red-500/60' : 'border-white/10'}`}
                                                            placeholder="0"
                                                        />
                                                        {errors.minQuantity && <p className="mt-1 text-xs text-red-400">{errors.minQuantity}</p>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Unit Price (₱)</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={form.unitPrice}
                                                        onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                                                        className={`w-full rounded-lg bg-gray-800 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${errors.unitPrice ? 'border-red-500/60' : 'border-white/10'}`}
                                                        placeholder="0.00"
                                                    />
                                                    {errors.unitPrice && <p className="mt-1 text-xs text-red-400">{errors.unitPrice}</p>}
                                                </div>
                                                <div className="pt-2 flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleCancel}
                                                        className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-1"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" /> Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-sm inline-flex items-center gap-1"
                                                    >
                                                        <CheckIcon className="w-4 h-4" /> {editIndex !== null ? 'Save changes' : 'Create product'}
                                                    </button>
                                                </div>
                                            </form>
                                        </DialogPanel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>

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
                                    className="bg-gray-800 text-white rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-2"
                                    onClick={() => setShowEmployeeFilters(v => !v)}
                                    aria-haspopup="true"
                                    aria-expanded={showEmployeeFilters}
                                >
                                    <FunnelIcon className="w-5 h-5" />
                                    Filter
                                </button>
                                <button
                                    className="bg-green-400 text-black rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-2"
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
                                {filteredEmployees.map((e) => (
                                    <tr key={e._id} className="text-[0.95rem]">
                                        <td>{e.fullName}</td>
                                        <td>{e.role}</td>
                                        <td className="flex gap-1 items-center justify-center">
                                            <button
                                                className="p-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEditEmployee(e._id)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                onClick={() => handleDeleteEmployee(e._id)}
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
                                <button className="absolute top-2 right-2 cursor-pointer text-[1.1rem]" onClick={handleCancelEmployee} aria-label="Close">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                                <div className="font-bold text-lg text-center mb-2">{editEmployeeIndex !== null ? "Edit Employee" : "Add Employee"}</div>
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Full Name" value={employeeForm.fullName} onChange={e => setEmployeeForm(f => ({ ...f, fullName: e.target.value }))} />
                                {employeeErrors.fullName && <div className="text-red-500 text-xs mb-1">{employeeErrors.fullName}</div>}
                                <input className="rounded-lg px-3 py-1 bg-gray-400 text-black mb-1 text-[0.95rem]" placeholder="Role" value={employeeForm.role} onChange={e => setEmployeeForm(f => ({ ...f, role: e.target.value }))} />
                                {employeeErrors.role && <div className="text-red-500 text-xs mb-1">{employeeErrors.role}</div>}
                                <div className="flex gap-2 mt-2">
                                    <button className="bg-red-400 text-white rounded-lg px-4 py-1 font-bold flex-1 text-[0.95rem] inline-flex items-center justify-center gap-1" onClick={handleCancelEmployee}>
                                        <XMarkIcon className="w-4 h-4" /> Cancel
                                    </button>
                                    <button className="bg-green-400 text-white rounded-lg px-4 py-1 font-bold flex-1 text-[0.95rem] inline-flex items-center justify-center gap-1" onClick={handleSaveEmployee}>
                                        <CheckIcon className="w-4 h-4" /> Save
                                    </button>
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