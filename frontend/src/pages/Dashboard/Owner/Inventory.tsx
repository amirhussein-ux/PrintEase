import React, { useState, useMemo, useEffect, Fragment, useRef, useCallback } from "react";
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
    UsersIcon,
    DocumentArrowDownIcon,
    ArrowPathIcon,
    ChartBarIcon,
    CubeIcon,
    UserGroupIcon
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";
import api from "../../../lib/api";
import { isAxiosError } from "axios";
import jsPDF from 'jspdf';

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

interface DeletedInventoryItem {
    _id: string;
    originalId: string;
    name: string;
    category?: string;
    amount: number;
    minAmount: number;
    entryPrice: number;
    price: number;
    currency: string;
    deletedAt: string;
}

interface DeletedEmployee {
    _id: string;
    originalId: string;
    fullName: string;
    role: string;
    email?: string;
    phone?: string;
    active: boolean;
    deletedAt: string;
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
    // Tab state
    const [activeTab, setActiveTab] = useState<"graph" | "products" | "employee">("graph");

    // Product state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ product: "", category: "", quantity: "", minQuantity: "", unitPrice: "", entryPrice: "" });
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
    const [employeeForm, setEmployeeForm] = useState({ fullName: "", role: "", email: "", phone: "" });
    const [employeeErrors, setEmployeeErrors] = useState<{ [key: string]: string }>({});
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState<"ALL" | "Manager" | "Staff">("ALL");
    const [employeeSortKey, setEmployeeSortKey] = useState<"fullName" | "role">("fullName");
    const [employeeSortDir, setEmployeeSortDir] = useState<"asc" | "desc">("asc");
    const [showEmployeeFilters, setShowEmployeeFilters] = useState(false);
    const [editEmployeeIndex, setEditEmployeeIndex] = useState<string | null>(null);

    // Delete safeguards
    const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
    const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
    const productToDeleteName = useMemo(
        () => (deleteProductId ? products.find(p => p._id === deleteProductId)?.name || "" : ""),
        [deleteProductId, products]
    );
    const employeeToDeleteName = useMemo(
        () => (deleteEmployeeId ? employees.find(e => e._id === deleteEmployeeId)?.fullName || "" : ""),
        [deleteEmployeeId, employees]
    );

    // Deleted collections
    const [deletedProducts, setDeletedProducts] = useState<DeletedInventoryItem[]>([]);
    const [deletedEmployees, setDeletedEmployees] = useState<DeletedEmployee[]>([]);
    const [showDeletedProducts, setShowDeletedProducts] = useState(false);
    const [showDeletedEmployees, setShowDeletedEmployees] = useState(false);

    const isMountedRef = useRef(true);

    const reloadInventoryLists = useCallback(async () => {
        const [inventoryRes, deletedRes] = await Promise.all([
            api.get("/inventory/mine"),
            api.get("/inventory/deleted"),
        ]);

        if (!isMountedRef.current) return;

        const inventoryItems: InventoryItem[] = inventoryRes.data || [];
        const archivedInventory: DeletedInventoryItem[] = deletedRes.data || [];

        setProducts(inventoryItems);
        setDeletedProducts(archivedInventory);
        setProduct(current => {
            if (!inventoryItems.length) return "ALL";
            if (!current || current === "ALL") return "ALL";
            return inventoryItems.some(p => p.name === current) ? current : inventoryItems[0].name;
        });
    }, []);

    const reloadEmployeeLists = useCallback(async () => {
        const [employeeRes, deletedRes] = await Promise.all([
            api.get("/employees/mine"),
            api.get("/employees/deleted"),
        ]);

        if (!isMountedRef.current) return;

        const employeeList: Employee[] = employeeRes.data || [];
        const archivedEmployees: DeletedEmployee[] = deletedRes.data || [];

        setEmployees(employeeList);
        setDeletedEmployees(archivedEmployees);
    }, []);

