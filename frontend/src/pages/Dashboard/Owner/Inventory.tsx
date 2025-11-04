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
    ExclamationTriangleIcon,
    CheckCircleIcon,
    EyeIcon, // Icon for viewing individual damage log
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
    // New fields
    description?: string;
    expirationDate?: string;
    isExpired?: boolean;
    isActive?: boolean;
    damageReports?: Array<{
        quantity: number;
        reason: string;
        reportedBy: string;
        reportedAt: string;
    }>;
    totalDamaged?: number;
    // NEW: per-size stock
    sizes?: Array<{ name: string; quantity: number }>;
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

// NEW INTERFACE FOR USAGE CHECK RESPONSE
interface ProductUsageCheck {
    canDelete: boolean;
    activeOrdersCount: number;
    activeOrders: Array<{ id: string; status: string; createdAt: string }>;
    usedInServices: boolean;
    servicesCount: number;
}

// NEW INTERFACE FOR DAMAGE LOG
interface DamageLogEntry {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    reason: string;
    reportedBy: string;
    reportedAt: string;
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
    const [form, setForm] = useState({
        product: "",
        category: "",
        quantity: "",
        minQuantity: "",
        unitPrice: "",
        entryPrice: "",
        description: "",
        expirationDate: "",
        // NEW
        sizes: [] as Array<{ name: string; quantity: string }>,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [product, setProduct] = useState("");
    const [editIndex, setEditIndex] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // New enhanced features state
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [damageForm, setDamageForm] = useState({ quantity: "", reason: "", reportedBy: "" });
    const [damageProductId, setDamageProductId] = useState<string | null>(null);
    const [showDamageReports, setShowDamageReports] = useState(false);
    const [damageReports, setDamageReports] = useState<Array<{
        quantity: number;
        reason: string;
        reportedBy: string;
        reportedAt: string;
    }>>([]);
    
    // State for deletion guardrail
    const [productUsageCheck, setProductUsageCheck] = useState<ProductUsageCheck | null>(null);
    const [showUsageCheckModal, setShowUsageCheckModal] = useState<boolean>(false);


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

    // Damage Reports Log state (to track individual report submissions)
    const [damageLog, setDamageLog] = useState<DamageLogEntry[]>([]);
    
    // NEW STATE: Holds the report object when 'View Reason' is clicked
    const [viewingDamageLog, setViewingDamageLog] = useState<DamageLogEntry | null>(null);


    const isMountedRef = useRef(true);

    // Function to retrieve the latest damage reports from products for the DamageLog
    const reloadDamageLog = useCallback(() => {
        // This is a simplified client-side log creation by scanning all products
        // In a real app, this data would ideally come from a dedicated API endpoint /damagelog/mine
        const logEntries: DamageLogEntry[] = [];
        products.forEach(p => {
            if (p.damageReports && p.damageReports.length > 0) {
                p.damageReports.forEach(report => {
                    logEntries.push({
                        id: `${p._id}-${report.reportedAt}`, // Simple unique ID
                        productId: p._id,
                        productName: p.name,
                        quantity: report.quantity,
                        reason: report.reason,
                        reportedBy: report.reportedBy,
                        reportedAt: report.reportedAt,
                    });
                });
            }
        });
        
        // Sort by reportedAt (newest first)
        logEntries.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        setDamageLog(logEntries);
    }, [products]);

    const reloadInventoryLists = useCallback(async () => {
        const [inventoryRes, deletedRes] = await Promise.all([
            api.get("/inventory/mine"),
            api.get("/inventory/deleted"),
        ]);

        if (!isMountedRef.current) return;

        let inventoryItems: InventoryItem[] = inventoryRes.data || [];
        const archivedInventory: DeletedInventoryItem[] = deletedRes.data || [];

        // Normalize amount from sizes if present
        inventoryItems = inventoryItems.map(p => {
            if (Array.isArray(p.sizes) && p.sizes.length) {
                const total = p.sizes.reduce((s, sz) => s + Number(sz.quantity || 0), 0);
                return { ...p, amount: total };
            }
            return p;
        });

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

    // Effect to reload damage log whenever products update
    useEffect(() => {
        reloadDamageLog();
    }, [products, reloadDamageLog]);
    
    // Graph data: show current stock levels by category or all products
    const stockAmountData = useMemo(() => {
        if (products.length === 0) {
            return [{ month: "No Data", amount: 0 }];
        }
        
        if (product && product !== "ALL") {
            // Show data for selected product only
            const selectedProduct = products.find(p => p.name === product);
            if (!selectedProduct) return [{ month: "No Data", amount: 0 }];
            
            return [
                { month: "Current", amount: selectedProduct.amount },
                { month: "Min Required", amount: selectedProduct.minAmount }
            ];
        } else {
            // Show data for all products grouped by category
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
                amount: data.amount
            }));
        }
    }, [products, product]);

    const stockPriceData = useMemo(() => {
        if (products.length === 0) {
            return [{ month: "No Data", prize: 0 }];
        }
        
        if (product && product !== "ALL") {
            // Show price data for selected product
            const selectedProduct = products.find(p => p.name === product);
            if (!selectedProduct) return [{ month: "No Data", prize: 0 }];
            
            return [
                { month: "Unit Price", prize: selectedProduct.price },
                { month: "Total Value", prize: selectedProduct.price * selectedProduct.amount }
            ];
        } else {
            // Show total value by category
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

    // Calculate profit and expenses
    const profitAndExpenses = useMemo(() => {
        const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.amount), 0);
        const totalEntryCost = products.reduce((sum, p) => sum + (p.entryPrice * p.amount), 0);
        const grossProfit = totalStockValue - totalEntryCost;
        const profitMargin = totalEntryCost > 0 ? (grossProfit / totalEntryCost) * 100 : 0;
        
        // Calculate estimated expenses (you can modify this logic based on your business needs)
        const estimatedExpenses = totalEntryCost * 0.1; // 10% of entry cost as estimated expenses
        
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
        setForm({
            product: "",
            category: "",
            quantity: "",
            minQuantity: "",
            unitPrice: "",
            entryPrice: "",
            description: "",
            expirationDate: "",
            sizes: [], // reset sizes
        });
        setErrors({});
        setEditIndex(null);
    };

    const validateFields = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.product.trim()) newErrors.product = "Product name is required.";
        if (!form.minQuantity.trim() || isNaN(Number(form.minQuantity))) newErrors.minQuantity = "Min. Quantity must be a number.";
        if (!form.unitPrice.trim() || isNaN(Number(form.unitPrice))) newErrors.unitPrice = "Unit Price must be a number.";
        if (!form.entryPrice.trim() || isNaN(Number(form.entryPrice))) newErrors.entryPrice = "Entry Price must be a number.";
        // Sizes validation
        if (form.sizes.length > 0) {
            form.sizes.forEach((s, idx) => {
                if (!s.name.trim()) newErrors[`sizes.${idx}.name`] = "Size name is required.";
                if (s.quantity.trim() === "" || isNaN(Number(s.quantity)) || Number(s.quantity) < 0) {
                    newErrors[`sizes.${idx}.quantity`] = "Quantity must be a non-negative number.";
                }
            });
        } else {
            // fall back to global quantity if no sizes entered
            if (!form.quantity.trim() || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) {
                newErrors.quantity = "Quantity must be a non-negative number.";
            }
        }
        return newErrors;
    };

    // removed unused generateProductId that was part of previous local-only ID creation

    const handleSave = async () => {
        const newErrors = validateFields();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        // Compute amount from sizes if provided
        const sizesPayload = form.sizes
            .filter(s => s.name.trim())
            .map(s => ({ name: s.name.trim(), quantity: Number(s.quantity || 0) }));
        const computedAmount = sizesPayload.length
            ? sizesPayload.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
            : Number(form.quantity || 0);

        try {
            setError(null);
            if (editIndex !== null) {
                const res = await api.put(`/inventory/${editIndex}`, {
                    name: form.product,
                    category: form.category || undefined,
                    amount: computedAmount,
                    minAmount: Number(form.minQuantity),
                    price: Number(form.unitPrice),
                    entryPrice: Number(form.entryPrice),
                    description: form.description || undefined,
                    expirationDate: form.expirationDate || undefined,
                    // NEW
                    sizes: sizesPayload.length ? sizesPayload : undefined,
                });
                const updated = res.data as InventoryItem;
                // Normalize amount after save
                const normalized = Array.isArray(updated.sizes) && updated.sizes.length
                    ? { ...updated, amount: updated.sizes.reduce((s, z) => s + Number(z.quantity || 0), 0) }
                    : updated;
                setProducts(prev => prev.map(p => p._id === editIndex ? normalized : p));
                setProduct(form.product);
            } else {
                const res = await api.post("/inventory", {
                    name: form.product,
                    category: form.category || undefined,
                    amount: computedAmount,
                    minAmount: Number(form.minQuantity),
                    price: Number(form.unitPrice),
                    entryPrice: Number(form.entryPrice),
                    description: form.description || undefined,
                    expirationDate: form.expirationDate || undefined,
                    // NEW
                    sizes: sizesPayload.length ? sizesPayload : undefined,
                });
                const created = res.data as InventoryItem;
                const normalized = Array.isArray(created.sizes) && created.sizes.length
                    ? { ...created, amount: created.sizes.reduce((s, z) => s + Number(z.quantity || 0), 0) }
                    : created;
                setProducts(prev => [normalized, ...prev]);
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
            // quantity becomes computed if sizes are present
            quantity: String(p.amount ?? 0),
            minQuantity: String(p.minAmount),
            unitPrice: String(p.price),
            entryPrice: String(p.entryPrice),
            description: p.description || "",
            expirationDate: p.expirationDate || "",
            sizes: Array.isArray(p.sizes) && p.sizes.length
                ? p.sizes.map(s => ({ name: s.name, quantity: String(s.quantity) }))
                : [], // empty => falls back to simple quantity
        });
        setEditIndex(id);
        setShowModal(true);
        setErrors({});
    };

    // NEW: Function to initiate product deletion check
    const initiateProductDeletion = async (productId: string) => {
        setDeleteProductId(productId);
        try {
            setError(null);
            const response = await api.get(`/inventory/${productId}/usage`);
            setProductUsageCheck(response.data);
            
            if (!response.data.canDelete) {
                // Product has active usage, show the check modal instead of the delete confirmation
                setShowUsageCheckModal(true);
                // Clear the deleteProductId state so the simple delete modal doesn't flash
                setDeleteProductId(null);
            } else {
                // Product has no active usage, allow the normal delete confirmation
                // The simple Confirm Delete Modal is already open via the state set at the beginning
            }
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to check product usage before deletion."));
            // Fallback to showing the simple delete confirmation if usage check fails
            setProductUsageCheck(null);
        }
    };

    // MODIFIED: Function to handle final product deletion
    const confirmDeleteProduct = async () => {
        if (!deleteProductId) return;
        const id = deleteProductId;
        setDeleteProductId(null);

        try {
            setError(null);
            // The usage check is now handled in initiateProductDeletion. We can safely delete here.
            await api.delete(`/inventory/${id}`);
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to delete product"));
        }
    };


    // MODIFIED: Report damage to inventory item
    const reportDamage = async () => {
        if (!damageProductId) return;
        
        try {
            setError(null);
            const res = await api.post(`/inventory/${damageProductId}/damage`, damageForm);
            
            // Find the product name for the log
            const product = products.find(p => p._id === damageProductId);
            
            // Log the report locally
            if (product) {
                const newReport: DamageLogEntry = {
                    id: crypto.randomUUID(),
                    productId: damageProductId,
                    productName: product.name,
                    quantity: Number(damageForm.quantity),
                    reason: damageForm.reason,
                    reportedBy: damageForm.reportedBy,
                    reportedAt: new Date().toISOString(),
                };
                setDamageLog(prev => [newReport, ...prev]);
            }

            setShowDamageModal(false);
            setDamageForm({ quantity: "", reason: "", reportedBy: "" });
            setDamageProductId(null);
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to report damage"));
        }
    };

    // Get damage reports for a product
    const getDamageReports = async (productId: string) => {
        try {
            const response = await api.get(`/inventory/${productId}/damage-reports`);
            setDamageReports(response.data.damageReports);
            setShowDamageReports(true);
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to get damage reports"));
        }
    };

    // Check for expired products
    const checkExpiredProducts = async () => {
        try {
            const response = await api.post('/inventory/check-expired');
            if (response.data.expiredCount > 0) {
                setError(`Found ${response.data.expiredCount} expired products. They have been marked as inactive.`);
            }
            await reloadInventoryLists();
        } catch (e: unknown) {
            setError(toErrorMessage(e, "Failed to check expired products"));
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

    // Improved filteredProducts: also search sizes by name
    const filteredProducts = useMemo(() => {
        const base = products.filter(p => {
            const search = searchTerm.toLowerCase();
            const inSizes = Array.isArray(p.sizes) && p.sizes.some(sz => sz.name.toLowerCase().includes(search));
            const qOK =
                p.name.toLowerCase().includes(search) ||
                (p.category && p.category.toLowerCase().includes(search)) ||
                (p._id && p._id.toLowerCase().includes(search)) ||
                inSizes;
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
        const fileName = `profit-expenses-ledger-${new Date().toISOString().split('T')[0]}.pdf`;
        
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
            pdf.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        } 
    };

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
                        <button className="bg-orange-400 text-white rounded-lg px-4 py-1 font-normal text-[0.95rem] flex items-center gap-1" onClick={checkExpiredProducts}>
                            <ArrowPathIcon className="w-5 h-5" /> Check Expired
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
                                    {/* NEW: sizes column */}
                                    <td>Sizes</td>
                                    <td className="text-right">Actions</td>
                                </tr>
                            </thead>
                            <tbody>
                                {!showDeletedProducts && filteredProducts.map((p) => (
                                    <tr key={p._id} className="text-[0.95rem] align-top">
                                        <td>{p._id.slice(-6).toUpperCase()}</td>
                                        <td>
                                            <div className="font-semibold">{p.name}</div>
                                            {p.category && (
                                                <div className="text-xs text-gray-600">{p.category} → {p.name}</div>
                                            )}
                                        </td>
                                        <td>{p.category || '-'}</td>
                                        <td>{p.amount}</td>
                                        <td>{p.minAmount}</td>
                                        <td>₱{p.price}</td>
                                        <td>₱{p.entryPrice}</td>
                                        {/* NEW: sizes render */}
                                        <td>
                                            {Array.isArray(p.sizes) && p.sizes.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {p.sizes.map((s, i) => (
                                                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-800 border border-gray-300">
                                                            {s.name} ({s.quantity} pcs)
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="flex gap-1 items-center justify-end py-1">
                                            <button
                                                className="p-2 rounded-lg hover:bg-blue-200 text-blue-700"
                                                title="Edit"
                                                onClick={() => handleEdit(p._id)}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-lg hover:bg-orange-200 text-orange-600"
                                                title="Report Damage"
                                                onClick={() => {
                                                    setDamageProductId(p._id);
                                                    setShowDamageModal(true);
                                                }}
                                            >
                                                <ArrowTrendingDownIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-lg hover:bg-purple-200 text-purple-600"
                                                title="View Damage Reports"
                                                onClick={() => getDamageReports(p._id)}
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-lg hover:bg-red-200 text-red-600"
                                                title="Delete"
                                                // MODIFIED: Use the new initiation function
                                                onClick={() => initiateProductDeletion(p._id)}
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

                    {/* Confirm Delete Product Modal (now only for simple deletion) */}
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
                                                <Dialog.Title className="text-lg font-semibold">Confirm Deletion</Dialog.Title>
                                                <button onClick={() => setDeleteProductId(null)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="p-4 space-y-3 text-sm">
                                                <p>Are you sure you want to delete the product{productToDeleteName ? ` "${productToDeleteName}"` : ""}? This product has no active usage and will be moved to deleted items.</p>
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
                                                        <TrashIcon className="w-4 h-4" /> Delete Permanently
                                                    </button>
                                                </div>
                                            </div>
                                        </DialogPanel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>
                    
                    {/* NEW: Product Usage Check Modal (Deletion Guardrail) */}
                    <Transition show={showUsageCheckModal} as={Fragment}>
                        <Dialog onClose={() => setShowUsageCheckModal(false)} className="relative z-50">
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
                                <div className="w-full max-w-lg">
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
                                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-red-600/30">
                                                <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                                                    <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                                                    Deletion Blocked: Active Usage Detected
                                                </Dialog.Title>
                                                <button onClick={() => setShowUsageCheckModal(false)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="p-4 space-y-4 text-sm">
                                                <p className="font-semibold text-red-300">
                                                    You cannot delete this product because it is currently linked to active operations.
                                                </p>
                                                {productUsageCheck && (
                                                    <div className="space-y-2">
                                                        {productUsageCheck.activeOrdersCount > 0 && (
                                                            <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10">
                                                                <p>• **{productUsageCheck.activeOrdersCount} Active Order(s)** are using this product.</p>
                                                                <p className="text-xs mt-1 text-gray-300">Please complete or cancel these orders before deleting the product.</p>
                                                            </div>
                                                        )}
                                                        {productUsageCheck.servicesCount > 0 && (
                                                            <div className="p-3 rounded-lg border border-orange-500/50 bg-orange-500/10">
                                                                <p>• **{productUsageCheck.servicesCount} Service(s)** are actively listing this product as an attribute.</p>
                                                                <p className="text-xs mt-1 text-gray-300">You must remove the product from all linked services first.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowUsageCheckModal(false)}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-sm inline-flex items-center gap-1"
                                                    >
                                                        <CheckIcon className="w-4 h-4" /> Understood
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
                                                            value={
                                                                // show computed total if sizes exist
                                                                form.sizes.length
                                                                    ? String(form.sizes.reduce((sum, s) => sum + (Number(s.quantity || 0)), 0))
                                                                    : form.quantity
                                                            }
                                                            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                                            className={`w-full rounded-lg bg-gray-800 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm ${errors.quantity ? 'border-red-500/60' : 'border-white/10'}`}
                                                            placeholder="0"
                                                            disabled={form.sizes.length > 0}
                                                        />
                                                        {errors.quantity && <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>}
                                                        {form.sizes.length > 0 && (
                                                            <p className="mt-1 text-[11px] text-gray-400">Total is computed from sizes.</p>
                                                        )}
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

                                                {/* NEW: Sizes editor */}
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-xs text-gray-300 mb-1">Sizes</label>
                                                        <button
                                                            type="button"
                                                            className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/10"
                                                            onClick={() => setForm(f => ({ ...f, sizes: [...f.sizes, { name: "", quantity: "" }] }))}
                                                        >
                                                            + Add size
                                                        </button>
                                                    </div>
                                                    {form.sizes.length === 0 ? (
                                                        <p className="text-xs text-gray-400">No sizes added. You can keep a single quantity or add sizes.</p>
                                                    ) : (
                                                        <div className="space-y-2 mt-2">
                                                            {form.sizes.map((s, idx) => (
                                                                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                                                    <div className="col-span-6">
                                                                        <label className="block text-[11px] text-gray-400">Size name</label>
                                                                        <input
                                                                            value={s.name}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                setForm(f => {
                                                                                    const next = [...f.sizes];
                                                                                    next[idx] = { ...next[idx], name: val };
                                                                                    return { ...f, sizes: next };
                                                                                });
                                                                            }}
                                                                            className={`w-full rounded-lg bg-gray-800 border px-3 py-2 text-sm ${errors[`sizes.${idx}.name`] ? 'border-red-500/60' : 'border-white/10'}`}
                                                                            placeholder="e.g., Small, Medium, Large"
                                                                        />
                                                                        {errors[`sizes.${idx}.name`] && <p className="mt-1 text-xs text-red-400">{errors[`sizes.${idx}.name`]}</p>}
                                                                    </div>
                                                                    <div className="col-span-4">
                                                                        <label className="block text-[11px] text-gray-400">Quantity</label>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={s.quantity}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                setForm(f => {
                                                                                    const next = [...f.sizes];
                                                                                    next[idx] = { ...next[idx], quantity: val };
                                                                                    return { ...f, sizes: next };
                                                                                });
                                                                            }}
                                                                            className={`w-full rounded-lg bg-gray-800 border px-3 py-2 text-sm ${errors[`sizes.${idx}.quantity`] ? 'border-red-500/60' : 'border-white/10'}`}
                                                                            placeholder="0"
                                                                        />
                                                                        {errors[`sizes.${idx}.quantity`] && <p className="mt-1 text-xs text-red-400">{errors[`sizes.${idx}.quantity`]}</p>}
                                                                    </div>
                                                                    <div className="col-span-2 flex justify-end">
                                                                        <button
                                                                            type="button"
                                                                            className="px-2 py-2 rounded-lg hover:bg-red-600/20 text-red-300"
                                                                            onClick={() => setForm(f => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }))}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="text-xs text-gray-400">
                                                                Total quantity: {form.sizes.reduce((sum, z) => sum + (Number(z.quantity || 0)), 0)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Description (optional)</label>
                                                    <textarea
                                                        rows={2}
                                                        value={form.description}
                                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                                        placeholder="Product description..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Expiration Date (optional)</label>
                                                    <input
                                                        type="date"
                                                        value={form.expirationDate}
                                                        onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                                                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                                    />
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

                    {/* Damage Reporting Modal */}
                    <Transition show={showDamageModal} as={Fragment}>
                        <Dialog onClose={() => setShowDamageModal(false)} className="relative z-50">
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
                                                <Dialog.Title className="text-lg font-semibold">Report Damage</Dialog.Title>
                                                <button onClick={() => setShowDamageModal(false)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <form
                                                onSubmit={(e) => { e.preventDefault(); reportDamage(); }}
                                                className="p-4 space-y-4"
                                            >
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Damaged Quantity</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={damageForm.quantity}
                                                        onChange={e => setDamageForm(f => ({ ...f, quantity: e.target.value }))}
                                                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                                        placeholder="Enter quantity"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Reason for Damage</label>
                                                    <textarea
                                                        rows={3}
                                                        value={damageForm.reason}
                                                        onChange={e => setDamageForm(f => ({ ...f, reason: e.target.value }))}
                                                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                                        placeholder="Describe the damage..."
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-300 mb-1">Reported By</label>
                                                    <input
                                                        type="text"
                                                        value={damageForm.reportedBy}
                                                        onChange={e => setDamageForm(f => ({ ...f, reportedBy: e.target.value }))}
                                                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                                                        placeholder="Your name"
                                                        required
                                                    />
                                                </div>
                                                <div className="pt-2 flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDamageModal(false)}
                                                        className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-1"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" /> Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 font-semibold text-sm inline-flex items-center gap-1"
                                                    >
                                                        <ArrowTrendingDownIcon className="w-4 h-4" /> Report Damage
                                                    </button>
                                                </div>
                                            </form>
                                        </DialogPanel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>

                    {/* Damage Reports Modal (for viewing a product's reports) */}
                    <Transition show={showDamageReports} as={Fragment}>
                        <Dialog onClose={() => setShowDamageReports(false)} className="relative z-50">
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
                                <div className="w-full max-w-2xl">
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
                                                <Dialog.Title className="text-lg font-semibold">Damage Reports</Dialog.Title>
                                                <button onClick={() => setShowDamageReports(false)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="p-4">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse">
                                                        <thead>
                                                            <tr className="font-bold text-sm border-b border-white/10">
                                                                <td className="py-2">Date</td>
                                                                <td className="py-2">Quantity</td>
                                                                <td className="py-2">Reason</td>
                                                                <td className="py-2">Reported By</td>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {damageReports.map((report, index) => (
                                                                <tr key={index} className="text-sm border-b border-white/5">
                                                                    <td className="py-2">{new Date(report.reportedAt).toLocaleDateString()}</td>
                                                                    <td className="py-2">{report.quantity}</td>
                                                                    <td className="py-2">{report.reason}</td>
                                                                    <td className="py-2">{report.reportedBy}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {damageReports.length === 0 && (
                                                        <div className="text-center py-8 text-gray-400">No damage reports found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </DialogPanel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>
                    
                    {/* NEW: View Damage Reason Modal (Custom Dialog) */}
                    <Transition show={!!viewingDamageLog} as={Fragment}>
                        <Dialog onClose={() => setViewingDamageLog(null)} className="relative z-50">
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
                                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-orange-600/30">
                                                <Dialog.Title className="text-lg font-semibold flex items-center gap-2 text-orange-200">
                                                    <ArrowTrendingDownIcon className="w-5 h-5" />
                                                    Damage Report Details
                                                </Dialog.Title>
                                                <button onClick={() => setViewingDamageLog(null)} className="p-2 hover:bg-white/10 rounded-lg" aria-label="Close">
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="p-4 space-y-4 text-sm">
                                                {viewingDamageLog && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-gray-400">Product</p>
                                                            <p className="font-semibold text-white">{viewingDamageLog.productName}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-gray-400">Quantity</p>
                                                                <p className="font-bold text-red-400">{viewingDamageLog.quantity}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-gray-400">Reported By</p>
                                                                <p className="font-semibold text-white">{viewingDamageLog.reportedBy}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-gray-400">Date Reported</p>
                                                            <p className="font-medium text-gray-300">{new Date(viewingDamageLog.reportedAt).toLocaleString()}</p>
                                                        </div>
                                                        <div className="space-y-1 p-3 border border-white/10 rounded-lg bg-gray-800/50">
                                                            <p className="text-xs text-gray-400">Reason</p>
                                                            <p className="text-gray-200 whitespace-pre-wrap">{viewingDamageLog.reason}</p>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingDamageLog(null)}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-sm inline-flex items-center gap-1"
                                                    >
                                                        <CheckIcon className="w-4 h-4" /> OK
                                                    </button>
                                                </div>
                                            </div>
                                        </DialogPanel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>


                    {/* Damage Reports Log Card (at the very bottom) */}
                    <div className="mt-6">
                        <h2 className="text-lg font-bold text-gray-200 mb-3">Damage Reports Log</h2>
                        <div className="bg-white/90 rounded-xl shadow-md p-3">
                            {damageLog.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    No damage reports have been submitted yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="font-bold text-[0.95rem] border-b-2 border-gray-400">
                                                <td className="py-2">Date</td>
                                                <td className="py-2">Product</td>
                                                <td className="py-2">Quantity</td>
                                                <td className="py-2">Reported By</td>
                                                <td className="text-right py-2">Details</td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {damageLog.slice(0, 10).map((log, index) => ( // Show top 10 recent reports
                                                <tr key={index} className="text-sm border-b border-gray-200 hover:bg-gray-100">
                                                    <td className="py-2">{new Date(log.reportedAt).toLocaleDateString()}</td>
                                                    <td className="py-2 font-semibold">{log.productName}</td>
                                                    <td className="py-2 text-red-600">-{log.quantity}</td>
                                                    <td className="py-2">{log.reportedBy}</td>
                                                    <td className="text-right py-2">
                                                        <button
                                                            className="px-3 py-1 rounded-lg hover:bg-blue-200 text-blue-700 text-xs flex items-center gap-1 ml-auto"
                                                            title="View Reason"
                                                            onClick={() => setViewingDamageLog(log)} // Opens the new modal
                                                        >
                                                            <EyeIcon className="w-4 h-4" /> View Reason
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {damageLog.length > 10 && (
                                                <tr>
                                                    <td colSpan={5} className="py-2 text-center text-xs text-gray-500">
                                                        Showing {damageLog.length} reports total.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Inventory;