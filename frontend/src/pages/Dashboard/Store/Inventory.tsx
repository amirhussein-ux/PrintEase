import React, { useState, useMemo, useEffect, Fragment, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogPanel, Transition, Listbox } from "@headlessui/react";
import {
    PencilSquareIcon,
    UserPlusIcon,
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
    ArchiveBoxIcon,
    PhotoIcon,
    ChevronUpDownIcon
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";
import api from "../../../lib/api";
import { isAxiosError } from "axios";
import jsPDF from 'jspdf';
import CropperModal from "../../../components/CropperModal";

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
    password: string;
    confirmPassword: string;
}

const EMPLOYEE_ROLE_OPTIONS = [
    "Operations Manager",
    "Front Desk",
    "Inventory & Supplies",
    "Printer Operator",
];

const createEmptyEmployeeForm = (): EmployeeFormState => ({
    fullName: "",
    role: "",
email: "",
    phone: "",
    password: "",
    confirmPassword: "",
});

const createEmptyProductForm = () => ({
    product: "",
    category: "",
    quantity: "",
    minQuantity: "",
    unitPrice: "",
    entryPrice: "",
});

const revokeBlobUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
    }
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

function toErrorMessage(e: unknown, fallback: string): string {
    if (isAxiosError(e)) {
        const data = e.response?.data as { message?: string } | undefined;
        return data?.message || e.message || fallback;
    }
    if (e instanceof Error) return e.message || fallback;
    return fallback;
}

const PANEL_SURFACE = 'rounded-2xl border border-gray-200/80 dark:border-gray-600 bg-white/90 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm dark:shadow-none';
const INPUT_SURFACE = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500';
const MUTED_TEXT = 'text-gray-600 dark:text-gray-300';