    // Load data from backend
    useEffect(() => {
        let cancelled = false;
        isMountedRef.current = true;
        async function loadAll() {
            try {
                setError(null);
                await Promise.all([reloadInventoryLists(), reloadEmployeeLists()]);
            } catch (e: unknown) {
                if (!cancelled) setError(toErrorMessage(e, "Failed to load data"));
            }
        }
        loadAll();
        return () => {
            cancelled = true;
            isMountedRef.current = false;
        };
    }, [reloadInventoryLists, reloadEmployeeLists]);

    // Enhanced Graph data
    const stockAmountData = useMemo(() => {
        if (products.length === 0) {
            return [{ month: "No Data", amount: 0 }];
        }
        
        if (product && product !== "ALL") {
            const selectedProduct = products.find(p => p.name === product);
            if (!selectedProduct) return [{ month: "No Data", amount: 0 }];
            
            return [
                { month: "Current", amount: selectedProduct.amount },
                { month: "Min Required", amount: selectedProduct.minAmount }
            ];
        } else {
            const categoryData = products.reduce((acc, p) => {
                const category = p.category || "Uncategorized";
                if (!acc[category]) {
                    acc[category] = { amount: 0, minAmount: 0 };
                }
                acc[category].amount += p.amount;
                acc[category].minAmount += p.minAmount;
                return acc;
            }, {} as Record<string, { amount: number; minAmount: number }>);
            
            const entries = Object.entries(categoryData);
            if (entries.length === 0) {
                return [{ month: "No Data", amount: 0 }];
            }
            
            return entries.map(([category, data]) => ({
                month: category.length > 8 ? category.substring(0, 8) + "..." : category,
                amount: data.amount,
                minAmount: data.minAmount
            }));
        }
    }, [products, product]);

    const stockPriceData = useMemo(() => {
        if (products.length === 0) {
            return [{ month: "No Data", prize: 0 }];
        }
        
        if (product && product !== "ALL") {
            const selectedProduct = products.find(p => p.name === product);
            if (!selectedProduct) return [{ month: "No Data", prize: 0 }];
            
            return [
                { month: "Unit Price", prize: selectedProduct.price },
                { month: "Total Value", prize: selectedProduct.price * selectedProduct.amount }
            ];
        } else {
            const categoryData = products.reduce((acc, p) => {
                const category = p.category || "Uncategorized";
                if (!acc[category]) {
                    acc[category] = 0;
                }
                acc[category] += p.price * p.amount;
                return acc;
            }, {} as Record<string, number>);
            
            const entries = Object.entries(categoryData);
            if (entries.length === 0) {
                return [{ month: "No Data", prize: 0 }];
            }
            
            return entries.map(([category, value]) => ({
                month: category.length > 8 ? category.substring(0, 8) + "..." : category,
                prize: value
            }));
        }
    }, [products, product]);

