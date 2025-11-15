import React, { useState, useMemo, useEffect, Fragment, useRef, useCallback } from "react";
import { Dialog, DialogPanel, Transition, Listbox } from "@headlessui/react";
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
    PhotoIcon,
    ChevronUpDownIcon
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "../shared_components/DashboardLayout";
import api from "../../../lib/api";
import { isAxiosError } from "axios";
import jsPDF from 'jspdf';
import CropperModal from "../../../components/CropperModal";
import { useAuth } from "../../../context/AuthContext";


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

const EMPLOYEE_ROLE_OPTIONS = [
    "Operations Manager",
    "Front Desk",
    "Inventory & Supplies",
    "Printer Operator",
];

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

const Inventory: React.FC = () => {
    const { user } = useAuth();
    const isOwner = user?.role === "owner";
    const isOperationsManager = user?.role === "employee" && user?.employeeRole === "Operations Manager";
    const isInventoryStaff = user?.role === "employee" && user?.employeeRole === "Inventory & Supplies";
    const hasInventoryAccess = Boolean(isOwner || isOperationsManager || isInventoryStaff);
    const canViewEmployees = Boolean(isOwner || isOperationsManager);
    const showEmployeeSections = canViewEmployees && !isInventoryStaff;
    const summaryGridClasses = showEmployeeSections
        ? "grid sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4"
        : "grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4";
    const canManageEmployees = Boolean(isOwner);

    // Product state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(createEmptyProductForm);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [product, setProduct] = useState("");
    const [editIndex, setEditIndex] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [productStatusFilter, setProductStatusFilter] = useState<"ALL" | "LOW" | "OK">("ALL");
    const [productSortKey, setProductSortKey] = useState<"product" | "quantity" | "unitPrice">("product");
    const [productSortDir, setProductSortDir] = useState<"asc" | "desc">("asc");
    const [showProductFilters, setShowProductFilters] = useState(false);

    // Employee state
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(() => createEmptyEmployeeForm());
    const [employeeErrors, setEmployeeErrors] = useState<{ [key: string]: string }>({});
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState<"ALL" | "Manager" | "Staff">("ALL");
    const [employeeSortKey, setEmployeeSortKey] = useState<"fullName" | "role">("fullName");
    const [employeeSortDir, setEmployeeSortDir] = useState<"asc" | "desc">("asc");
    const [showEmployeeFilters, setShowEmployeeFilters] = useState(false);
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

    useEffect(() => {
        return () => {
            revokeBlobUrl(employeeAvatarPreview);
        };
    }, [employeeAvatarPreview]);

    useEffect(() => {
        return () => {
            revokeBlobUrl(employeeCropperSrc);
        };
    }, [employeeCropperSrc]);

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
        setIsSavingEmployee(false);
        setEditEmployeeIndex(null);
    };

    const openEmployeeAvatarDialog = () => {
        employeeAvatarInputRef.current?.click();
    };

    const triggerEmployeeCropper = (file: File) => {
        if (!file.type.startsWith("image/")) {
            setEmployeeErrors(prev => ({ ...prev, avatar: "Please upload an image file." }));
            return;
        }
        setEmployeeErrors(prev => {
            if (!prev.avatar) return prev;
            const rest = { ...prev };
            delete rest.avatar;
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
        const file = files?.[0] || null;
        if (!file) return;
        triggerEmployeeCropper(file);
        setEmployeeAvatarRemoved(false);
    };

    const handleEmployeeAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setEmployeeAvatarDragActive(false);
        const file = e.dataTransfer.files?.[0] || null;
        if (!file) return;
        triggerEmployeeCropper(file);
        setEmployeeAvatarRemoved(false);
    };

    const handleEmployeeAvatarRemove = () => {
        revokeBlobUrl(employeeAvatarPreview);
        setEmployeeAvatarPreview(null);
        setEmployeeAvatarFile(null);
        setEmployeeAvatarRemoved(true);
        setEmployeeAvatarExisting(null);
    };

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

    useEffect(() => {
        if (!canManageEmployees) {
            setShowDeletedEmployees(false);
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
                setDeletedProducts([]);
            }
            return;
        }
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
    }, [hasInventoryAccess]);

    const reloadEmployeeLists = useCallback(async () => {
        if (!canViewEmployees) {
            if (isMountedRef.current) {
                setEmployees([]);
                setDeletedEmployees([]);
            }
            return;
        }

        const employeePromise = api.get("/employees/mine");
        const deletedPromise = canManageEmployees ? api.get("/employees/deleted") : null;
        const employeeRes = await employeePromise;
        const deletedRes = deletedPromise ? await deletedPromise : null;

        if (!isMountedRef.current) return;

        const employeeList: Employee[] = employeeRes.data || [];
        const archivedEmployees: DeletedEmployee[] = deletedRes?.data || [];

        setEmployees(employeeList);
        setDeletedEmployees(archivedEmployees);
    }, [canViewEmployees, canManageEmployees]);

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

    // Category dropdown state
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
            setIsSavingProduct(true);
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
        } finally {
            setIsSavingProduct(false);
        }
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

    function openCategoryMenu() {
        if (!categorySuggestions.length) return;
        setShowCategoryMenu(true);
        setCategoryHighlight(-1);
    }

    function selectCategory(value: string) {
        setForm(f => ({ ...f, category: value }));
        setShowCategoryMenu(false);
        setCategoryHighlight(-1);
        requestAnimationFrame(() => categoryInputRef.current?.focus());
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
                const next = h + 1 >= list.length ? 0 : h + 1;
                return next;
            });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCategoryHighlight(h => {
                const list = filteredCategorySuggestions;
                if (!list.length) return -1;
                const next = h - 1 < 0 ? list.length - 1 : h - 1;
                return next;
            });
        } else if (e.key === "Enter") {
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

    const stockAmountData = useMemo(() => {
        if (!products.length) return [];
        if (!product || product === "ALL") {
            const buckets = new Map<string, number>();
            products.forEach((p) => {
                const key = p.category?.trim() || "Uncategorized";
                buckets.set(key, (buckets.get(key) || 0) + Math.max(Number(p.amount) || 0, 0));
            });
            return Array.from(buckets.entries()).map(([category, amount]) => ({ month: category, amount }));
        }
        const target = products.find((p) => p.name === product);
        if (!target) return [];
        return [{ month: target.name, amount: Math.max(Number(target.amount) || 0, 0) }];
    }, [product, products]);

    const stockPriceData = useMemo(() => {
        if (!products.length) return [];
        if (!product || product === "ALL") {
            const buckets = new Map<string, number>();
            products.forEach((p) => {
                const key = p.category?.trim() || "Uncategorized";
                const totalValue = Math.max(Number(p.amount) || 0, 0) * Math.max(Number(p.price) || 0, 0);
                buckets.set(key, (buckets.get(key) || 0) + totalValue);
            });
            return Array.from(buckets.entries()).map(([category, prize]) => ({ month: category, prize }));
        }
        const target = products.find((p) => p.name === product);
        if (!target) return [];
        const prize = Math.max(Number(target.amount) || 0, 0) * Math.max(Number(target.price) || 0, 0);
        return [{ month: target.name, prize }];
    }, [product, products]);

    const profitAndExpenses = useMemo(() => {
        const totals = filteredProducts.reduce(
            (acc, item) => {
                const quantity = Number(item.amount) || 0;
                const unitPrice = Number(item.price) || 0;
                const entryPrice = Number(item.entryPrice) || 0;
                const minAmount = Math.max(Number(item.minAmount) || 0, 0);

                acc.totalStockValue += unitPrice * quantity;
                acc.totalEntryCost += entryPrice * quantity;

                const deficit = Math.max(minAmount - quantity, 0);
                acc.restockBuffer += deficit * entryPrice;

                return acc;
            },
            {
                totalStockValue: 0,
                totalEntryCost: 0,
                restockBuffer: 0,
            }
        );

        const grossProfit = totals.totalStockValue - totals.totalEntryCost;
        const profitMargin = totals.totalStockValue > 0 ? (grossProfit / totals.totalStockValue) * 100 : 0;
        const safetyExpenses = totals.totalEntryCost * 0.1;
        const estimatedExpenses = totals.restockBuffer > 0 ? totals.restockBuffer : safetyExpenses;

        return {
            totalStockValue: totals.totalStockValue,
            totalEntryCost: totals.totalEntryCost,
            grossProfit,
            profitMargin,
            estimatedExpenses,
        };
    }, [filteredProducts]);

    // Employee filter and sort (like Service Management)
    const filteredEmployees = useMemo(() => {
        if (!canViewEmployees) return [];
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
    }, [employees, employeeSearch, employeeRoleFilter, employeeSortKey, employeeSortDir, canViewEmployees]);


    // Employee handlers
    const handleAddEmployee = () => {
        if (!canManageEmployees) return;
        resetEmployeeModalState();
        setShowEmployeeModal(true);
    };

    const validateEmployeeFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!employeeForm.fullName.trim()) newErrors.fullName = "Full name is required.";
        const roleValue = employeeForm.role.trim();
        if (!roleValue) newErrors.role = "Role is required.";
        else if (!EMPLOYEE_ROLE_OPTIONS.includes(roleValue)) newErrors.role = "Please select a valid role.";
        const email = employeeForm.email.trim();
        if (!email) newErrors.email = "Email address is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email address.";
        const phone = employeeForm.phone.trim();
        if (!phone) newErrors.phone = "Phone number is required.";
        else if (!/^\+?[0-9\s-]{7,15}$/.test(phone)) newErrors.phone = "Enter a valid phone number.";
        const wantsPassword = editEmployeeIndex === null || employeeForm.password.trim().length > 0 || employeeForm.confirmPassword.trim().length > 0;
        if (wantsPassword) {
            const password = employeeForm.password.trim();
            const confirm = employeeForm.confirmPassword.trim();
            if (!password) newErrors.password = "Password is required.";
            else if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
            if (!confirm) newErrors.confirmPassword = "Confirm your password.";
            else if (password !== confirm) newErrors.confirmPassword = "Passwords do not match.";
        }
        return newErrors;
    };

    const handleSaveEmployee = async () => {
        if (!canManageEmployees) return;
        const newErrors = validateEmployeeFields();
        setEmployeeErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        
        try {
            setError(null);
            setIsSavingEmployee(true);
            const payload: Record<string, unknown> = {
                fullName: employeeForm.fullName.trim(),
                role: employeeForm.role.trim(),
                email: employeeForm.email.trim(),
                phone: employeeForm.phone.trim(),
            };
            if (employeeForm.password.trim()) {
                payload.password = employeeForm.password.trim();
            }
            if (employeeAvatarRemoved) {
                payload.avatar = "";
            } else if (employeeAvatarFile) {
                payload.avatar = await fileToBase64(employeeAvatarFile);
            }

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
        } finally {
            setIsSavingEmployee(false);
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
            phone: e.phone || "",
            password: "",
            confirmPassword: "",
        });
        setEmployeeAvatarExisting(e.avatarUrl || e.avatar || null);
        setEmployeeAvatarRemoved(false);
        setEditEmployeeIndex(id);
        setShowEmployeeModal(true);
        setEmployeeErrors({});
    };

    const confirmDeleteEmployee = async () => {
        if (!canManageEmployees) return;
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
        if (!canManageEmployees) return;
        try {
            setError(null);
            await api.post(`/employees/deleted/${archivedId}/restore`);
            await reloadEmployeeLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to restore employee"));
        }
    };

    const handleCancelEmployee = () => {
        resetEmployeeModalState();
        setShowEmployeeModal(false);
    };

    // PDF Export function
    const exportToPDF = async () => {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Title
            pdf.setFontSize(20);
            pdf.text('Profit & Expenses Ledger', pageWidth / 2, 20, { align: 'center' });
            
            // Date
            pdf.setFontSize(12);
            pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
            
            let yPosition = 50;
            
            // Summary section
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
            
            // Products table
            pdf.setFontSize(16);
            pdf.text('Inventory Items', 20, yPosition);
            yPosition += 10;
            
            // Table headers
            pdf.setFontSize(10);
            pdf.text('Product', 20, yPosition);
            pdf.text('Category', 60, yPosition);
            pdf.text('Quantity', 90, yPosition);
            pdf.text('Unit Price', 110, yPosition);
            pdf.text('Entry Price', 130, yPosition);
            pdf.text('Total Value', 150, yPosition);
            yPosition += 5;
            
            // Draw line
            pdf.line(20, yPosition, 180, yPosition);
            yPosition += 5;
            
            // Table data
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
            
            // Save the PDF
            pdf.save(`profit-expenses-ledger-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        }
    };

    if (!hasInventoryAccess) {
        return (
            <DashboardLayout role="owner">
                <div className="max-w-4xl mx-auto text-center text-white mt-12">
                    <p>You do not have permission to manage inventory.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="owner">
            <div className="transition-all duration-300 font-crimson p-8">
                <div className="w-full max-w-7xl mx-auto space-y-4">
                    {/* Summary Cards */}
                    <div className={summaryGridClasses}>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <BanknotesIcon className="w-5 h-5 text-gray-700" />
                            </span>
                            <div className="text-base font-bold text-gray-900">
                                ₱ {profitAndExpenses.totalStockValue.toLocaleString()}
                            </div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Stock Value</div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                            </span>
                            <div className={`text-base font-bold ${profitAndExpenses.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₱ {profitAndExpenses.grossProfit.toLocaleString()}
                            </div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">
                                Profit ({profitAndExpenses.profitMargin.toFixed(1)}%)
                            </div>
                        </div>
                        <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                            <span className="text-lg bg-white rounded-full p-1">
                                <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
                            </span>
                            <div className="text-base font-bold text-red-600">
                                ₱ {profitAndExpenses.estimatedExpenses.toLocaleString()}
                            </div>
                            <div className="text-gray-800 text-[0.7rem] uppercase">Est. Expenses</div>
                            <div className="text-gray-600 text-[0.6rem] text-center">(10% of entry cost)</div>
                        </div>
                        {showEmployeeSections && (
                            <div className="bg-white/90 rounded-xl shadow-md p-2 flex flex-col items-center">
                                <span className="text-lg bg-white rounded-full p-1">
                                    <UsersIcon className="w-5 h-5 text-blue-700" />
                                </span>
                                <div className="text-base font-bold text-gray-900">{employees.length}</div>
                                <div className="text-gray-800 text-[0.7rem] uppercase">Employees</div>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">{error}</div>
                    )}

                    {/* Merged Graphs & Product Selection */}
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="bg-[#e7ecf7] rounded-xl shadow-md p-3 flex relative">
                            <div className="flex-1 flex flex-col gap-4 justify-center">
                                {/* Stock Amount Graph */}
                                <div>
                                    <h2 className="text-[0.95rem] font-bold mb-1">
                                        {product === "ALL" || !product ? "Stock by Category" : "Stock Levels"}
                                    </h2>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <BarChart data={stockAmountData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" fontSize={10} />
                                            <YAxis allowDecimals={false} fontSize={10} />
                                            <Tooltip formatter={(v: number) => [v, "Amount"]} />
                                            <Bar dataKey="amount" fill="#2a3b7c" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Stock Value Graph */}
                                <div>
                                    <h2 className="text-[0.95rem] font-bold mb-1">
                                        {product === "ALL" || !product ? "Value by Category" : "Price Analysis"}
                                    </h2>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <BarChart data={stockPriceData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" fontSize={10} />
                                            <YAxis allowDecimals={false} fontSize={10} />
                                            <Tooltip formatter={(v: number) => ["₱" + v.toLocaleString(), "Value"]} />
                                            <Bar dataKey="prize" fill="#2a3b7c" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            {/* Product selection styled and inside merged graph border */}
                            <div className="flex flex-col gap-1 ml-4 justify-center min-w-[120px]">
                                <button
                                    onClick={() => setProduct("ALL")}
                                    className={`rounded-lg py-1 px-2 text-[0.85rem] font-bold uppercase transition text-left
                                        ${product === "ALL" || !product
                                            ? "bg-gray-600 text-white"
                                            : "bg-gray-300 text-gray-900 hover:bg-gray-400"
                                        }`}
                                    style={{
                                        border: (product === "ALL" || !product) ? "2px solid #3b4a6b" : "2px solid transparent",
                                        boxShadow: (product === "ALL" || !product) ? "0 2px 8px #3b4a6b22" : undefined,
                                    }}
                                >
                                    All Products
                                </button>
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
                        <button
                            className="bg-gray-200 text-gray-800 rounded-lg px-3 py-1 font-normal text-[0.95rem] flex items-center gap-2 border border-gray-300"
                            title={showDeletedProducts ? 'Return to active products' : 'Show deleted products'}
                            onClick={() => setShowDeletedProducts(v => !v)}
                            aria-pressed={showDeletedProducts}
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${showDeletedProducts ? 'text-green-700' : 'text-gray-700'}`} />
                            {showDeletedProducts ? 'Active' : 'Deleted'}
                        </button>
                        <button className="bg-green-400 text-black rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-1" onClick={handleCreate}>
                            <PlusIcon className="w-5 h-5" /> Create
                        </button>
                        <button className="bg-blue-400 text-white rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-1" onClick={exportToPDF}>
                            <DocumentArrowDownIcon className="w-5 h-5" /> Export PDF
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
                        <div className="font-bold text-lg text-center mb-2">{showDeletedProducts ? 'DELETED PRODUCTS' : 'PRODUCTS'}</div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[0.95rem] border-b-2 border-gray-400">
                                    <td>Product ID</td>
                                    <td>Product</td>
                                    <td>Category</td>
                                    <td>Quantity</td>
                                    <td>Min. Quantity</td>
                                    <td>Unit Price</td>
                                    <td>Entry Price</td>
                                    <td className="text-right">Actions</td>
                                </tr>
                            </thead>
                            <tbody>
                                {!showDeletedProducts && filteredProducts.map((p) => (
                                    <tr key={p._id} className="text-[0.95rem]">
                                        <td>{p._id.slice(-6).toUpperCase()}</td>
                                        <td>{p.name}</td>
                                        <td>{p.category || '-'}</td>
                                        <td>{p.amount}</td>
                                        <td>{p.minAmount}</td>
                                        <td>₱{p.price}</td>
                                        <td>₱{p.entryPrice}</td>
                                        <td className="flex gap-1 items-center justify-end py-1">
                                            <button
                                                className="p-2 rounded-lg hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEdit(p._id)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-lg hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                onClick={() => setDeleteProductId(p._id)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {showDeletedProducts && deletedProducts.map((item) => (
                                    <tr key={item._id} className="text-[0.95rem]">
                                        <td>{item.originalId.slice(-6).toUpperCase()}</td>
                                        <td>{item.name}</td>
                                        <td>{item.category || '-'}</td>
                                        <td>{item.amount}</td>
                                        <td>{item.minAmount}</td>
                                        <td>₱{item.price}</td>
                                        <td>₱{item.entryPrice}</td>
                                        <td className="flex gap-1 items-center justify-end py-2">
                                            <button
                                                className="px-3 py-1 rounded-lg  hover:bg-green-300 text-green-800 text-sm"
                                                onClick={() => restoreDeletedProduct(item._id)}
                                            >
                                                Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {showDeletedProducts && deletedProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-6 text-center text-sm text-gray-500">No deleted products.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {showDeletedProducts && (
                            <p className="mt-2 text-[0.7rem] text-gray-500 italic text-right">
                                Deleted products are automatically purged after 30 days.
                            </p>
                        )}
                    </div>

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
                                                onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
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
                                                        disabled={isSavingProduct}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed font-semibold text-sm inline-flex items-center gap-1"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                        {isSavingProduct ? 'Saving...' : editIndex !== null ? 'Save changes' : 'Create product'}
                                                    </button>
                                                </div>
                                            </form>
                                        </DialogPanel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>

                    {showEmployeeSections && (
                        <>
                    {/* Employee List Section - identical to Product Table UI */}
                    <div className="bg-white/90 rounded-xl shadow-md p-3 mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className="font-bold text-lg">{showDeletedEmployees ? 'Deleted Employees' : 'Employee List'}</div>
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
                                    className="bg-gray-200 text-gray-800 rounded-lg px-3 py-1 font-normal text-[0.95rem] flex items-center gap-2 border border-gray-300"
                                    title={showDeletedEmployees ? 'Return to active employees' : 'Show deleted employees'}
                                    onClick={() => setShowDeletedEmployees(v => !v)}
                                    aria-pressed={showDeletedEmployees}
                                >
                                    <ArrowPathIcon className={`w-5 h-5 ${showDeletedEmployees ? 'text-green-700' : 'text-gray-700'}`} />
                                    {showDeletedEmployees ? 'Active' : 'Deleted'}
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
                                    <td className="text-right">Actions</td>
                                </tr>
                            </thead>
                            <tbody>
                                {!showDeletedEmployees && filteredEmployees.map((e) => (
                                    <tr key={e._id} className="text-[0.95rem]">
                                        <td>{e.fullName}</td>
                                        <td>{e.role}</td>
                                        <td className="flex gap-1 items-center justify-end py-1">
                                            <button
                                                className="p-2 rounded-lg  hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEditEmployee(e._id)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-lg  hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                onClick={() => setDeleteEmployeeId(e._id)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {showDeletedEmployees && deletedEmployees.map((item) => (
                                    <tr key={item._id} className="text-[0.95rem]">
                                        <td>{item.fullName}</td>
                                        <td>{item.role}</td>
                                        <td className="flex gap-1 items-center justify-end py-2">
                                            <button
                                                className="px-3 py-1 rounded-lg bg-green-200 hover:bg-green-300 text-green-800 text-sm"
                                                onClick={() => restoreDeletedEmployee(item._id)}
                                            >
                                                Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {showDeletedEmployees && deletedEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-6 text-center text-sm text-gray-500">No deleted employees.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {showDeletedEmployees && (
                            <p className="mt-2 text-[0.7rem] text-gray-500 italic text-right">
                                Deleted employees are automatically purged after 30 days.
                            </p>
                        )}
                    </div>
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
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                                <button
                                    type="button"
                                    onClick={handleCancelEmployee}
                                    className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                    aria-label="Close"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                                <h2 className="mb-4 text-center text-xl font-bold text-gray-900">
                                    {editEmployeeIndex !== null ? "Edit Employee" : "Add Employee"}
                                </h2>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        void handleSaveEmployee();
                                    }}
                                    className="space-y-5"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={openEmployeeAvatarDialog}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    openEmployeeAvatarDialog();
                                                }
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setEmployeeAvatarDragActive(true);
                                            }}
                                            onDragEnter={(e) => {
                            e.preventDefault();
                            setEmployeeAvatarDragActive(true);
                        }}
                                            onDragLeave={(e) => {
                                                e.preventDefault();
                                                setEmployeeAvatarDragActive(false);
                                            }}
                                            onDrop={handleEmployeeAvatarDrop}
                                            className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition ${employeeAvatarDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
                                            aria-label="Upload avatar"
                                        >
                                            {currentEmployeeAvatar ? (
                                                <img src={currentEmployeeAvatar} alt="Employee avatar" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center text-xs text-gray-500">
                                                    <PhotoIcon className="mb-1 h-8 w-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={employeeAvatarInputRef}
                                            onChange={(e) => {
                                                handleEmployeeAvatarInput(e.target.files);
                                                e.target.value = "";
                                            }}
                                        />
                                        {currentEmployeeAvatar && (
                                            <button
                                                type="button"
                                                onClick={handleEmployeeAvatarRemove}
                                                className="text-xs font-medium text-red-500 hover:text-red-600"
                                            >
                                                Remove photo
                                            </button>
                                        )}
                                        {employeeErrors.avatar && (
                                            <p className="text-xs text-red-500">{employeeErrors.avatar}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-700">Full Name</label>
                                            <input
                                                value={employeeForm.fullName}
                                                onChange={e => setEmployeeForm(f => ({ ...f, fullName: e.target.value }))}
                                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeErrors.fullName ? "border-red-400" : "border-gray-300"}`}
                                                placeholder="Juan Dela Cruz"
                                            />
                                            {employeeErrors.fullName && <p className="mt-1 text-xs text-red-500">{employeeErrors.fullName}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-700">Role</label>
                                            <Listbox
                                                value={employeeForm.role}
                                                onChange={(value: string) => {
                                                    setEmployeeForm(f => ({ ...f, role: value }));
                                                }}
                                            >
                                                <div className="relative">
                                                    <Listbox.Button
                                                        className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeErrors.role ? "border-red-400" : "border-gray-300"} flex items-center justify-between text-left`}
                                                        aria-describedby={employeeErrors.role ? "employee-role-error" : undefined}
                                                    >
                                                        <span className={employeeForm.role ? "text-gray-900" : "text-gray-500"}>
                                                            {employeeForm.role || "Select a role"}
                                                        </span>
                                                        <ChevronUpDownIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                                                    </Listbox.Button>
                                                    <Transition
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                    >
                                                        <Listbox.Options className="absolute left-0 right-0 z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
                                                            {EMPLOYEE_ROLE_OPTIONS.map(option => (
                                                                <Listbox.Option
                                                                    key={option}
                                                                    value={option}
                                                                    className={({ active }) =>
                                                                        `flex cursor-pointer items-center justify-between px-3 py-2 ${active ? "bg-blue-100 text-blue-900" : "text-gray-900"}`
                                                                    }
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`truncate ${selected ? "font-semibold" : ""}`}>{option}</span>
                                                                            {selected && <CheckIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />}
                                                                        </>
                                                                    )}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                            {employeeErrors.role && <p id="employee-role-error" className="mt-1 text-xs text-red-500">{employeeErrors.role}</p>}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-700">Email Address</label>
                                            <input
                                                type="email"
                                                value={employeeForm.email}
                                                onChange={e => setEmployeeForm(f => ({ ...f, email: e.target.value }))}
                                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeErrors.email ? "border-red-400" : "border-gray-300"}`}
                                                placeholder="employee@printease.com"
                                            />
                                            {employeeErrors.email && <p className="mt-1 text-xs text-red-500">{employeeErrors.email}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-700">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={employeeForm.phone}
                                                onChange={e => setEmployeeForm(f => ({ ...f, phone: e.target.value }))}
                                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeErrors.phone ? "border-red-400" : "border-gray-300"}`}
                                                placeholder="09XX XXX XXXX"
                                            />
                                            {employeeErrors.phone && <p className="mt-1 text-xs text-red-500">{employeeErrors.phone}</p>}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-700">Password</label>
                                            <input
                                                type="password"
                                                value={employeeForm.password}
                                                onChange={e => setEmployeeForm(f => ({ ...f, password: e.target.value }))}
                                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeErrors.password ? "border-red-400" : "border-gray-300"}`}
                                                placeholder={editEmployeeIndex !== null ? "Leave blank to keep current" : "At least 6 characters"}
                                            />
                                            {employeeErrors.password && <p className="mt-1 text-xs text-red-500">{employeeErrors.password}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-700">Confirm Password</label>
                                            <input
                                                type="password"
                                                value={employeeForm.confirmPassword}
                                                onChange={e => setEmployeeForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${employeeErrors.confirmPassword ? "border-red-400" : "border-gray-300"}`}
                                                placeholder="Repeat password"
                                            />
                                            {employeeErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{employeeErrors.confirmPassword}</p>}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleCancelEmployee}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                                        >
                                            <XMarkIcon className="h-4 w-4" /> Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSavingEmployee}
                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <CheckIcon className="h-4 w-4" /> {isSavingEmployee ? "Saving..." : editEmployeeIndex !== null ? "Save Changes" : "Add Employee"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {employeeCropperSrc && (
                        <CropperModal
                            src={employeeCropperSrc}
                            aspect={1}
                            theme="light"
                            onCancel={() => {
                                revokeBlobUrl(employeeCropperSrc);
                                setEmployeeCropperSrc(null);
                            }}
                            onApply={(file) => {
                                const previewUrl = URL.createObjectURL(file);
                                setEmployeeAvatarPreview(prev => {
                                    revokeBlobUrl(prev);
                                    return previewUrl;
                                });
                                setEmployeeAvatarFile(file);
                                setEmployeeAvatarExisting(null);
                                setEmployeeAvatarRemoved(false);
                                revokeBlobUrl(employeeCropperSrc);
                                setEmployeeCropperSrc(null);
                            }}
                        />
                    )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Inventory;