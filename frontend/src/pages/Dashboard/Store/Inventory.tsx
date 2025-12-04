import React, { useState, useMemo, useEffect, Fragment, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogPanel, Transition } from "@headlessui/react";
import {
    PencilSquareIcon,
    UserPlusIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
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
    UserGroupIcon,
    ArchiveBoxIcon
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
    avatar?: string;
    avatarUrl?: string;
}

interface ArchivedInventoryItem {
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

interface ArchivedEmployee {
    _id: string;
    originalId: string;
    fullName: string;
    role: string;
    email?: string;
    phone?: string;
    active: boolean;
    deletedAt: string;
    avatar?: string;
    avatarUrl?: string;
}

interface EmployeeFormState {
    fullName: string;
    role: string;
    email: string;
    phone: string;
}

const createEmptyEmployeeForm = (): EmployeeFormState => ({
    fullName: "",
    role: "",
    email: "",
    phone: "",
});

const createEmptyProductForm = () => ({
    product: "",
    category: "",
    quantity: "",
    minQuantity: "",
    unitPrice: "",
    entryPrice: "",
});

function toErrorMessage(e: unknown, fallback: string): string {
    if (isAxiosError(e)) {
        const data = e.response?.data as { message?: string } | undefined;
        return data?.message || e.message || fallback;
    }
    if (e instanceof Error) return e.message || fallback;
    return fallback;
}

const PANEL_SURFACE = 'rounded-2xl border border-gray-200/80 dark:border-gray-600 bg-white/90 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm dark:shadow-none';
const INPUT_SURFACE = 'rounded-xl border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 backdrop-blur-sm';
const MUTED_TEXT = 'text-gray-600 dark:text-gray-300';

const Inventory: React.FC = () => {
    const canManageEmployees = true;
    const hasInventoryAccess = true;
    const canViewEmployees = true;

    const [activeTab, setActiveTab] = useState<"graph" | "products" | "employee">("graph");
    const location = useLocation();

    useEffect(() => {
        try {
            const p = location.pathname || "";
            if (p.includes("/dashboard/inventory/products")) setActiveTab("products");
            else if (p.includes("/dashboard/inventory/employees")) setActiveTab("employee");
            else if (p.includes("/dashboard/inventory/analytics") || p.includes("/dashboard/inventory")) setActiveTab("graph");
        } catch {
            // ignore
        }
    }, [location.pathname]);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(createEmptyProductForm);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [product, setProduct] = useState("");
    const [editIndex, setEditIndex] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [employeeForm, setEmployeeForm] = useState({ fullName: "", role: "", email: "", phone: "" });
    const [employeeErrors, setEmployeeErrors] = useState<{ [key: string]: string }>({});
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [editEmployeeIndex, setEditEmployeeIndex] = useState<string | null>(null);

    const [archiveProductId, setArchiveProductId] = useState<string | null>(null);
    const [archiveEmployeeId, setArchiveEmployeeId] = useState<string | null>(null);
    
    const productToArchiveName = useMemo(
        () => (archiveProductId ? products.find(p => p._id === archiveProductId)?.name || "" : ""),
        [archiveProductId, products]
    );
    const employeeToArchiveName = useMemo(
        () => (archiveEmployeeId ? employees.find(e => e._id === archiveEmployeeId)?.fullName || "" : ""),
        [archiveEmployeeId, employees]
    );

    const [archivedProducts, setArchivedProducts] = useState<ArchivedInventoryItem[]>([]);
    const [archivedEmployees, setArchivedEmployees] = useState<ArchivedEmployee[]>([]);
    const [showArchivedProducts, setShowArchivedProducts] = useState(false);
    const [showArchivedEmployees, setShowArchivedEmployees] = useState(false);

    // DARK MODE DETECTION
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!canManageEmployees) {
            setShowArchivedEmployees(false);
            if (showEmployeeModal) {
                setShowEmployeeModal(false);
            }
        }
    }, [canManageEmployees, showEmployeeModal]);

    const isMountedRef = useRef(true);

    const reloadInventoryLists = useCallback(async () => {
        if (!hasInventoryAccess) {
            if (isMountedRef.current) {
                setProducts([]);
                setArchivedProducts([]);
            }
            return;
        }
        const [inventoryRes, deletedRes] = await Promise.all([
            api.get("/inventory/mine"),
            api.get("/inventory/deleted"),
        ]);

        if (!isMountedRef.current) return;

        const inventoryItems: InventoryItem[] = inventoryRes.data || [];
        const archivedInventory: ArchivedInventoryItem[] = deletedRes.data || [];

        setProducts(inventoryItems);
        setArchivedProducts(archivedInventory);
        setProduct(current => {
            if (!inventoryItems.length) return "ALL";
            if (!current || current === "ALL") return "ALL";
            return inventoryItems.some(p => p.name === current) ? current : inventoryItems[0].name;
        });
    }, [hasInventoryAccess]);

    const reloadEmployeeLists = useCallback(async () => {
        if (!canViewEmployees) {
            if (isMountedRef.current) {
                setEmployees([]);
                setArchivedEmployees([]);
            }
            return;
        }

        const employeePromise = api.get("/employees/mine");
        const deletedPromise = canManageEmployees ? api.get("/employees/deleted") : null;
        const employeeRes = await employeePromise;
        const deletedRes = deletedPromise ? await deletedPromise : null;

        if (!isMountedRef.current) return;

        const employeeList: Employee[] = employeeRes.data || [];
        const archivedEmpList: ArchivedEmployee[] = deletedRes?.data || [];

        setEmployees(employeeList);
        setArchivedEmployees(archivedEmpList);
    }, [canViewEmployees, canManageEmployees]);

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

    const stockAmountData = useMemo(() => {
        if (products.length === 0) return [{ month: "No Data", amount: 0 }];
        
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
                if (!acc[category]) acc[category] = { amount: 0, minAmount: 0 };
                acc[category].amount += p.amount;
                acc[category].minAmount += p.minAmount;
                return acc;
            }, {} as Record<string, { amount: number; minAmount: number }>);
            
            const entries = Object.entries(categoryData);
            if (entries.length === 0) return [{ month: "No Data", amount: 0 }];
            
            return entries.map(([category, data]) => ({
                month: category.length > 8 ? category.substring(0, 8) + "..." : category,
                amount: data.amount,
                minAmount: data.minAmount
            }));
        }
    }, [products, product]);

    const stockPriceData = useMemo(() => {
        if (products.length === 0) return [{ month: "No Data", prize: 0 }];
        
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
                if (!acc[category]) acc[category] = 0;
                acc[category] += p.price * p.amount;
                return acc;
            }, {} as Record<string, number>);
            
            const entries = Object.entries(categoryData);
            if (entries.length === 0) return [{ month: "No Data", prize: 0 }];
            
            return entries.map(([category, value]) => ({
                month: category.length > 8 ? category.substring(0, 8) + "..." : category,
                prize: value
            }));
        }
    }, [products, product]);

    const categoryDistributionData = useMemo(() => {
        const categoryData = products.reduce((acc, p) => {
            const category = p.category || "Uncategorized";
            if (!acc[category]) acc[category] = 0;
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

    const profitAndExpenses = useMemo(() => {
        const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.amount), 0);
        const totalEntryCost = products.reduce((sum, p) => sum + (p.entryPrice * p.amount), 0);
        const grossProfit = totalStockValue - totalEntryCost;
        const profitMargin = totalEntryCost > 0 ? (grossProfit / totalEntryCost) * 100 : 0;
        const estimatedExpenses = totalEntryCost * 0.1;

        return { totalStockValue, totalEntryCost, grossProfit, profitMargin, estimatedExpenses };
    }, [products]);

    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [categoryHighlight, setCategoryHighlight] = useState<number>(-1);
    const categoryWrapperRef = useRef<HTMLDivElement | null>(null);
    const categoryInputRef = useRef<HTMLInputElement | null>(null);

    const categorySuggestions = useMemo(() => {
        const set = new Set<string>();
        products.forEach(p => { if (p.category) set.add(p.category); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
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
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const resetProductForm = () => {
        setForm(createEmptyProductForm());
        setErrors({});
        setEditIndex(null);
    };

    const validateProductFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.product.trim()) newErrors.product = "Product name is required.";
        const qty = Number(form.quantity);
        if (!Number.isFinite(qty) || qty < 0) newErrors.quantity = "Quantity must be a non-negative number.";
        const minQty = Number(form.minQuantity);
        if (!Number.isFinite(minQty) || minQty < 0) newErrors.minQuantity = "Min quantity must be a non-negative number.";
        const unitPrice = Number(form.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) newErrors.unitPrice = "Unit price must be a non-negative number.";
        const entryPrice = Number(form.entryPrice);
        if (!Number.isFinite(entryPrice) || entryPrice < 0) newErrors.entryPrice = "Entry price must be a non-negative number.";
        return newErrors;
    };

    const handleCreate = () => {
        resetProductForm();
        setShowModal(true);
    };

    const handleEdit = (id: string) => {
        const item = products.find(p => p._id === id);
        if (!item) return;
        setForm({
            product: item.name,
            category: item.category || "",
            quantity: String(item.amount ?? ""),
            minQuantity: String(item.minAmount ?? ""),
            unitPrice: String(item.price ?? ""),
            entryPrice: String(item.entryPrice ?? ""),
        });
        setErrors({});
        setEditIndex(id);
        setShowModal(true);
        setProduct(prev => (prev === "ALL" || !prev ? item.name : prev));
    };

    const handleCancel = () => {
        resetProductForm();
        setShowModal(false);
    };

    const handleSave = async () => {
        const newErrors = validateProductFields();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const payload = {
            name: form.product.trim(),
            category: form.category.trim() || undefined,
            amount: Number(form.quantity) || 0,
            minAmount: Number(form.minQuantity) || 0,
            price: Number(form.unitPrice) || 0,
            entryPrice: Number(form.entryPrice) || 0,
            currency: "PHP",
        };

        try {
            setError(null);
            if (editIndex) {
                await api.put(`/inventory/${editIndex}`, payload);
            } else {
                await api.post("/inventory", payload);
            }
            await reloadInventoryLists();
            resetProductForm();
            setShowModal(false);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to save product"));
        }
    };

    const confirmArchiveProduct = async () => {
        if (!archiveProductId) return;
        const id = archiveProductId;
        setArchiveProductId(null);
        try {
            setError(null);
            await api.delete(`/inventory/${id}`);
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to archive product"));
        }
    };

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
        if (!showCategoryMenu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            openCategoryMenu();
            e.preventDefault();
            return;
        }
        if (!showCategoryMenu) return;
        if (e.key === "Escape") {
            setShowCategoryMenu(false);
            setCategoryHighlight(-1);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setCategoryHighlight(h => {
                const list = filteredCategorySuggestions;
                if (!list.length) return -1;
                return h + 1 >= list.length ? 0 : h + 1;
            });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCategoryHighlight(h => {
                const list = filteredCategorySuggestions;
                if (!list.length) return -1;
                return h - 1 < 0 ? list.length - 1 : h - 1;
            });
        } else if (e.key === "Enter") {
            if (categoryHighlight >= 0 && categoryHighlight < filteredCategorySuggestions.length) {
                e.preventDefault();
                selectCategory(filteredCategorySuggestions[categoryHighlight]);
            }
        }
    }

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p._id && p._id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [products, searchTerm]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(e =>
            e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            e.role.toLowerCase().includes(employeeSearch.toLowerCase())
        );
    }, [employees, employeeSearch]);

    const resetEmployeeModalState = () => {
        setEmployeeForm(createEmptyEmployeeForm());
        setEmployeeErrors({});
        setEditEmployeeIndex(null);
    };

    const handleAddEmployee = () => {
        if (!canManageEmployees) return;
        resetEmployeeModalState();
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
        if (!canManageEmployees) return;
        const newErrors = validateEmployeeFields();
        setEmployeeErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            setError(null);
            const payload: Record<string, unknown> = {
                fullName: employeeForm.fullName.trim(),
                role: employeeForm.role.trim(),
                email: employeeForm.email.trim(),
                phone: employeeForm.phone.trim(),
            };

            if (editEmployeeIndex !== null) {
                const res = await api.put(`/employees/${editEmployeeIndex}`, payload);
                const updated = res.data;
                setEmployees(prev => prev.map(e => e._id === editEmployeeIndex ? updated : e));
            } else {
                const res = await api.post("/employees", payload);
                const created = res.data;
                setEmployees(prev => [created, ...prev]);
            }
            resetEmployeeModalState();
            setShowEmployeeModal(false);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to save employee"));
        }
    };

    const handleEditEmployee = (id: string) => {
        if (!canManageEmployees) return;
        const e = employees.find(emp => emp._id === id);
        if (!e) return;
        resetEmployeeModalState();
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

    const confirmArchiveEmployee = async () => {
        if (!canManageEmployees) return;
        if (!archiveEmployeeId) return;
        const id = archiveEmployeeId;
        setArchiveEmployeeId(null);
        try {
            setError(null);
            await api.delete(`/employees/${id}`);
            await reloadEmployeeLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to archive employee"));
        }
    };

    const restoreArchivedProduct = async (archivedId: string) => {
        try {
            setError(null);
            await api.post(`/inventory/deleted/${archivedId}/restore`);
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to restore product"));
        }
    };

    const restoreArchivedEmployee = async (archivedId: string) => {
        if (!canManageEmployees) return;
        try {
            setError(null);
            await api.post(`/employees/deleted/${archivedId}/restore`);
            await reloadEmployeeLists();
        } catch (e:unknown) {
            setError(toErrorMessage(e, "Failed to restore employee"));
        }
    };

    const handleCancelEmployee = () => {
        resetEmployeeModalState();
        setShowEmployeeModal(false);
    };

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
                    ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-700 dark:border-blue-500 shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
            <div className={`p-2 rounded-lg ${active ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                {icon}
            </div>
            <span className="text-sm">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    active ? 'bg-red-500 text-white' : 'bg-red-400 dark:bg-red-600 text-white'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );

    return (
        <DashboardLayout role="owner">
            <div className="max-w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-gray-900 dark:text-gray-100">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
                    <p className={`text-gray-600 dark:text-gray-300 mt-2`}>Manage your products, track analytics, and oversee employees</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl shadow-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 dark:text-blue-200 text-sm">Total Stock Value</p>
                                <p className="text-2xl font-bold">₱ {profitAndExpenses.totalStockValue.toLocaleString()}</p>
                            </div>
                            <BanknotesIcon className="w-8 h-8 text-blue-200 dark:text-blue-300" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl shadow-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 dark:text-green-200 text-sm">Gross Profit</p>
                                <p className={`text-2xl font-bold ${profitAndExpenses.grossProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                                    ₱ {profitAndExpenses.grossProfit.toLocaleString()}
                                </p>
                                <p className="text-green-100 dark:text-green-200 text-xs">({profitAndExpenses.profitMargin.toFixed(1)}% margin)</p>
                            </div>
                            <CurrencyDollarIcon className="w-8 h-8 text-green-200 dark:text-green-300" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl shadow-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 dark:text-purple-200 text-sm">Low Stock Items</p>
                                <p className="text-2xl font-bold">{lowStockProducts}</p>
                                <p className="text-purple-100 dark:text-purple-200 text-xs">Need attention</p>
                            </div>
                            <ArrowTrendingDownIcon className="w-8 h-8 text-purple-200 dark:text-purple-300" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-2xl shadow-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 dark:text-orange-200 text-sm">Total Employees</p>
                                <p className="text-2xl font-bold">{employees.length}</p>
                                <p className="text-orange-100 dark:text-orange-200 text-xs">Active team members</p>
                            </div>
                            <UsersIcon className="w-8 h-8 text-orange-200 dark:text-orange-300" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className={`${PANEL_SURFACE} p-4 mb-6 flex items-center gap-2 text-red-700 dark:text-red-400`}>
                        <XMarkIcon className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className={`${PANEL_SURFACE} overflow-hidden`}>
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
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

                    <div className="p-6">
                        {/* Graph Tab Content - UPDATED WITH DARK MODE FIXES */}
                        {activeTab === "graph" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className={`${PANEL_SURFACE} p-6`}>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            {product === "ALL" || !product ? "Stock by Category" : `${product} Stock Levels`}
                                        </h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stockAmountData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                                                <XAxis 
                                                    dataKey="month" 
                                                    fontSize={12} 
                                                    stroke={isDarkMode ? "#9ca3af" : "#374151"}
                                                    tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }}
                                                />
                                                <YAxis 
                                                    allowDecimals={false} 
                                                    fontSize={12} 
                                                    stroke={isDarkMode ? "#9ca3af" : "#374151"}
                                                    tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }}
                                                />
                                                <Tooltip 
                                                    formatter={(v: number) => [v, "Amount"]}
                                                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                                    contentStyle={{ 
                                                        borderRadius: '12px', 
                                                        border: isDarkMode ? '1px solid #374151' : 'none', 
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                                        fontSize: '12px'
                                                    }}
                                                    itemStyle={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}
                                                />
                                                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className={`${PANEL_SURFACE} p-6`}>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            {product === "ALL" || !product ? "Value by Category" : `${product} Price Analysis`}
                                        </h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stockPriceData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                                                <XAxis 
                                                    dataKey="month" 
                                                    fontSize={12} 
                                                    stroke={isDarkMode ? "#9ca3af" : "#374151"}
                                                    tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }}
                                                />
                                                <YAxis 
                                                    allowDecimals={false} 
                                                    fontSize={12} 
                                                    stroke={isDarkMode ? "#9ca3af" : "#374151"}
                                                    tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }}
                                                />
                                                <Tooltip 
                                                    formatter={(v: number) => ["₱" + v.toLocaleString(), "Value"]}
                                                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                                    contentStyle={{ 
                                                        borderRadius: '12px', 
                                                        border: isDarkMode ? '1px solid #374151' : 'none', 
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                                        fontSize: '12px'
                                                    }}
                                                    itemStyle={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}
                                                />
                                                <Bar dataKey="prize" fill="#10b981" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className={`${PANEL_SURFACE} p-6`}>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
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
                                                    stroke={isDarkMode ? "#1f2937" : "#fff"}
                                                >
                                                    {categoryDistributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        borderRadius: '12px', 
                                                        border: isDarkMode ? '1px solid #374151' : 'none', 
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                                        fontSize: '12px'
                                                    }}
                                                    itemStyle={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className={`${PANEL_SURFACE} p-6 lg:col-span-2`}>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Selection</h3>
                                        <div className="relative">
                                            <div className="overflow-x-auto pb-4">
                                                <div className="flex gap-3 min-w-max">
                                                    <button
                                                        onClick={() => setProduct("ALL")}
                                                        className={`p-4 rounded-xl border-2 transition-all duration-300 text-left min-w-[140px] ${
                                                            product === "ALL" || !product
                                                                ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md"
                                                                : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm"
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-sm">All Products</div>
                                                        <div className={`text-xs ${MUTED_TEXT} mt-1`}>{products.length} items</div>
                                                    </button>
                                                    {products.map((p) => (
                                                        <button
                                                            key={p._id}
                                                            onClick={() => setProduct(p.name)}
                                                            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left min-w-[140px] ${
                                                                product === p.name
                                                                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md"
                                                                    : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm"
                                                            }`}
                                                        >
                                                            <div className="font-semibold text-sm truncate">{p.name}</div>
                                                            <div className={`text-xs ${MUTED_TEXT} mt-1`}>Stock: {p.amount}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-800 to-transparent pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Products Tab Content */}
                        {activeTab === "products" && (
                            <div className="space-y-6">
                                <div className={`${PANEL_SURFACE} p-4`}>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:w-80">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Search products, categories..."
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        className={`w-full pl-10 pr-4 py-3 ${INPUT_SURFACE}`}
                                                    />
                                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    className={`rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 border transition-colors ${
                                                        showArchivedProducts 
                                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50' 
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    }`}
                                                    onClick={() => setShowArchivedProducts(v => !v)}
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    {showArchivedProducts ? 'View Active' : 'View Archived'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button 
                                                className="bg-blue-600 dark:bg-blue-700 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex-1 sm:flex-none justify-center"
                                                onClick={exportToPDF}
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                                Export PDF
                                            </button>
                                            <button 
                                                className="bg-green-600 dark:bg-green-700 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex-1 sm:flex-none justify-center"
                                                onClick={handleCreate}
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Add Product
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className={`${PANEL_SURFACE} overflow-hidden`}>
                                    <div className={`p-4 bg-gradient-to-r ${showArchivedProducts ? 'from-amber-700 to-amber-800' : 'from-gray-800 dark:from-gray-900 to-gray-900 dark:to-gray-950'}`}>
                                        <h2 className="text-xl font-bold text-white text-center">
                                            {showArchivedProducts ? 'ARCHIVED PRODUCTS' : 'PRODUCT INVENTORY'}
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                                <tr className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {!showArchivedProducts && filteredProducts.map((p) => (
                                                    <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{p._id.slice(-6).toUpperCase()}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {p.category ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                                    {p.category}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-gray-500">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                                p.amount <= p.minAmount 
                                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                                                                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                            }`}>
                                                                {p.amount}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">{p.minAmount}</td>
                                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">₱{p.price.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">₱{p.entryPrice.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                    onClick={() => handleEdit(p._id)}
                                                                >
                                                                    <PencilSquareIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                                    title="Archive"
                                                                    onClick={() => setArchiveProductId(p._id)}
                                                                >
                                                                    <ArchiveBoxIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {showArchivedProducts && archivedProducts.map((item) => (
                                                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors bg-amber-50/50 dark:bg-amber-900/10">
                                                        <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{item.originalId.slice(-6).toUpperCase()}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900 dark:text-white line-through">{item.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {item.category ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                                                                    {item.category}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-gray-500">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">{item.amount}</td>
                                                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">{item.minAmount}</td>
                                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">₱{item.price.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">₱{item.entryPrice.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium"
                                                                onClick={() => restoreArchivedProduct(item._id)}
                                                            >
                                                                Restore
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {((!showArchivedProducts && filteredProducts.length === 0) || 
                                                  (showArchivedProducts && archivedProducts.length === 0)) && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-12 text-center">
                                                            <div className="text-gray-500 dark:text-gray-400 text-lg">No products found</div>
                                                            <div className={`${MUTED_TEXT} text-sm mt-2`}>
                                                                {!showArchivedProducts ? "Try adjusting your search or add a new product" : "No archived products to display"}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {showArchivedProducts && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                            <p className={`text-sm ${MUTED_TEXT} text-center`}>
                                                📝 Archived products are automatically purged after 30 days
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Employee Tab Content */}
                        {activeTab === "employee" && (
                            <div className="space-y-6">
                                <div className={`${PANEL_SURFACE} p-4`}>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:w-80">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Search employees..."
                                                        value={employeeSearch}
                                                        onChange={e => setEmployeeSearch(e.target.value)}
                                                        className={`w-full pl-10 pr-4 py-3 ${INPUT_SURFACE}`}
                                                    />
                                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    className={`rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 border transition-colors ${
                                                        showArchivedEmployees 
                                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50' 
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    }`}
                                                    onClick={() => setShowArchivedEmployees(v => !v)}
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    {showArchivedEmployees ? 'View Active' : 'View Archived'}
                                                </button>
                                            </div>
                                        </div>
                                        <button 
                                            className="bg-green-600 dark:bg-green-700 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-green-700 dark:hover:bg-green-600 transition-colors w-full sm:w-auto justify-center"
                                            onClick={handleAddEmployee}
                                        >
                                            <UserPlusIcon className="w-4 h-4" />
                                            Add Employee
                                        </button>
                                    </div>
                                </div>

                                <div className={`${PANEL_SURFACE} overflow-hidden`}>
                                    <div className={`p-4 bg-gradient-to-r ${showArchivedEmployees ? 'from-amber-700 to-amber-800' : 'from-blue-800 dark:from-blue-900 to-blue-900 dark:to-blue-950'}`}>
                                        <h2 className="text-xl font-bold text-white text-center">
                                            {showArchivedEmployees ? 'ARCHIVED EMPLOYEES' : 'EMPLOYEE DIRECTORY'}
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                                <tr className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    <th className="px-6 py-4">Full Name</th>
                                                    <th className="px-6 py-4">Role</th>
                                                    <th className="px-6 py-4">Email</th>
                                                    <th className="px-6 py-4">Phone</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {!showArchivedEmployees && filteredEmployees.map((e) => (
                                                    <tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{e.fullName}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                                e.role === 'Manager' 
                                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' 
                                                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                            }`}>
                                                                {e.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{e.email || '-'}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{e.phone || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                                e.active 
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                            }`}>
                                                                {e.active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                    onClick={() => handleEditEmployee(e._id)}
                                                                >
                                                                    <PencilSquareIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                                    title="Archive"
                                                                    onClick={() => setArchiveEmployeeId(e._id)}
                                                                >
                                                                    <ArchiveBoxIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {showArchivedEmployees && archivedEmployees.map((item) => (
                                                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors bg-amber-50/50 dark:bg-amber-900/10">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900 dark:text-white line-through">{item.fullName}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                                                                {item.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.email || '-'}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.phone || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                                                Archived
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm font-medium"
                                                                onClick={() => restoreArchivedEmployee(item._id)}
                                                            >
                                                                Restore
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {((!showArchivedEmployees && filteredEmployees.length === 0) || 
                                                  (showArchivedEmployees && archivedEmployees.length === 0)) && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center">
                                                            <div className="text-gray-500 dark:text-gray-400 text-lg">No employees found</div>
                                                            <div className={`${MUTED_TEXT} text-sm mt-2`}>
                                                                {!showArchivedEmployees ? "Try adjusting your search or add a new employee" : "No archived employees to display"}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {showArchivedEmployees && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                            <p className={`text-sm ${MUTED_TEXT} text-center`}>
                                                📝 Archived employees are automatically purged after 30 days
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Archive Product Modal */}
            <Transition show={archiveProductId !== null} as={Fragment}>
                <Dialog onClose={() => setArchiveProductId(null)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/70 dark:bg-black/80" />
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
                                <DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Archive Product</Dialog.Title>
                                        <button onClick={() => setArchiveProductId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" aria-label="Close">
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <p>Are you sure you want to archive the product{productToArchiveName ? ` "${productToArchiveName}"` : ""}? It can be restored later from the Archived view.</p>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setArchiveProductId(null)}
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm inline-flex items-center gap-1"
                                            >
                                                <XMarkIcon className="w-4 h-4" /> Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={confirmArchiveProduct}
                                                className="px-4 py-2 rounded-lg bg-amber-600 dark:bg-amber-700 text-white hover:bg-amber-700 dark:hover:bg-amber-600 font-semibold text-sm inline-flex items-center gap-1"
                                            >
                                                <ArchiveBoxIcon className="w-4 h-4" /> Archive
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
                        <div className="fixed inset-0 bg-black/70 dark:bg-black/80" />
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
                                <DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">{editIndex !== null ? "Edit Product" : "Add Product"}</Dialog.Title>
                                        <button onClick={handleCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" aria-label="Close">
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                                        className="p-4 space-y-4"
                                    >
                                        <div>
                                            <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                                            <input
                                                value={form.product}
                                                onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                                                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${INPUT_SURFACE} ${errors.product ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                placeholder="e.g. A4 Bond Paper"
                                                autoFocus
                                            />
                                            {errors.product && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.product}</p>}
                                        </div>
                                        <div ref={categoryWrapperRef} className="relative">
                                            <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Category (optional)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    ref={categoryInputRef}
                                                    value={form.category}
                                                    onChange={e => { setForm(f => ({ ...f, category: e.target.value })); if (!showCategoryMenu) openCategoryMenu(); }}
                                                    onFocus={() => openCategoryMenu()}
                                                    onKeyDown={onCategoryKeyDown}
                                                    placeholder={categorySuggestions.length ? "Search or type category" : "Type a category"}
                                                    className={`flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${INPUT_SURFACE}`}
                                                    aria-expanded={showCategoryMenu}
                                                    aria-haspopup="listbox"
                                                    aria-controls="category-menu"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => showCategoryMenu ? setShowCategoryMenu(false) : openCategoryMenu()}
                                                    className="shrink-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                                                    className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg focus:outline-none"
                                                >
                                                    <div className="max-h-56 overflow-auto py-1 text-sm">
                                                        {filteredCategorySuggestions.length === 0 && (
                                                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches. Press Enter to keep "{form.category}"</div>
                                                        )}
                                                        {filteredCategorySuggestions.map((c, idx) => (
                                                            <div
                                                                key={c}
                                                                role="option"
                                                                aria-selected={form.category === c}
                                                                onMouseDown={(e) => { e.preventDefault(); selectCategory(c); }}
                                                                onMouseEnter={() => setCategoryHighlight(idx)}
                                                                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${idx === categoryHighlight ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                                            >
                                                                <span className="truncate">{c}</span>
                                                                {form.category === c && <span className="ml-auto text-[10px] rounded bg-blue-600/20 px-1.5 py-0.5 text-blue-600 dark:text-blue-400">Selected</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {form.category && !filteredCategorySuggestions.includes(form.category) && (
                                                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">Press Enter to use custom category</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={form.quantity}
                                                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${INPUT_SURFACE} ${errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                    placeholder="0"
                                                />
                                                {errors.quantity && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.quantity}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Min. Quantity</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={form.minQuantity}
                                                    onChange={e => setForm(f => ({ ...f, minQuantity: e.target.value }))}
                                                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${INPUT_SURFACE} ${errors.minQuantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                    placeholder="0"
                                                />
                                                {errors.minQuantity && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.minQuantity}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Unit Price (₱)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={form.unitPrice}
                                                    onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                                                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${INPUT_SURFACE} ${errors.unitPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                    placeholder="0.00"
                                                />
                                                {errors.unitPrice && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.unitPrice}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Entry Price (₱)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={form.entryPrice}
                                                    onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))}
                                                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${INPUT_SURFACE} ${errors.entryPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                    placeholder="0.00"
                                                />
                                                {errors.entryPrice && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.entryPrice}</p>}
                                            </div>
                                        </div>
                                        <div className="pt-2 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm inline-flex items-center gap-1"
                                            >
                                                <XMarkIcon className="w-4 h-4" /> Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold text-sm inline-flex items-center gap-1"
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

            {/* Confirm Archive Employee Modal */}
            <Transition show={archiveEmployeeId !== null} as={Fragment}>
                <Dialog onClose={() => setArchiveEmployeeId(null)} className="relative z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/70 dark:bg-black/80" />
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
                                <DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Archive Employee</Dialog.Title>
                                        <button onClick={() => setArchiveEmployeeId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400" aria-label="Close">
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <p>Are you sure you want to archive{employeeToArchiveName ? ` "${employeeToArchiveName}"` : " this employee"}? This action can be reversed in the Archived view.</p>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setArchiveEmployeeId(null)}
                                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm inline-flex items-center gap-1"
                                            >
                                                <XMarkIcon className="w-4 h-4" /> Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={confirmArchiveEmployee}
                                                className="px-4 py-2 rounded-lg bg-amber-600 dark:bg-amber-700 text-white hover:bg-amber-700 dark:hover:bg-amber-600 font-semibold text-sm inline-flex items-center gap-1"
                                            >
                                                <ArchiveBoxIcon className="w-4 h-4" /> Archive
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
                <div className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg w-full max-w-md p-6 relative">
                        <button className="absolute top-4 right-4 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" onClick={handleCancelEmployee} aria-label="Close">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <div className="font-bold text-xl text-center mb-6 text-gray-900 dark:text-white">
                            {editEmployeeIndex !== null ? "Edit Employee" : "Add Employee"}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                                <input 
                                    className={INPUT_SURFACE}
                                    placeholder="Enter full name"
                                    value={employeeForm.fullName} 
                                    onChange={e => setEmployeeForm(f => ({ ...f, fullName: e.target.value }))} 
                                />
                                {employeeErrors.fullName && <div className="text-red-500 dark:text-red-400 text-xs mt-1">{employeeErrors.fullName}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                                <input 
                                    className={INPUT_SURFACE}
                                    placeholder="e.g., Manager, Staff"
                                    value={employeeForm.role} 
                                    onChange={e => setEmployeeForm(f => ({ ...f, role: e.target.value }))} 
                                />
                                {employeeErrors.role && <div className="text-red-500 dark:text-red-400 text-xs mt-1">{employeeErrors.role}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email (Optional)</label>
                                <input 
                                    type="email"
                                    className={INPUT_SURFACE}
                                    placeholder="employee@company.com"
                                    value={employeeForm.email} 
                                    onChange={e => setEmployeeForm(f => ({ ...f, email: e.target.value }))} 
                                />
                                {employeeErrors.email && <div className="text-red-500 dark:text-red-400 text-xs mt-1">{employeeErrors.email}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone (Optional)</label>
                                <input 
                                    className={INPUT_SURFACE}
                                    placeholder="+1 (555) 000-0000"
                                    value={employeeForm.phone} 
                                    onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))} 
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button 
                                className="flex-1 bg-gray-500 dark:bg-gray-700 text-white rounded-lg px-4 py-3 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors"
                                onClick={handleCancelEmployee}
                            >
                                <XMarkIcon className="w-4 h-4" /> Cancel
                            </button>
                            <button 
                                className="flex-1 bg-green-600 dark:bg-green-700 text-white rounded-lg px-4 py-3 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                                onClick={handleSaveEmployee}
                            >
                                <CheckIcon className="w-4 h-4" /> {editEmployeeIndex !== null ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Inventory;