    // Enhanced analytics data
    const categoryDistributionData = useMemo(() => {
        const categoryData = products.reduce((acc, p) => {
            const category = p.category || "Uncategorized";
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category]++;
            return acc;
        }, {} as Record<string, number>);

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
        
        return Object.entries(categoryData).map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length]
        }));
    }, [products]);

    const lowStockProducts = useMemo(() => {
        return products.filter(p => p.amount <= p.minAmount).length;
    }, [products]);

    // Calculate profit and expenses
    const profitAndExpenses = useMemo(() => {
        const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.amount), 0);
        const totalEntryCost = products.reduce((sum, p) => sum + (p.entryPrice * p.amount), 0);
        const grossProfit = totalStockValue - totalEntryCost;
        const profitMargin = totalEntryCost > 0 ? (grossProfit / totalEntryCost) * 100 : 0;
        const estimatedExpenses = totalEntryCost * 0.1;

        return {
            totalStockValue,
            totalEntryCost,
            grossProfit,
            profitMargin,
            estimatedExpenses
        };
    }, [products]);

    // Product handlers
    const handleCreate = () => {
        setShowModal(true);
        setForm({ product: "", category: "", quantity: "", minQuantity: "", unitPrice: "", entryPrice: "" });
        setErrors({});
        setEditIndex(null);
    };

    const validateFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.product.trim()) newErrors.product = "Product name is required.";
        if (!form.quantity.trim() || isNaN(Number(form.quantity))) newErrors.quantity = "Quantity must be a number.";
        if (!form.minQuantity.trim() || isNaN(Number(form.minQuantity))) newErrors.minQuantity = "Min. Quantity must be a number.";
        if (!form.unitPrice.trim() || isNaN(Number(form.unitPrice))) newErrors.unitPrice = "Unit Price must be a number.";
        if (!form.entryPrice.trim() || isNaN(Number(form.entryPrice))) newErrors.entryPrice = "Entry Price must be a number.";
        return newErrors;
    };

    const handleSave = async () => {
        const newErrors = validateFields();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            setError(null);
            if (editIndex !== null) {
                const res = await api.put(`/inventory/${editIndex}`, {
                    name: form.product,
                    category: form.category || undefined,
                    amount: Number(form.quantity),
                    minAmount: Number(form.minQuantity),
                    price: Number(form.unitPrice),
                    entryPrice: Number(form.entryPrice),
                });
                const updated = res.data;
                setProducts(prev => prev.map(p => p._id === editIndex ? updated : p));
                setProduct(form.product);
            } else {
                const res = await api.post("/inventory", {
                    name: form.product,
                    category: form.category || undefined,
                    amount: Number(form.quantity),
                    minAmount: Number(form.minQuantity),
                    price: Number(form.unitPrice),
                    entryPrice: Number(form.entryPrice),
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
        const p = products.find(prod => p._id === id);
        if (!p) return;
        setForm({
            product: p.name,
            category: p.category || "",
            quantity: String(p.amount),
            minQuantity: String(p.minAmount),
            unitPrice: String(p.price),
            entryPrice: String(p.entryPrice),
        });
        setEditIndex(id);
        setShowModal(true);
        setErrors({});
    };

    const confirmDeleteProduct = async () => {
        if (!deleteProductId) return;
        const id = deleteProductId;
        setDeleteProductId(null);

        try {
            setError(null);
            await api.delete(`/inventory/${id}`);
            await reloadInventoryLists();
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

    // Improved filteredProducts using useMemo
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

    // Employee filter and sort
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
        setEmployeeForm({ fullName: "", role: "", email: "", phone: "" });
        setEmployeeErrors({});
        setEditEmployeeIndex(null);
    };

    const validateEmployeeFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!employeeForm.fullName.trim()) newErrors.fullName = "Full name is required.";
        if (!employeeForm.role.trim()) newErrors.role = "Role is required.";
        if (employeeForm.email && !/\S+@\S+\.\S+/.test(employeeForm.email)) newErrors.email = "Email is invalid.";
        return newErrors;
    };

    const handleSaveEmployee = async () => {
        const newErrors = validateEmployeeFields();
        setEmployeeErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            setError(null);
            if (editEmployeeIndex !== null) {
                const res = await api.put(`/employees/${editEmployeeIndex}`, employeeForm);
                const updated = res.data;
                setEmployees(prev => prev.map(e => e._id === editEmployeeIndex ? updated : e));
            } else {
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
            email: e.email || "",
            phone: e.phone || ""
        });
        setEditEmployeeIndex(id);
        setShowEmployeeModal(true);
        setEmployeeErrors({});
    };

    const confirmDeleteEmployee = async () => {
        if (!deleteEmployeeId) return;
        const id = deleteEmployeeId;
        setDeleteEmployeeId(null);
        try {
            setError(null);
            await api.delete(`/employees/${id}`);
            await reloadEmployeeLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to delete employee"));
        }
    };

    const restoreDeletedProduct = async (archivedId: string) => {
        try {
            setError(null);
            await api.post(`/inventory/deleted/${archivedId}/restore`);
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to restore product"));
        }
    };

    const restoreDeletedEmployee = async (archivedId: string) => {
        try {
            setError(null);
            await api.post(`/employees/deleted/${archivedId}/restore`);
            await reloadEmployeeLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to restore employee"));
        }
    };

    const handleCancelEmployee = () => setShowEmployeeModal(false);

    // PDF Export function
    const exportToPDF = async () => {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            pdf.setFontSize(20);
            pdf.text('Profit & Expenses Ledger', pageWidth / 2, 20, { align: 'center' });
            
            pdf.setFontSize(12);
            pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
            
            let yPosition = 50;
            
            pdf.setFontSize(16);
            pdf.text('Summary', 20, yPosition);
            yPosition += 10;
            
            pdf.setFontSize(12);
            pdf.text(`Total Stock Value: ₱${profitAndExpenses.totalStockValue.toLocaleString()}`, 20, yPosition);
            yPosition += 8;
            pdf.text(`Total Entry Cost: ₱${profitAndExpenses.totalEntryCost.toLocaleString()}`, 20, yPosition);
            yPosition += 8;
            pdf.text(`Gross Profit: ₱${profitAndExpenses.grossProfit.toLocaleString()}`, 20, yPosition);
            yPosition += 8;
            pdf.text(`Profit Margin: ${profitAndExpenses.profitMargin.toFixed(1)}%`, 20, yPosition);
            yPosition += 8;
            pdf.text(`Estimated Expenses: ₱${profitAndExpenses.estimatedExpenses.toLocaleString()}`, 20, yPosition);
            yPosition += 15;
            
            pdf.setFontSize(16);
            pdf.text('Inventory Items', 20, yPosition);
            yPosition += 10;
            
            pdf.setFontSize(10);
            pdf.text('Product', 20, yPosition);
            pdf.text('Category', 60, yPosition);
            pdf.text('Quantity', 90, yPosition);
            pdf.text('Unit Price', 110, yPosition);
            pdf.text('Entry Price', 130, yPosition);
            pdf.text('Total Value', 150, yPosition);
            yPosition += 5;
            
            pdf.line(20, yPosition, 180, yPosition);
            yPosition += 5;
            
            filteredProducts.forEach((product) => {
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                pdf.text(product.name.substring(0, 25), 20, yPosition);
                pdf.text(product.category || '-', 60, yPosition);
                pdf.text(product.amount.toString(), 90, yPosition);
                pdf.text(`₱${product.price}`, 110, yPosition);
                pdf.text(`₱${product.entryPrice}`, 130, yPosition);
                pdf.text(`₱${(product.price * product.amount).toLocaleString()}`, 150, yPosition);
                yPosition += 6;
            });
            
            pdf.save(`profit-expenses-ledger-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        }
    };

    // Tab navigation component
    const TabButton: React.FC<{ 
        active: boolean; 
        onClick: () => void; 
        icon: React.ReactNode; 
        label: string;
        badge?: number;
    }> = ({ active, onClick, icon, label, badge }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-6 py-3 rounded-t-xl font-semibold transition-all duration-300 border-b-4 ${
                active 
                    ? 'bg-white text-blue-700 border-blue-700 shadow-lg' 
                    : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200 hover:text-gray-800'
            }`}
        >
            <div className={`p-2 rounded-lg ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                {icon}
            </div>
            <span className="text-sm">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    active ? 'bg-red-500 text-white' : 'bg-red-400 text-white'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );

    return (
        <DashboardLayout role="owner">
            <div className="transition-all duration-300 font-crimson p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
                <div className="w-full max-w-7xl mx-auto space-y-6">
                    {/* Header Section */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
                        <p className="text-gray-600">Manage your products, track analytics, and oversee employees</p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm">Total Stock Value</p>
                                    <p className="text-2xl font-bold">₱ {profitAndExpenses.totalStockValue.toLocaleString()}</p>
                                </div>
                                <BanknotesIcon className="w-8 h-8 text-blue-200" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm">Gross Profit</p>
                                    <p className={`text-2xl font-bold ${profitAndExpenses.grossProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                                        ₱ {profitAndExpenses.grossProfit.toLocaleString()}
                                    </p>
                                    <p className="text-green-100 text-xs">({profitAndExpenses.profitMargin.toFixed(1)}% margin)</p>
                                </div>
                                <CurrencyDollarIcon className="w-8 h-8 text-green-200" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-xl p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm">Low Stock Items</p>
                                    <p className="text-2xl font-bold">{lowStockProducts}</p>
                                    <p className="text-purple-100 text-xs">Need attention</p>
                                </div>
                                <ArrowTrendingDownIcon className="w-8 h-8 text-purple-200" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-xl p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm">Total Employees</p>
                                    <p className="text-2xl font-bold">{employees.length}</p>
                                    <p className="text-orange-100 text-xs">Active team members</p>
                                </div>
                                <UsersIcon className="w-8 h-8 text-orange-200" />
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-xl border border-red-400 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
                            <XMarkIcon className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="flex border-b border-gray-200">
                            <TabButton
                                active={activeTab === "graph"}
                                onClick={() => setActiveTab("graph")}
                                icon={<ChartBarIcon className="w-5 h-5" />}
                                label="Analytics & Graphs"
                            />
                            <TabButton
                                active={activeTab === "products"}
                                onClick={() => setActiveTab("products")}
                                icon={<CubeIcon className="w-5 h-5" />}
                                label="Products"
                                badge={lowStockProducts}
                            />
                            <TabButton
                                active={activeTab === "employee"}
                                onClick={() => setActiveTab("employee")}
                                icon={<UserGroupIcon className="w-5 h-5" />}
                                label="Employees"
                            />
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* Graph Tab Content */}
                            {activeTab === "graph" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Stock Levels Graph */}
                                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                                {product === "ALL" || !product ? "Stock by Category" : `${product} Stock Levels`}
                                            </h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={stockAmountData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="month" fontSize={12} />
                                                    <YAxis allowDecimals={false} fontSize={12} />
                                                    <Tooltip 
                                                        formatter={(v: number) => [v, "Amount"]}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Stock Value Graph */}
                                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                                {product === "ALL" || !product ? "Value by Category" : `${product} Price Analysis`}
                                            </h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={stockPriceData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="month" fontSize={12} />
                                                    <YAxis allowDecimals={false} fontSize={12} />
                                                    <Tooltip 
                                                        formatter={(v: number) => ["₱" + v.toLocaleString(), "Value"]}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <Bar dataKey="prize" fill="#10b981" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Category Distribution */}
                                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Distribution</h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <PieChart>
                                                    <Pie
                                                        data={categoryDistributionData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {categoryDistributionData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Product Selection */}
                                        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 lg:col-span-2">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Selection</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                <button
                                                    onClick={() => setProduct("ALL")}
                                                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                                                        product === "ALL" || !product
                                                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                                                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:shadow-sm"
                                                    }`}
                                                >
                                                    <div className="font-semibold text-sm">All Products</div>
                                                    <div className="text-xs text-gray-500 mt-1">{products.length} items</div>
                                                </button>
                                                {products.slice(0, 7).map((p) => (
                                                    <button
                                                        key={p._id}
                                                        onClick={() => setProduct(p.name)}
                                                        className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                                                            product === p.name
                                                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                                                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:shadow-sm"
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-sm truncate">{p.name}</div>
                                                        <div className="text-xs text-gray-500 mt-1">Stock: {p.amount}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Products Tab Content */}
                            {activeTab === "products" && (
                                <div className="space-y-6">
                                    {/* Search and Action Bar */}
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:w-80">
                                                <input
                                                    type="text"
                                                    placeholder="Search products, categories..."
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <FunnelIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    className="bg-gray-600 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors"
                                                    onClick={() => setShowProductFilters(v => !v)}
                                                >
                                                    <FunnelIcon className="w-4 h-4" />
                                                    Filter
                                                </button>
                                                <button
                                                    className={`rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 border transition-colors ${
                                                        showDeletedProducts 
                                                            ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' 
                                                            : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                                    }`}
                                                    onClick={() => setShowDeletedProducts(v => !v)}
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    {showDeletedProducts ? 'Active' : 'Deleted'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button 
                                                className="bg-blue-600 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors flex-1 sm:flex-none justify-center"
                                                onClick={exportToPDF}
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                                Export PDF
                                            </button>
                                            <button 
                                                className="bg-green-600 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-green-700 transition-colors flex-1 sm:flex-none justify-center"
                                                onClick={handleCreate}
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Add Product
                                            </button>
                                        </div>
                                    </div>

                                    {/* Products Table */}
                                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                        <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900">
                                            <h2 className="text-xl font-bold text-white text-center">
                                                {showDeletedProducts ? 'DELETED PRODUCTS ARCHIVE' : 'PRODUCT INVENTORY'}
                                            </h2>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr className="text-left text-sm font-semibold text-gray-700">
                                                        <th className="px-6 py-4">Product ID</th>
                                                        <th className="px-6 py-4">Product Name</th>
                                                        <th className="px-6 py-4">Category</th>
                                                        <th className="px-6 py-4 text-center">Quantity</th>
                                                        <th className="px-6 py-4 text-center">Min Qty</th>
                                                        <th className="px-6 py-4 text-right">Unit Price</th>
                                                        <th className="px-6 py-4 text-right">Entry Price</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {!showDeletedProducts && filteredProducts.map((p) => (
                                                        <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{p._id.slice(-6).toUpperCase()}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-gray-900">{p.name}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {p.category ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {p.category}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                                    p.amount <= p.minAmount 
                                                                        ? 'bg-red-100 text-red-800' 
                                                                        : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {p.amount}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-sm text-gray-600">{p.minAmount}</td>
                                                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">₱{p.price.toFixed(2)}</td>
                                                            <td className="px-6 py-4 text-right text-sm text-gray-600">₱{p.entryPrice.toFixed(2)}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="Edit"
                                                                        onClick={() => handleEdit(p._id)}
                                                                    >
                                                                        <PencilSquareIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Delete"
                                                                        onClick={() => setDeleteProductId(p._id)}
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {showDeletedProducts && deletedProducts.map((item) => (
                                                        <tr key={item._id} className="hover:bg-gray-50 transition-colors bg-red-50">
                                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.originalId.slice(-6).toUpperCase()}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-gray-900 line-through">{item.name}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {item.category ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                        {item.category}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-sm text-gray-600">{item.amount}</td>
                                                            <td className="px-6 py-4 text-center text-sm text-gray-600">{item.minAmount}</td>
                                                            <td className="px-6 py-4 text-right text-sm text-gray-600">₱{item.price.toFixed(2)}</td>
                                                            <td className="px-6 py-4 text-right text-sm text-gray-600">₱{item.entryPrice.toFixed(2)}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                                                    onClick={() => restoreDeletedProduct(item._id)}
                                                                >
                                                                    Restore
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {((!showDeletedProducts && filteredProducts.length === 0) || 
                                                      (showDeletedProducts && deletedProducts.length === 0)) && (
                                                        <tr>
                                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                                <div className="text-gray-500 text-lg">No products found</div>
                                                                <div className="text-gray-400 text-sm mt-2">
                                                                    {!showDeletedProducts ? "Try adjusting your search or add a new product" : "No deleted products to display"}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {showDeletedProducts && (
                                            <div className="p-4 bg-gray-50 border-t border-gray-200">
                                                <p className="text-sm text-gray-600 text-center">
                                                    📝 Deleted products are automatically purged after 30 days
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Employee Tab Content */}
                            {activeTab === "employee" && (
                                <div className="space-y-6">
                                    {/* Employee Search and Action Bar */}
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:w-80">
                                                <input
                                                    type="text"
                                                    placeholder="Search employees..."
                                                    value={employeeSearch}
                                                    onChange={e => setEmployeeSearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <FunnelIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    className="bg-gray-600 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors"
                                                    onClick={() => setShowEmployeeFilters(v => !v)}
                                                >
                                                    <FunnelIcon className="w-4 h-4" />
                                                    Filter
                                                </button>
                                                <button
                                                    className={`rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 border transition-colors ${
                                                        showDeletedEmployees 
                                                            ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' 
                                                            : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                                    }`}
                                                    onClick={() => setShowDeletedEmployees(v => !v)}
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    {showDeletedEmployees ? 'Active' : 'Deleted'}
                                                </button>
                                            </div>
                                        </div>
                                        <button 
                                            className="bg-green-600 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-green-700 transition-colors w-full sm:w-auto justify-center"
                                            onClick={handleAddEmployee}
                                        >
                                            <UserPlusIcon className="w-4 h-4" />
                                            Add Employee
                                        </button>
                                    </div>

                                    {/* Employees Table */}
                                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                        <div className="p-4 bg-gradient-to-r from-blue-800 to-blue-900">
                                            <h2 className="text-xl font-bold text-white text-center">
                                                {showDeletedEmployees ? 'DELETED EMPLOYEES ARCHIVE' : 'EMPLOYEE DIRECTORY'}
                                            </h2>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr className="text-left text-sm font-semibold text-gray-700">
                                                        <th className="px-6 py-4">Full Name</th>
                                                        <th className="px-6 py-4">Role</th>
                                                        <th className="px-6 py-4">Email</th>
                                                        <th className="px-6 py-4">Phone</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {!showDeletedEmployees && filteredEmployees.map((e) => (
                                                        <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-gray-900">{e.fullName}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                                    e.role === 'Manager' 
                                                                        ? 'bg-purple-100 text-purple-800' 
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                    {e.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{e.email || '-'}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{e.phone || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                                    e.active 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {e.active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="Edit"
                                                                        onClick={() => handleEditEmployee(e._id)}
                                                                    >
                                                                        <PencilSquareIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Delete"
                                                                        onClick={() => setDeleteEmployeeId(e._id)}
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {showDeletedEmployees && deletedEmployees.map((item) => (
                                                        <tr key={item._id} className="hover:bg-gray-50 transition-colors bg-red-50">
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-gray-900 line-through">{item.fullName}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                                                    {item.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{item.email || '-'}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{item.phone || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                                                    Deleted
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                                                    onClick={() => restoreDeletedEmployee(item._id)}
                                                                >
                                                                    Restore
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {((!showDeletedEmployees && filteredEmployees.length === 0) || 
                                                      (showDeletedEmployees && deletedEmployees.length === 0)) && (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                                <div className="text-gray-500 text-lg">No employees found</div>
                                                                <div className="text-gray-400 text-sm mt-2">
                                                                    {!showDeletedEmployees ? "Try adjusting your search or add a new employee" : "No deleted employees to display"}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {showDeletedEmployees && (
                                            <div className="p-4 bg-gray-50 border-t border-gray-200">
                                                <p className="text-sm text-gray-600 text-center">
                                                    📝 Deleted employees are automatically purged after 30 days
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* All modals remain exactly the same - they are preserved with original functionality */}
                {/* Confirm Delete Product Modal */}
                <Transition show={deleteProductId !== null} as={Fragment}>
                    <Dialog onClose={() => setDeleteProductId(null)} className="relative z-50">
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
                                            <Dialog.Title className="text-lg font-semibold">Delete Product</Dialog.Title>
                                            <button onClick={() => setDeleteProductId(null)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="p-4 space-y-3 text-sm">
                                            <p>Are you sure you want to delete the product{productToDeleteName ? ` "${productToDeleteName}"` : ""}? This action cannot be undone.</p>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteProductId(null)}
                                                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-1"
                                                >
                                                    <XMarkIcon className="w-4 h-4" /> Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={confirmDeleteProduct}
                                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-semibold text-sm inline-flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </DialogPanel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>

                {/* Modal for Create/Edit Product */}
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Entry Price (₱)</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={form.entryPrice}
                                                        onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))}
                                                        className={`w-full rounded-lg bg-gray-800 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${errors.entryPrice ? 'border-red-500/60' : 'border-white/10'}`}
                                                        placeholder="0.00"
                                                    />
                                                    {errors.entryPrice && <p className="mt-1 text-xs text-red-400">{errors.entryPrice}</p>}
                                                </div>
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

                {/* Confirm Delete Employee Modal */}
                <Transition show={deleteEmployeeId !== null} as={Fragment}>
                    <Dialog onClose={() => setDeleteEmployeeId(null)} className="relative z-50">
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
                                            <Dialog.Title className="text-lg font-semibold">Delete Employee</Dialog.Title>
                                            <button onClick={() => setDeleteEmployeeId(null)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="p-4 space-y-3 text-sm">
                                            <p>Are you sure you want to delete{employeeToDeleteName ? ` "${employeeToDeleteName}"` : " this employee"}? This action cannot be undone.</p>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteEmployeeId(null)}
                                                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-1"
                                                >
                                                    <XMarkIcon className="w-4 h-4" /> Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={confirmDeleteEmployee}
                                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-semibold text-sm inline-flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </DialogPanel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>

                {/* Modal for Add/Edit Employee */}
                {showEmployeeModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                            <button className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-600" onClick={handleCancelEmployee} aria-label="Close">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            <div className="font-bold text-xl text-center mb-6 text-gray-800">
                                {editEmployeeIndex !== null ? "Edit Employee" : "Add Employee"}
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                    <input 
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter full name"
                                        value={employeeForm.fullName} 
                                        onChange={e => setEmployeeForm(f => ({ ...f, fullName: e.target.value }))} 
                                    />
                                    {employeeErrors.fullName && <div className="text-red-500 text-xs mt-1">{employeeErrors.fullName}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                    <input 
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Manager, Staff"
                                        value={employeeForm.role} 
                                        onChange={e => setEmployeeForm(f => ({ ...f, role: e.target.value }))} 
                                    />
                                    {employeeErrors.role && <div className="text-red-500 text-xs mt-1">{employeeErrors.role}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                                    <input 
                                        type="email"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="employee@company.com"
                                        value={employeeForm.email} 
                                        onChange={e => setEmployeeForm(f => ({ ...f, email: e.target.value }))} 
                                    />
                                    {employeeErrors.email && <div className="text-red-500 text-xs mt-1">{employeeErrors.email}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                                    <input 
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="+1 (555) 000-0000"
                                        value={employeeForm.phone} 
                                        onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))} 
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button 
                                    className="flex-1 bg-gray-500 text-white rounded-lg px-4 py-3 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-gray-600 transition-colors"
                                    onClick={handleCancelEmployee}
                                >
                                    <XMarkIcon className="w-4 h-4" /> Cancel
                                </button>
                                <button 
                                    className="flex-1 bg-green-600 text-white rounded-lg px-4 py-3 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                                    onClick={handleSaveEmployee}
                                >
                                    <CheckIcon className="w-4 h-4" /> {editEmployeeIndex !== null ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Inventory;