const Inventory: React.FC = () => {
    const canManageEmployees = true;
    const hasInventoryAccess = true;
    const canViewEmployees = true;

    const [activeTab, setActiveTab] = useState<"graph" | "products" | "employee">("graph");
    const location = useLocation();

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof document === "undefined") return false;
        return document.documentElement.classList.contains("dark");
    });

    useEffect(() => {
        try {
            const p = location.pathname || "";
            if (p.includes("/dashboard/inventory/products")) setActiveTab("products");
            else if (p.includes("/dashboard/inventory/employees")) setActiveTab("employee");
            else if (p.includes("/dashboard/inventory/analytics") || p.includes("/dashboard/inventory")) setActiveTab("graph");
        } catch {}
    }, [location.pathname]);

    useEffect(() => {
        if (typeof document === "undefined" || typeof window === "undefined") return;
        const root = document.documentElement;
        const update = () => setIsDarkMode(root.classList.contains("dark"));
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ["class"] });
        const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
        const mediaListener = () => update();
        if (media?.addEventListener) media.addEventListener("change", mediaListener);
        else media?.addListener?.(mediaListener);
        return () => {
            observer.disconnect();
            if (media?.removeEventListener) media.removeEventListener("change", mediaListener);
            else media?.removeListener?.(mediaListener);
        };
    }, []);

    // Product state
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

    const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(createEmptyEmployeeForm());
    const [employeeErrors, setEmployeeErrors] = useState<{ [key: string]: string }>({});
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [editEmployeeIndex, setEditEmployeeIndex] = useState<string | null>(null);
    const [employeeAvatarPreview, setEmployeeAvatarPreview] = useState<string | null>(null);
    const [employeeAvatarFile, setEmployeeAvatarFile] = useState<File | null>(null);
    const [employeeAvatarExisting, setEmployeeAvatarExisting] = useState<string | null>(null);
    const [employeeAvatarRemoved, setEmployeeAvatarRemoved] = useState(false);
    const [employeeAvatarDragActive, setEmployeeAvatarDragActive] = useState(false);
    const [employeeCropperSrc, setEmployeeCropperSrc] = useState<string | null>(null);
    const employeeAvatarInputRef = useRef<HTMLInputElement | null>(null);
    const [isSavingEmployee, setIsSavingEmployee] = useState(false);
    const currentEmployeeAvatar = employeeAvatarPreview || employeeAvatarExisting;

    const resetEmployeeModalState = () => {
        setEmployeeForm(createEmptyEmployeeForm());
        setEmployeeErrors({});
        revokeBlobUrl(employeeAvatarPreview);
        setEmployeeAvatarPreview(null);
        setEmployeeAvatarFile(null);
        setEmployeeAvatarExisting(null);
        setEmployeeAvatarRemoved(false);
        setEmployeeAvatarDragActive(false);
        if (employeeCropperSrc) {
            revokeBlobUrl(employeeCropperSrc);
            setEmployeeCropperSrc(null);
        }
        if (employeeAvatarInputRef.current) {
            employeeAvatarInputRef.current.value = "";
        }
        setIsSavingEmployee(false);
        setEditEmployeeIndex(null);
    };

    useEffect(() => () => revokeBlobUrl(employeeAvatarPreview), [employeeAvatarPreview]);
    useEffect(() => () => revokeBlobUrl(employeeCropperSrc), [employeeCropperSrc]);

    const openEmployeeAvatarDialog = () => employeeAvatarInputRef.current?.click();

    const triggerEmployeeCropper = (file: File) => {
        if (!file.type.startsWith("image/")) {
            setEmployeeErrors(prev => ({ ...prev, avatar: "Please upload an image file." }));
            return;
        }
        setEmployeeErrors(prev => {
            const { avatar, ...rest } = prev;
            return rest;
        });
        setEmployeeAvatarExisting(null);
        setEmployeeAvatarRemoved(false);
        const objectUrl = URL.createObjectURL(file);
        setEmployeeCropperSrc(prev => {
            revokeBlobUrl(prev);
            return objectUrl;
        });
    };

    const handleEmployeeAvatarInput = (files: FileList | null) => {
        if (files?.[0]) triggerEmployeeCropper(files[0]);
    };

    const handleEmployeeAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setEmployeeAvatarDragActive(false);
        if (e.dataTransfer?.files?.[0]) triggerEmployeeCropper(e.dataTransfer.files[0]);
    };

    const handleEmployeeAvatarRemove = () => {
        revokeBlobUrl(employeeAvatarPreview);
        setEmployeeAvatarPreview(null);
        setEmployeeAvatarFile(null);
        setEmployeeAvatarRemoved(true);
        setEmployeeAvatarExisting(null);
    };

    const [archiveProductId, setArchiveProductId] = useState<string | null>(null);
    const [archiveEmployeeId, setArchiveEmployeeId] = useState<string | null>(null);
    
    const productToArchiveName = useMemo(() => (archiveProductId ? products.find(p => p._id === archiveProductId)?.name || "" : ""), [archiveProductId, products]);
    const employeeToArchiveName = useMemo(() => (archiveEmployeeId ? employees.find(e => e._id === archiveEmployeeId)?.fullName || "" : ""), [archiveEmployeeId, employees]);

    const [archivedProducts, setArchivedProducts] = useState<ArchivedInventoryItem[]>([]);
    const [archivedEmployees, setArchivedEmployees] = useState<ArchivedEmployee[]>([]);
    const [showArchivedProducts, setShowArchivedProducts] = useState(false);
    const [showArchivedEmployees, setShowArchivedEmployees] = useState(false);

    useEffect(() => {
        if (!canManageEmployees && showEmployeeModal) setShowEmployeeModal(false);
    }, [canManageEmployees, showEmployeeModal]);

    const isMountedRef = useRef(true);

    const reloadInventoryLists = useCallback(async () => {
        if (!hasInventoryAccess) return;
        const [inventoryRes, deletedRes] = await Promise.all([api.get("/inventory/mine"), api.get("/inventory/deleted")]);
        if (isMountedRef.current) {
            setProducts(inventoryRes.data || []);
            setArchivedProducts(deletedRes.data || []);
        }
    }, [hasInventoryAccess]);

    const reloadEmployeeLists = useCallback(async () => {
        if (!canViewEmployees) return;
        const [employeeRes, deletedRes] = await Promise.all([
            api.get("/employees/mine"),
            canManageEmployees ? api.get("/employees/deleted") : Promise.resolve({ data: [] })
        ]);
        if (isMountedRef.current) {
            setEmployees(employeeRes.data || []);
            setArchivedEmployees(deletedRes.data || []);
        }
    }, [canViewEmployees, canManageEmployees]);

    useEffect(() => {
        isMountedRef.current = true;
        (async () => {
            try {
                setError(null);
                await Promise.all([reloadInventoryLists(), reloadEmployeeLists()]);
            } catch (e: unknown) {
                if (isMountedRef.current) setError(toErrorMessage(e, "Failed to load data"));
            }
        })();
        return () => { isMountedRef.current = false; };
    }, [reloadInventoryLists, reloadEmployeeLists]);

    // Analytics data
    const stockAmountData = useMemo(() => {
        if (!products.length) return [{ month: "No Data", amount: 0 }];
        const p = products.find(i => i.name === product);
        return p ? [{ month: "Current", amount: p.amount }, { month: "Min Required", amount: p.minAmount }] : products.map(i => ({ month: i.name, amount: i.amount, minAmount: i.minAmount }));
    }, [products, product]);

    const stockPriceData = useMemo(() => {
        if (!products.length) return [{ month: "No Data", prize: 0 }];
        const p = products.find(i => i.name === product);
        return p ? [{ month: "Unit Price", prize: p.price }, { month: "Total Value", prize: p.price * p.amount }] : products.map(i => ({ month: i.name, prize: i.price * i.amount }));
    }, [products, product]);
    
    const categoryDistributionData = useMemo(() => {
        const categoryData = products.reduce((acc, p) => {
            const category = p.category || "Uncategorized";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
        return Object.entries(categoryData).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
    }, [products]);

    const lowStockProducts = useMemo(() => products.filter(p => p.amount <= p.minAmount).length, [products]);
    const profitAndExpenses = useMemo(() => {
        const totalStockValue = products.reduce((s, p) => s + (p.price * p.amount), 0);
        const totalEntryCost = products.reduce((s, p) => s + (p.entryPrice * p.amount), 0);
        const grossProfit = totalStockValue - totalEntryCost;
        return { totalStockValue, totalEntryCost, grossProfit, profitMargin: totalEntryCost > 0 ? (grossProfit / totalEntryCost) * 100 : 0 };
    }, [products]);

    // Product form logic
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [categoryHighlight, setCategoryHighlight] = useState(-1);
    const categoryWrapperRef = useRef<HTMLDivElement>(null);
    const categoryInputRef = useRef<HTMLInputElement>(null);
    const categorySuggestions = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean).sort() as string[])), [products]);
    const filteredCategorySuggestions = useMemo(() => form.category ? categorySuggestions.filter(c => c.toLowerCase().includes(form.category.toLowerCase())) : categorySuggestions, [form.category, categorySuggestions]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!categoryWrapperRef.current?.contains(e.target as Node)) setShowCategoryMenu(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const resetProductForm = () => {
        setForm(createEmptyProductForm());
        setErrors({});
        setEditIndex(null);
    };

    const validateProductFields = () => {
        const newErrors: Record<string, string> = {};
        if (!form.product.trim()) newErrors.product = "Product name is required.";
        if (isNaN(Number(form.quantity)) || Number(form.quantity) < 0) newErrors.quantity = "Must be a non-negative number.";
        if (isNaN(Number(form.minQuantity)) || Number(form.minQuantity) < 0) newErrors.minQuantity = "Must be a non-negative number.";
        if (isNaN(Number(form.unitPrice)) || Number(form.unitPrice) < 0) newErrors.unitPrice = "Must be a non-negative number.";
        if (isNaN(Number(form.entryPrice)) || Number(form.entryPrice) < 0) newErrors.entryPrice = "Must be a non-negative number.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreate = () => { resetProductForm(); setShowModal(true); };
    const handleEdit = (id: string) => {
        const item = products.find(p => p._id === id);
        if (!item) return;
        setForm({
            product: item.name,
            category: item.category || "",
            quantity: String(item.amount),
            minQuantity: String(item.minAmount),
            unitPrice: String(item.price),
            entryPrice: String(item.entryPrice),
        });
        setErrors({});
        setEditIndex(id);
        setShowModal(true);
    };
    const handleCancel = () => { resetProductForm(); setShowModal(false); };

    const handleSave = async () => {
        if (!validateProductFields()) return;
        const payload = {
            name: form.product.trim(),
            category: form.category.trim() || undefined,
            amount: Number(form.quantity),
            minAmount: Number(form.minQuantity),
            price: Number(form.unitPrice),
            entryPrice: Number(form.entryPrice),
            currency: "PHP",
        };
        try {
            setError(null);
            await (editIndex ? api.put(`/inventory/${editIndex}`, payload) : api.post("/inventory", payload));
            await reloadInventoryLists();
            handleCancel();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to save product"));
        }
    };

    const confirmArchiveProduct = async () => {
        if (!archiveProductId) return;
        try {
            setError(null);
            await api.delete(`/inventory/${archiveProductId}`);
            await reloadInventoryLists();
            setArchiveProductId(null);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to archive product"));
        }
    };

    const onCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") setCategoryHighlight(p => (p + 1) % filteredCategorySuggestions.length);
        else if (e.key === "ArrowUp") setCategoryHighlight(p => (p - 1 + filteredCategorySuggestions.length) % filteredCategorySuggestions.length);
        else if (e.key === "Enter" && categoryHighlight > -1) selectCategory(filteredCategorySuggestions[categoryHighlight]);
        else if (e.key === "Escape") setShowCategoryMenu(false);
    };

    const selectCategory = (value: string) => {
        setForm(f => ({ ...f, category: value }));
        setShowCategoryMenu(false);
        categoryInputRef.current?.focus();
    };

    // Employee form logic
    const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category} ${p._id}`.toLowerCase().includes(searchTerm.toLowerCase())), [products, searchTerm]);
    const filteredEmployees = useMemo(() => employees.filter(e => `${e.fullName} ${e.role}`.toLowerCase().includes(employeeSearch.toLowerCase())), [employees, employeeSearch]);
    
    const handleAddEmployee = () => { resetEmployeeModalState(); setShowEmployeeModal(true); };
    const handleCancelEmployee = () => { resetEmployeeModalState(); setShowEmployeeModal(false); };

    const validateEmployeeFields = () => {
        const newErrors: Record<string, string> = {};
        if (!employeeForm.fullName.trim()) newErrors.fullName = "Full name is required.";
        if (!employeeForm.role.trim()) newErrors.role = "Role is required.";
        else if (!EMPLOYEE_ROLE_OPTIONS.includes(employeeForm.role)) newErrors.role = "Please select a valid role.";
        if (!employeeForm.email.trim()) newErrors.email = "Email address is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeForm.email)) newErrors.email = "Enter a valid email address.";
        if (!employeeForm.phone.trim()) newErrors.phone = "Phone number is required.";
        else if (!/^\+?[0-9\s-]{7,15}$/.test(employeeForm.phone)) newErrors.phone = "Enter a valid phone number.";

        const pass = employeeForm.password.trim();
        const conf = employeeForm.confirmPassword.trim();
        if (editEmployeeIndex === null || pass || conf) {
            if (!pass) newErrors.password = "Password is required.";
            else if (pass.length < 6) newErrors.password = "Password must be at least 6 characters.";
            if (pass !== conf) newErrors.confirmPassword = "Passwords do not match.";
        }
        setEmployeeErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveEmployee = async () => {
        if (!canManageEmployees || !validateEmployeeFields()) return;
        setIsSavingEmployee(true);
        try {
            setError(null);
            const payload: Record<string, unknown> = {
                fullName: employeeForm.fullName.trim(),
                role: employeeForm.role.trim(),
                email: employeeForm.email.trim(),
                phone: employeeForm.phone.trim(),
            };
            if (employeeForm.password.trim()) payload.password = employeeForm.password.trim();
            if (employeeAvatarFile) payload.avatar = await fileToBase64(employeeAvatarFile);
            else if (employeeAvatarRemoved) payload.avatar = "";

            await (editEmployeeIndex ? api.put(`/employees/${editEmployeeIndex}`, payload) : api.post("/employees", payload));
            await reloadEmployeeLists();
            handleCancelEmployee();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to save employee"));
        } finally {
            setIsSavingEmployee(false);
        }
    };

    const handleEditEmployee = (id: string) => {
        const e = employees.find(emp => emp._id === id);
        if (!e) return;
        resetEmployeeModalState();
        setEmployeeForm({ fullName: e.fullName, role: e.role, email: e.email || "", phone: e.phone || "", password: "", confirmPassword: "" });
        setEmployeeAvatarExisting(e.avatarUrl || e.avatar || null);
        setEditEmployeeIndex(id);
        setShowEmployeeModal(true);
    };

    const confirmArchiveEmployee = async () => {
        if (!archiveEmployeeId) return;
        try {
            setError(null);
            await api.delete(`/employees/${archiveEmployeeId}`);
            await reloadEmployeeLists();
            setArchiveEmployeeId(null);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to archive employee"));
        }
    };

    const restoreArchivedProduct = async (id: string) => {
        try {
            setError(null);
            await api.post(`/inventory/deleted/${id}/restore`);
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to restore product"));
        }
    };

    const restoreArchivedEmployee = async (id: string) => {
        if (!canManageEmployees) return;
        try {
            setError(null);
            await api.post(`/employees/deleted/${id}/restore`);
            await reloadEmployeeLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to restore employee"));
        }
    };

    const exportToPDF = () => {
        const pdf = new jsPDF();
        pdf.text('Profit & Expenses Ledger', 20, 20);
        // Simplified PDF generation
        filteredProducts.forEach((p, i) => pdf.text(`${p.name}: ${p.amount}`, 20, 30 + i * 10));
        pdf.save(`ledger-${new Date().toISOString().slice(0,10)}.pdf`);
    };

    const TabButton = ({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number; }) => (
        <button onClick={onClick} className={`flex items-center gap-3 px-6 py-3 rounded-t-xl font-semibold transition-all duration-300 border-b-4 ${active ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-700 dark:border-blue-500 shadow-lg' : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <div className={`p-2 rounded-lg ${active ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>{icon}</div>
            <span className="text-sm">{label}</span>
            {badge ? <span className={`px-2 py-1 rounded-full text-xs font-bold ${active ? 'bg-red-500 text-white' : 'bg-red-400 dark:bg-red-600 text-white'}`}>{badge}</span> : null}
        </button>
    );

    return (
        <DashboardLayout role="owner">
            <div className="max-w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-gray-900 dark:text-gray-100">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Inventory Management</h1>
                    <p className={`${MUTED_TEXT} mt-2`}>Manage your products, track analytics, and oversee employees</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Summary Cards */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl shadow-xl p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-blue-100 dark:text-blue-200 text-sm">Total Stock Value</p><p className="text-2xl font-bold">₱ {profitAndExpenses.totalStockValue.toLocaleString()}</p></div><BanknotesIcon className="w-8 h-8 text-blue-200 dark:text-blue-300" /></div></div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl shadow-xl p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-green-100 dark:text-green-200 text-sm">Gross Profit</p><p className={`text-2xl font-bold ${profitAndExpenses.grossProfit >= 0 ? '' : 'text-red-200'}`}>₱ {profitAndExpenses.grossProfit.toLocaleString()}</p><p className="text-xs">({profitAndExpenses.profitMargin.toFixed(1)}% margin)</p></div><CurrencyDollarIcon className="w-8 h-8 text-green-200 dark:text-green-300" /></div></div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl shadow-xl p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-purple-100 dark:text-purple-200 text-sm">Low Stock Items</p><p className="text-2xl font-bold">{lowStockProducts}</p><p className="text-xs">Need attention</p></div><ArrowTrendingDownIcon className="w-8 h-8 text-purple-200 dark:text-purple-300" /></div></div>
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-2xl shadow-xl p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-orange-100 dark:text-orange-200 text-sm">Total Employees</p><p className="text-2xl font-bold">{employees.length}</p><p className="text-xs">Active team members</p></div><UsersIcon className="w-8 h-8 text-orange-200 dark:text-orange-300" /></div></div>
                </div>

                {error && <div className={`${PANEL_SURFACE} p-4 mb-6 flex items-center gap-2 text-red-700 dark:text-red-400`}><XMarkIcon className="w-5 h-5" /> {error}</div>}

                <div className={`${PANEL_SURFACE} overflow-hidden`}>
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <TabButton active={activeTab === "graph"} onClick={() => setActiveTab("graph")} icon={<ChartBarIcon className="w-5 h-5" />} label="Analytics" />
                        <TabButton active={activeTab === "products"} onClick={() => setActiveTab("products")} icon={<CubeIcon className="w-5 h-5" />} label="Products" badge={lowStockProducts} />
                        <TabButton active={activeTab === "employee"} onClick={() => setActiveTab("employee")} icon={<UserGroupIcon className="w-5 h-5" />} label="Employees" />
                    </div>

                    <div className="p-6">
                        {/* Analytics Tab */}
                        {activeTab === "graph" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className={`${PANEL_SURFACE} p-6`}><h3 className="text-lg font-semibold mb-4">{!product || product === "ALL" ? "Stock by Category" : `${product} Levels`}</h3><ResponsiveContainer width="100%" height={300}><BarChart data={stockAmountData}><CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} /><XAxis dataKey="month" fontSize={12} stroke={isDarkMode ? "#9ca3af" : "#374151"} tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }} /><YAxis fontSize={12} stroke={isDarkMode ? "#9ca3af" : "#374151"} tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }} /><Tooltip formatter={(v: number) => [v, "Amount"]} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: isDarkMode ? '1px solid #374151' : 'none', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }} itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#374151' }} /><Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
                            <div className={`${PANEL_SURFACE} p-6`}><h3 className="text-lg font-semibold mb-4">{!product || product === "ALL" ? "Value by Category" : `${product} Value`}</h3><ResponsiveContainer width="100%" height={300}><BarChart data={stockPriceData}><CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} /><XAxis dataKey="month" fontSize={12} stroke={isDarkMode ? "#9ca3af" : "#374151"} tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }} /><YAxis fontSize={12} stroke={isDarkMode ? "#9ca3af" : "#374151"} tick={{ fill: isDarkMode ? "#f3f4f6" : "#374151" }} /><Tooltip formatter={(v: number) => ["₱" + v.toLocaleString(), "Value"]} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: isDarkMode ? '1px solid #374151' : 'none', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }} itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#374151' }} /><Bar dataKey="prize" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
                            <div className={`${PANEL_SURFACE} p-6`}>
                                <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={categoryDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                                            {categoryDistributionData.map(e => <Cell key={e.name} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: isDarkMode ? '1px solid #374151' : 'none',
                                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                                color: isDarkMode ? '#ffffff' : '#111827'
                                            }}
                                            itemStyle={{ color: isDarkMode ? '#ffffff' : '#374151' }}
                                            labelStyle={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={`${PANEL_SURFACE} p-6`}>
                                <h3 className="text-lg font-semibold mb-4">Product Selection</h3>
                                <div className="relative h-[300px] overflow-y-auto pb-4 pr-4">
                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => setProduct("ALL")} className={`p-4 rounded-xl border-2 w-full text-left ${!product || product === "ALL" ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"}`}>
                                            <div className="font-semibold text-sm">All Products</div>
                                            <div className={`text-xs ${MUTED_TEXT} mt-1`}>{products.length} items</div>
                                        </button>
                                        <div className="grid grid-cols-2 gap-3">
                                            {products.map(p => (
                                                <button key={p._id} onClick={() => setProduct(p.name)} className={`p-4 rounded-xl border-2 w-full text-left ${product === p.name ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"}`}>
                                                    <div className="font-semibold text-sm truncate">{p.name}</div>
                                                    <div className={`text-xs ${MUTED_TEXT} mt-1`}>Stock: {p.amount}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>}

                        {/* Products Tab */}
                        {activeTab === "products" && <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                <div className="relative flex-1 sm:w-80"><input type="text" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${INPUT_SURFACE} pl-10`} /><MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" /></div>
                                <div className="flex gap-2"><button onClick={() => setShowArchivedProducts(v => !v)} className={`rounded-lg px-4 py-2 font-medium text-sm flex items-center gap-2 border ${showArchivedProducts ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}><ArrowPathIcon className="w-4 h-4" />{showArchivedProducts ? 'View Active' : 'View Archived'}</button><button onClick={exportToPDF} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium text-sm flex items-center gap-2"><DocumentArrowDownIcon className="w-4 h-4" />Export PDF</button><button onClick={handleCreate} className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium text-sm flex items-center gap-2"><PlusIcon className="w-4 h-4" />Add Product</button></div>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"><tr className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300"><th className="px-6 py-4">ID</th><th>Name</th><th>Category</th><th className="text-center">Qty</th><th className="text-center">Min Qty</th><th className="text-right">Unit Price</th><th className="text-right">Entry Price</th><th className="text-center">Actions</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {(showArchivedProducts ? archivedProducts : filteredProducts).map((p: any) => <tr key={p._id} className={`${showArchivedProducts ? "bg-amber-50/50 dark:bg-amber-900/10" : ""} hover:bg-gray-50 dark:hover:bg-gray-700/30`}><td className="px-6 py-4 font-mono text-xs">{p.originalId ? p.originalId.slice(-6) : p._id.slice(-6)}</td><td className={showArchivedProducts ? "line-through" : ""}>{p.name}</td><td>{p.category ? <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">{p.category}</span> : '-'}</td><td className="text-center"><span className={`px-3 py-1 rounded-full text-sm font-medium ${p.amount <= p.minAmount ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'}`}>{p.amount}</span></td><td className="text-center">{p.minAmount}</td><td className="text-right">₱{p.price.toFixed(2)}</td><td className="text-right">₱{p.entryPrice.toFixed(2)}</td><td className="px-6 py-4 flex justify-center">{showArchivedProducts ? <button onClick={() => restoreArchivedProduct(p._id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Restore</button> : <div className="flex justify-center gap-2"><button onClick={() => handleEdit(p._id)} className="p-2 text-blue-600 dark:text-blue-400"><PencilSquareIcon className="w-4 h-4" /></button><button onClick={() => setArchiveProductId(p._id)} className="p-2 text-amber-600 dark:text-amber-400"><ArchiveBoxIcon className="w-4 h-4" /></button></div>}</td></tr>)}
                                </tbody>
                            </table></div>
                        </div>}

                        {/* Employees Tab */}
                        {activeTab === "employee" && <div className="space-y-6">
                             <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                <div className="relative flex-1 sm:w-80"><input type="text" placeholder="Search employees..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className={`${INPUT_SURFACE} pl-10`} /><MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" /></div>
                                <div className="flex gap-2"><button onClick={() => setShowArchivedEmployees(v => !v)} className={`rounded-lg px-4 py-2 font-medium text-sm flex items-center gap-2 border ${showArchivedEmployees ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}><ArrowPathIcon className="w-4 h-4" />{showArchivedEmployees ? 'View Active' : 'View Archived'}</button><button onClick={handleAddEmployee} className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium text-sm flex items-center gap-2"><UserPlusIcon className="w-4 h-4" />Add Employee</button></div>
                            </div>
                            <div className="overflow-x-auto"><table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"><tr className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300"><th className="px-6 py-4">Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th><th className="text-center">Actions</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {(showArchivedEmployees ? archivedEmployees : filteredEmployees).map((e: any) => <tr key={e._id} className={`${showArchivedEmployees ? "bg-amber-50/50 dark:bg-amber-900/10" : ""} hover:bg-gray-50 dark:hover:bg-gray-700/30`}><td className="px-6 py-4 flex items-center gap-3">{e.avatarUrl || e.avatar ? <img src={e.avatarUrl || e.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><span className="text-gray-600 dark:text-gray-300 font-semibold">{e.fullName ? e.fullName.charAt(0).toUpperCase() : ''}</span></div>}<span className={showArchivedEmployees ? "line-through" : ""}>{e.fullName}</span></td><td><span className={`px-2 py-1 rounded-full text-xs ${e.role === 'Operations Manager' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}`}>{e.role}</span></td><td>{e.email}</td><td>{e.phone}</td><td><span className={`px-2 py-1 rounded-full text-xs ${e.active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>{showArchivedEmployees ? 'Archived' : e.active ? 'Active' : 'Inactive'}</span></td><td className="px-6 py-4 text-center">{showArchivedEmployees ? <button onClick={() => restoreArchivedEmployee(e._id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Restore</button> : <div className="flex justify-center gap-2"><button onClick={() => handleEditEmployee(e._id)} className="p-2 text-blue-600 dark:text-blue-400"><PencilSquareIcon className="w-4 h-4" /></button><button onClick={() => setArchiveEmployeeId(e._id)} className="p-2 text-amber-600 dark:text-amber-400"><ArchiveBoxIcon className="w-4 h-4" /></button></div>}</td></tr>)}
                                </tbody>
                            </table></div>
                        </div>}
                    </div>
                </div>

                {/* Modals */}
                <Transition show={!!archiveProductId} as={Fragment}>
                    <Dialog onClose={() => setArchiveProductId(null)} className="relative z-50"><Transition.Child as={Fragment} enter="ease-out" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/70 dark:bg-black/80" /></Transition.Child><div className="fixed inset-0 p-4 flex items-center justify-center"><DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-4 w-full max-w-md"><Dialog.Title className="font-semibold text-lg">Archive Product</Dialog.Title><p className="mt-2 text-sm">Are you sure you want to archive "{productToArchiveName}"?</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setArchiveProductId(null)} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm">Cancel</button><button onClick={confirmArchiveProduct} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm">Archive</button></div></DialogPanel></div></Dialog>
                </Transition>

                <Transition show={showModal} as={Fragment}>
                    <Dialog onClose={handleCancel} className="relative z-50"><Transition.Child as={Fragment} enter="ease-out" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/70 dark:bg-black/80" /></Transition.Child><div className="fixed inset-0 p-4 flex items-center justify-center"><DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-4 w-full max-w-md"><Dialog.Title className="font-semibold text-lg">{editIndex ? "Edit Product" : "Add Product"}</Dialog.Title><form onSubmit={e => { e.preventDefault(); handleSave(); }} className="mt-4 space-y-4"><div><label className="text-xs">Product Name</label><input value={form.product} onChange={e => setForm(f => ({...f, product: e.target.value}))} className={`${INPUT_SURFACE} ${errors.product ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}</div><div ref={categoryWrapperRef} className="relative"><label className="text-xs">Category</label><input ref={categoryInputRef} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} onFocus={() => setShowCategoryMenu(true)} onKeyDown={onCategoryKeyDown} className={`${INPUT_SURFACE} border-gray-300 dark:border-gray-600`} />{showCategoryMenu && <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-900 shadow-lg"><Listbox value={form.category} onChange={selectCategory}>{filteredCategorySuggestions.map(c => <Listbox.Option key={c} value={c} className="cursor-pointer select-none relative py-2 pl-10 pr-4 hover:bg-gray-100 dark:hover:bg-gray-700">{c}</Listbox.Option>)}</Listbox></div>}</div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs">Quantity</label><input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} className={`${INPUT_SURFACE} ${errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}</div><div><label className="text-xs">Min. Quantity</label><input type="number" value={form.minQuantity} onChange={e => setForm(f => ({...f, minQuantity: e.target.value}))} className={`${INPUT_SURFACE} ${errors.minQuantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{errors.minQuantity && <p className="text-xs text-red-500 mt-1">{errors.minQuantity}</p>}</div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs">Unit Price</label><input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({...f, unitPrice: e.target.value}))} className={`${INPUT_SURFACE} ${errors.unitPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{errors.unitPrice && <p className="text-xs text-red-500 mt-1">{errors.unitPrice}</p>}</div><div><label className="text-xs">Entry Price</label><input type="number" step="0.01" value={form.entryPrice} onChange={e => setForm(f => ({...f, entryPrice: e.target.value}))} className={`${INPUT_SURFACE} ${errors.entryPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{errors.entryPrice && <p className="text-xs text-red-500 mt-1">{errors.entryPrice}</p>}</div></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={handleCancel} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">{editIndex ? 'Save Changes' : 'Create'}</button></div></form></DialogPanel></div></Dialog>
                </Transition>

                <Transition show={!!archiveEmployeeId} as={Fragment}>
                     <Dialog onClose={() => setArchiveEmployeeId(null)} className="relative z-50"><Transition.Child as={Fragment} enter="ease-out" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/70 dark:bg-black/80" /></Transition.Child><div className="fixed inset-0 p-4 flex items-center justify-center"><DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-4 w-full max-w-md"><Dialog.Title className="font-semibold text-lg">Archive Employee</Dialog.Title><p className="mt-2 text-sm">Are you sure you want to archive "{employeeToArchiveName}"?</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setArchiveEmployeeId(null)} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm">Cancel</button><button onClick={confirmArchiveEmployee} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm">Archive</button></div></DialogPanel></div></Dialog>
                </Transition>

                <Transition show={showEmployeeModal} as={Fragment}>
                    <Dialog onClose={handleCancelEmployee} className="relative z-50"><Transition.Child as={Fragment} enter="ease-out" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/70 dark:bg-black/80" /></Transition.Child><div className="fixed inset-0 p-4 flex items-center justify-center"><DialogPanel className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-6 w-full max-w-lg"><Dialog.Title className="font-semibold text-xl text-center mb-4">{editEmployeeIndex ? "Edit Employee" : "Add Employee"}</Dialog.Title><form onSubmit={e => { e.preventDefault(); handleSaveEmployee(); }} className="space-y-5">
                        <div className="flex flex-col items-center gap-3"><div role="button" tabIndex={0} onClick={openEmployeeAvatarDialog} onKeyDown={e => {if(e.key === 'Enter' || e.key === ' ') openEmployeeAvatarDialog()}} onDragOver={e => {e.preventDefault(); setEmployeeAvatarDragActive(true)}} onDragLeave={() => setEmployeeAvatarDragActive(false)} onDrop={handleEmployeeAvatarDrop} className={`relative h-28 w-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden ${employeeAvatarDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-300 dark:border-gray-600'}`}>{currentEmployeeAvatar ? <img src={currentEmployeeAvatar} alt="Avatar" className="h-full w-full object-cover" /> : <div className="text-center text-xs text-gray-500"><PhotoIcon className="mx-auto h-8 w-8" />Upload</div>}</div><input type="file" accept="image/*" ref={employeeAvatarInputRef} className="hidden" onChange={e => handleEmployeeAvatarInput(e.target.files)} />{currentEmployeeAvatar && <button type="button" onClick={handleEmployeeAvatarRemove} className="text-xs text-red-500 hover:underline">Remove</button>}{employeeErrors.avatar && <p className="text-xs text-red-500">{employeeErrors.avatar}</p>}</div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div><label className="text-xs mb-1 block">Full Name</label><input value={employeeForm.fullName} onChange={e => setEmployeeForm(f => ({...f, fullName: e.target.value}))} className={`${INPUT_SURFACE} ${errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{employeeErrors.fullName && <p className="text-xs text-red-500 mt-1">{employeeErrors.fullName}</p>}</div>
                            <div><label className="text-xs mb-1 block">Role</label><Listbox value={employeeForm.role} onChange={v => setEmployeeForm(f => ({...f, role: v}))}><div className="relative"><Listbox.Button className={`${INPUT_SURFACE} flex justify-between items-center text-left ${errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}><span>{employeeForm.role || "Select role"}</span><ChevronUpDownIcon className="h-5 w-5 text-gray-400" /></Listbox.Button><Listbox.Options className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-auto focus:outline-none sm:text-sm">{EMPLOYEE_ROLE_OPTIONS.map(o => <Listbox.Option key={o} value={o} className="cursor-pointer select-none relative py-2 pl-10 pr-4 hover:bg-gray-100 dark:hover:bg-gray-700">{({selected}) => <><span className={selected ? 'font-medium' : 'font-normal'}>{o}</span>{selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"><CheckIcon className="h-5 w-5" /></span> : null}</> }</Listbox.Option>)}</Listbox.Options></div></Listbox>{employeeErrors.role && <p className="text-xs text-red-500 mt-1">{employeeErrors.role}</p>}</div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div><label className="text-xs mb-1 block">Email</label><input type="email" value={employeeForm.email} onChange={e => setEmployeeForm(f => ({...f, email: e.target.value}))} className={`${INPUT_SURFACE} ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{employeeErrors.email && <p className="text-xs text-red-500 mt-1">{employeeErrors.email}</p>}</div>
                            <div><label className="text-xs mb-1 block">Phone</label><input type="tel" value={employeeForm.phone} onChange={e => setEmployeeForm(f => ({...f, phone: e.target.value}))} className={`${INPUT_SURFACE} ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{employeeErrors.phone && <p className="text-xs text-red-500 mt-1">{employeeErrors.phone}</p>}</div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                             <div><label className="text-xs mb-1 block">Password</label><input type="password" value={employeeForm.password} onChange={e => setEmployeeForm(f => ({...f, password: e.target.value}))} className={`${INPUT_SURFACE} ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} placeholder={editEmployeeIndex ? "Leave blank to keep" : ""} />{employeeErrors.password && <p className="text-xs text-red-500 mt-1">{employeeErrors.password}</p>}</div>
                             <div><label className="text-xs mb-1 block">Confirm Password</label><input type="password" value={employeeForm.confirmPassword} onChange={e => setEmployeeForm(f => ({...f, confirmPassword: e.target.value}))} className={`${INPUT_SURFACE} ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />{employeeErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{employeeErrors.confirmPassword}</p>}</div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={handleCancelEmployee} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm">Cancel</button><button type="submit" disabled={isSavingEmployee} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-70">{isSavingEmployee ? "Saving..." : (editEmployeeIndex ? "Save Changes" : "Add Employee")}</button></div>
                    </form></DialogPanel></div></Dialog>
                </Transition>

                {employeeCropperSrc && <CropperModal src={employeeCropperSrc} aspect={1} theme={isDarkMode ? "dark" : "light"} onCancel={() => { revokeBlobUrl(employeeCropperSrc); setEmployeeCropperSrc(null); }} onApply={file => { const url = URL.createObjectURL(file); setEmployeeAvatarPreview(p => {revokeBlobUrl(p); return url;}); setEmployeeAvatarFile(file); revokeBlobUrl(employeeCropperSrc); setEmployeeCropperSrc(null); }} />}
            </div>
        </DashboardLayout>
    );
};

export default Inventory;
