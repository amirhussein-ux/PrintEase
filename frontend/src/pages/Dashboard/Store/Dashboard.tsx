import React, { useState, useRef, useEffect, useMemo } from "react"
import api from "../../../lib/api"
import "@fontsource/crimson-pro/400.css"
import "@fontsource/crimson-pro/700.css"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { 
  ExclamationTriangleIcon, 
  ChartBarIcon, 
  CubeIcon, 
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import logo from "/src/assets/PrintEase-Logo-Dark.png"
import autoTable from "jspdf-autotable"
import "@/assets/fonts/Roboto-Regular-normal"

// Types
interface BackendInventoryItem { 
  _id: string; 
  name: string; 
  category?: string;
  amount: number; 
  minAmount: number; 
  initialStock: number;    
  maxStock: number;        
  unit: string;           
  price: number; 
  currency: string; 
  createdAt: string; 
}

// Audit Trail Types
interface AuditLog {
  _id: string;
  action: string;
  resource: string;
  resourceId?: string;
  user: string;
  userRole: string;
  timestamp: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

// Constants
const YEARS = [2025, 2024, 2023, 2022, 2021, 2020]
const COLORS_LIGHT = ["#1e3a8a", "#60a5fa", "#d1d5db"]
const COLORS_DARK = ["#3b82f6", "#60a5fa", "#93c5fd"]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS: Record<string,string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June",
  Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December"
}

// Enhanced StatCard with dark mode support
const StatCard = ({ value, label, icon: Icon, trend }: { value: string; label: string; icon?: React.ComponentType<any>; trend?: number }) => {
  const trendColor = trend && trend > 0 ? "text-green-500" : trend && trend < 0 ? "text-red-500" : "text-gray-500 dark:text-gray-400"
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl dark:hover:shadow-gray-900/50 group">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trendColor}`}>
              <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
              <span className="ml-1">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 ">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>
    </div>
  )
}

type ServiceLite = { _id: string; name: string; active?: boolean }

// Modern Product Selector with dark mode
const ProductButtons = ({
  services,
  selected,
  set,
}: {
  services: ServiceLite[]
  selected: string
  set: (id: string) => void
}) => (
  <div className="flex flex-col gap-3 w-full lg:w-64">
    <div className="bg-blue-600 dark:bg-blue-700 rounded-2xl p-4 text-white">
      <h3 className="font-bold text-lg mb-2">Products</h3>
      <p className="text-blue-100 dark:text-blue-200 text-sm">Filter sales data by service</p>
    </div>
    
    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
      <button
        key="ALL"
        onClick={() => set("ALL")}
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-left border-2 ${
          selected === "ALL"
            ? "bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700 shadow-lg"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
        }`}
      >
        📊 All Services
      </button>
      {services.map((svc) => (
        <button
          key={svc._id}
          onClick={() => set(svc._id)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-left border-2 ${
            selected === svc._id
              ? "bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700 shadow-lg"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md"
          }`}
          title={svc.name}
        >
          <span className="truncate block">🛍️ {svc.name}</span>
        </button>
      ))}
    </div>
  </div>
)

// Modern Year Selector with dark mode
const YearSelector = ({ selected, set }: { selected: number; set: (y: number) => void }) => (
  <div className="bg-blue-600 dark:bg-blue-700 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 h-full flex flex-col">
    <div className="text-white mb-4">
      <ChartBarIcon className="w-8 h-8 mb-2" />
      <h3 className="text-lg font-bold">Year</h3>
      <p className="text-blue-100 dark:text-blue-200 text-sm">Select reporting period</p>
    </div>
    
    <div className="space-y-2 flex-1 overflow-y-auto">
      {YEARS.map(y => (
        <button
          key={y}
          onClick={() => set(y)}
          className={`w-full rounded-xl py-3 px-4 text-sm font-semibold ${
            selected === y
              ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-lg"
              : "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-400 dark:hover:bg-blue-500"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  </div>
)

// Enhanced Category Accordion with dark mode - NOW WITH BLINKING
const CategoryAccordion = ({
  category,
  items,
  open,
  onToggle,
}: {
  category: string;
  items: { name: string; amount: number; minAmount: number; expectedStock: number; unit: string}[];
  open: boolean;
  onToggle: () => void;
}) => {
  // Check if ANY item in this category has low stock
  const hasLowStockItem = items.some(item => {
    const hasThresholdBreach = typeof item.minAmount === 'number' && item.amount <= (item.minAmount ?? 0);
    const restock = hasThresholdBreach || (item.expectedStock > 0 && item.amount < item.expectedStock * 0.3);
    return restock;
  });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 border-2 overflow-hidden hover:shadow-xl dark:hover:shadow-gray-900/50 ${
      hasLowStockItem 
        ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse" 
        : "border-gray-100 dark:border-gray-700"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center px-6 py-4 font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        aria-expanded={open}
        aria-controls={`cat-${category}`}
      >
        <div className="flex items-center gap-3">
          <CubeIcon className={`w-5 h-5 ${hasLowStockItem ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
          <span className="text-lg">{category}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              hasLowStockItem 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}>
              {items.length} items
            </span>
            {hasLowStockItem && (
              <span className="text-red-600 dark:text-red-400 animate-pulse">⚠️</span>
            )}
          </div>
        </div>
        <span className={`text-2xl transition-transform duration-300 ${open ? 'rotate-180' : ''} ${hasLowStockItem ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
          ▼
        </span>
      </button>
      
      {open && (
        <div id={`cat-${category}`} className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {items.map(it => (
              <InventoryPie
                key={it.name}
                type={it.name}
                unit={it.unit || 'units'}
                items={[{ 
                  expectedStock: it.expectedStock, 
                  currentStock: it.amount, 
                  minAmount: it.minAmount,
                  unit: it.unit 
                }]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced InventoryPie with dark mode
const InventoryPie = ({ items, type, unit }: { items: { expectedStock: number; currentStock: number; minAmount?: number; unit?: string }[]; type: string; unit: string }) => {
  const displayUnit = items[0]?.unit || unit;
  const totalExpected = items.reduce((s, i) => s + Math.max(i.expectedStock, 0), 0)
  const totalCurrent = items.reduce((s, i) => s + Math.max(i.currentStock, 0), 0)
  const decreased = Math.max(totalExpected - totalCurrent, 0)
  const [colors, setColors] = useState(COLORS_LIGHT)
  
  useEffect(() => {
    // Check if dark mode is active
    const isDark = document.documentElement.classList.contains('dark')
    setColors(isDark ? COLORS_DARK : COLORS_LIGHT)
  }, [])
  
  const pieData = [
    { name: "Remaining", value: totalCurrent },
    { name: "Buffer", value: Math.max(totalExpected - totalCurrent - decreased, 0) },
    { name: "Used", value: decreased }
  ]
  
  const hasThresholdBreach = items.some(i => typeof i.minAmount === 'number' && i.currentStock <= (i.minAmount ?? 0))
  const restock = hasThresholdBreach || (totalExpected > 0 && totalCurrent < totalExpected * 0.3)
  const percentage = totalExpected > 0 ? Math.round((totalCurrent / totalExpected) * 100) : 0

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center border-2 hover:shadow-xl dark:hover:shadow-gray-900/50 ${
      restock 
        ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20" 
        : "border-gray-100 dark:border-gray-700"
    } ${restock ? 'animate-pulse' : ''}`}>
      <h3 className="text-sm font-bold uppercase mb-3 text-gray-700 dark:text-gray-300 tracking-wide">{type}</h3>
      
      <div className="relative w-full h-48 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={pieData} 
              dataKey="value" 
              cx="50%" 
              cy="50%" 
              innerRadius={40} 
              outerRadius={70} 
              labelLine={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Available</div>
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-white">{totalCurrent}</span> / {totalExpected} {displayUnit}
        </p>
        
        {restock && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>LOW STOCK</span>
          </div>
        )}
        
        {!restock && totalCurrent > 0 && (
          <div className="text-green-600 dark:text-green-400 text-sm font-medium bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
            ✓ In Stock
          </div>
        )}
      </div>
    </div>
  )
}

// Audit Trail Component - Business Events Focus with Dark Mode
const AuditTrailSection = ({ 
  logs, 
  loading 
}: { 
  logs: AuditLog[]; 
  loading: boolean; 
}) => {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      // Job/Order events
      "order_created": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "order_updated": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "order_completed": "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      "order_cancelled": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "order_status_changed": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      "job_started": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "job_completed": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      
      // Payment events
      "payment_received": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "payment_refunded": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "payment_failed": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "invoice_issued": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      
      // Inventory events
      "inventory_created": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "inventory_updated": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      "inventory_low": "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      "inventory_restocked": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "inventory_archived": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "inventory_restored": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "material_used": "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      
      // User events
      "user_login": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "user_logout": "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      "user_created": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "user_updated": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      "user_deleted": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "role_changed": "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      "login": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      
      // Service events
      "service_created": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "service_updated": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "service_archived": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "service_restored": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      
      // Employee events
      "employee_created": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      "employee_updated": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "employee_archived": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
      "employee_restored": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      
      // System events
      "system_backup": "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      "report_generated": "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      "settings_updated": "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    };
    return colors[action.toLowerCase()] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      // Job/Order
      "order_created": "🆕",
      "order_updated": "✏️",
      "order_completed": "✅",
      "order_cancelled": "❌",
      "order_status_changed": "🔄",
      "job_started": "⚙️",
      "job_completed": "🏁",
      
      // Payment
      "payment_received": "💰",
      "payment_refunded": "💸",
      "payment_failed": "❌",
      "invoice_issued": "🧾",
      
      // Inventory
      "inventory_created": "📦",
      "inventory_updated": "✏️",
      "inventory_low": "⚠️",
      "inventory_restocked": "📈",
      "inventory_archived": "🗑️",
      "inventory_restored": "🔄",
      "material_used": "📉",
      
      // User
      "user_login": "🔐",
      "login": "🔐",
      "user_logout": "👋",
      "user_created": "👤",
      "user_updated": "✏️",
      "user_deleted": "🗑️",
      "role_changed": "🎭",
      
      // Service
      "service_created": "📋",
      "service_updated": "✏️",
      "service_archived": "🗑️",
      "service_restored": "🔄",
      
      // Employee
      "employee_created": "👨‍💼",
      "employee_updated": "✏️",
      "employee_archived": "🗑️",
      "employee_restored": "🔄",
      
      // System
      "system_backup": "💾",
      "report_generated": "📊",
      "settings_updated": "⚙️",
    };
    return icons[action.toLowerCase()] || "📋";
  };

  const getResourceIcon = (resource: string) => {
    const icons: Record<string, string> = {
      "Order": "📦",
      "Job": "🛠️",
      "Payment": "💰",
      "Invoice": "🧾",
      "Inventory": "📊",
      "Material": "🧱",
      "User": "👤",
      "Employee": "👨‍💼",
      "Customer": "👥",
      "Service": "🛍️",
      "System": "🖥️",
      "Report": "📈",
      "auth": "🔐",
    };
    return icons[resource] || "📋";
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800 font-bold",
      employee: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-medium",
      customer: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800",
      guest: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700",
      manager: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800",
      admin: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-bold",
    };
    return colors[role.toLowerCase()] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  };

  // Format the business-friendly message
  const formatBusinessMessage = (log: AuditLog) => {
    const details = log.details || {};
    const resourceName = details.name || details.email || details.orderId || log.resourceId || '';
    
    switch (log.action.toLowerCase()) {
      // Handle old "login" action
      case 'login':
        return `User logged in: ${details.email || log.user}`;
      
      // Order/Job events
      case 'order_created':
        return `New order created${resourceName ? `: ${resourceName.slice(-6)}` : ''}`;
      case 'order_completed':
        return `Order completed${resourceName ? `: ${resourceName.slice(-6)}` : ''}`;
      case 'order_cancelled':
        return `Order cancelled${resourceName ? `: ${resourceName.slice(-6)}` : ''}`;
      case 'order_status_changed':
        return `Order status changed to "${details.status}"`;
      case 'job_started':
        return `Print job started${resourceName ? `: ${resourceName.slice(-6)}` : ''}`;
      case 'job_completed':
        return `Print job completed${resourceName ? `: ${resourceName.slice(-6)}` : ''}`;
      
      // Payment events
      case 'payment_received':
        return `Payment received${details.amount ? `: ₱${details.amount}` : ''}`;
      case 'payment_refunded':
        return `Payment refunded${details.amount ? `: ₱${details.amount}` : ''}`;
      case 'invoice_issued':
        return `Invoice issued${details.invoiceNumber ? `: #${details.invoiceNumber}` : ''}`;
      
      // Inventory events
      case 'inventory_created':
        return `Inventory created: ${details.itemName || log.resource}`;
      case 'inventory_updated':
        return `Inventory updated: ${details.itemName || log.resource}`;
      case 'inventory_low':
        return `Low stock alert: ${details.itemName || log.resource}`;
      case 'inventory_restocked':
        return `Inventory restocked: ${details.itemName || log.resource}`;
      case 'inventory_archived':
        return `Inventory archived: ${details.itemName || log.resource}`;
      case 'inventory_restored':
        return `Inventory restored: ${details.itemName || log.resource}`;
      
      // User events
      case 'user_login':
        return `User logged in: ${details.email || log.user}`;
      case 'user_created':
        return `New user account created: ${details.email || log.user}`;
      case 'user_updated':
        return `User profile updated: ${details.email || log.user}`;
      case 'role_changed':
        return `User role changed to "${details.newRole}"`;
      
      // Service events
      case 'service_created':
        return `Service created: ${details.serviceName || log.resource}`;
      case 'service_updated':
        return `Service updated: ${details.serviceName || log.resource}`;
      case 'service_archived':
        return `Service archived: ${details.serviceName || log.resource}`;
      case 'service_restored':
        return `Service restored: ${details.serviceName || log.resource}`;
      
      // Employee events
      case 'employee_created':
        return `Employee created: ${details.employeeName || log.resource}`;
      case 'employee_updated':
        return `Employee updated: ${details.employeeName || log.resource}`;
      case 'employee_archived':
        return `Employee archived: ${details.employeeName || log.resource}`;
      case 'employee_restored':
        return `Employee restored: ${details.employeeName || log.resource}`;
      
      // Default
      default:
        return `${log.action} - ${log.resource}`;
    }
  };

  // Parse JSON strings in details
  const parseDetails = (details: any) => {
    if (!details) return {};
    
    try {
      // If details itself is a string, parse it
      if (typeof details === 'string') {
        return JSON.parse(details);
      }
      
      // Check for stringified fields within details
      const parsed = { ...details };
      
      if (typeof parsed.response === 'string') {
        try {
          parsed.response = JSON.parse(parsed.response);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      if (typeof parsed.requestBody === 'string') {
        try {
          parsed.requestBody = JSON.parse(parsed.requestBody);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      return parsed;
    } catch (e) {
      console.error('Error parsing audit details:', e);
      return details;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 border border-gray-100 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter to show only business-relevant logs
  const businessLogs = logs.filter(log => {
    const action = log.action.toLowerCase();
    return !action.includes('get') && !action.includes('list'); // Filter out read-only operations
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Audit Trail - Business Events</h3>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Key operations: job status, payments, inventory, user actions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            {businessLogs.length} events
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {businessLogs.length === 0 ? (
          <div className="text-center py-8">
            <DocumentChartBarIcon className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No business events recorded</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Perform business operations to see audit events</p>
          </div>
        ) : (
          businessLogs.map((log) => {
            const parsedDetails = parseDetails(log.details);
            const businessMessage = formatBusinessMessage({ ...log, details: parsedDetails });
            
            return (
              <div
                key={log._id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-sm dark:hover:shadow-gray-900/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-xl mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(log.userRole)}`}>
                          {log.userRole.charAt(0).toUpperCase() + log.userRole.slice(1)}
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {businessMessage}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-2">
                        <span className="flex items-center gap-1">
                          {getResourceIcon(log.resource)}
                          {log.resource}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{log.user}</span>
                        <span>•</span>
                        <span className="text-gray-500 dark:text-gray-500">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <button
                      onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      {expandedLog === log._id ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {expandedLog === log._id && Object.keys(parsedDetails).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Show business-relevant details */}
                      {parsedDetails.status && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>
                          <span className="ml-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            {parsedDetails.status}
                          </span>
                        </div>
                      )}
                      
                      {parsedDetails.amount && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Amount:</span>
                          <span className="ml-2 font-medium">
                            ₱{parseFloat(parsedDetails.amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {parsedDetails.email && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span>
                          <span className="ml-2">{parsedDetails.email}</span>
                        </div>
                      )}
                      
                      {parsedDetails.itemName && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Item:</span>
                          <span className="ml-2">{parsedDetails.itemName}</span>
                        </div>
                      )}
                      
                      {parsedDetails.serviceName && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Service:</span>
                          <span className="ml-2">{parsedDetails.serviceName}</span>
                        </div>
                      )}
                      
                      {parsedDetails.employeeName && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Employee:</span>
                          <span className="ml-2">{parsedDetails.employeeName}</span>
                        </div>
                      )}
                      
                      {/* Show IP if available */}
                      {log.ipAddress && (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">IP Address:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">{log.ipAddress}</span>
                        </div>
                      )}
                      
                      {/* Show timestamp details */}
                      <div className="text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Full Date:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Main dashboard with modern UI and proper dark mode
const OwnerDashboardContent: React.FC = () => {
  const [year, setYear] = useState(2025)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const peso = (n: number) => "₱" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [salesDay, setSalesDay] = useState(0)
  const [salesMonth, setSalesMonth] = useState(0)
  const [salesYear, setSalesYear] = useState(0)
  const [openIndex, setOpenIndex] = useState<number>(-1)
  const [loading, setLoading] = useState(true)
  const [inventoryCategories, setInventoryCategories] = useState<Array<{ category: string; items: { name: string; amount: number; minAmount: number; expectedStock: number; unit: string }[] }>>([])
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [contentReady, setContentReady] = useState(false)
  const [orders, setOrders] = useState<Array<{
    _id: string
    status?: string
    paymentStatus?: string
    createdAt?: string
    items?: Array<{ service?: string; serviceName?: string; totalPrice?: number }>
    subtotal?: number
  }>>([])
  const [services, setServices] = useState<ServiceLite[]>([])
  
  // Read-only state to detect if dark mode is active (for Charts JS logic)
  // We do not set the class here anymore, we just read it.
  const [darkMode, setDarkMode] = useState(false)

  // Audit Trail State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Initialize and Listen for Dark Mode changes from Sidebar/Global
  useEffect(() => {
    // Initial check
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)

    // Create an observer to watch for class changes on the <html> element
    // This ensures Charts update color when Sidebar toggles the theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setDarkMode(document.documentElement.classList.contains('dark'))
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => observer.disconnect()
  }, [])

  // Compute monthly sales for the selected service/year based on backend orders
  const salesData = useMemo(() => {
    const sums = new Array(12).fill(0)
    for (const o of orders) {
      const paid = o.paymentStatus === "paid" || o.status === "completed"
      if (!paid) continue
      const dt = o.createdAt ? new Date(o.createdAt) : null
      if (!dt || dt.getFullYear() !== year) continue
      const monthIdx = dt.getMonth()
      const lineItems = Array.isArray(o.items) ? o.items : []
      let add = 0
      for (const it of lineItems) {
        if (selectedServiceId === 'ALL' || (it.service && String(it.service) === String(selectedServiceId))) {
          add += Number(it.totalPrice) || 0
        }
      }
      // If no line items (legacy orders), attribute only when viewing ALL
      if (add === 0 && lineItems.length === 0 && selectedServiceId === 'ALL') add = Number(o.subtotal) || 0
      sums[monthIdx] += add
    }
    return MONTHS.map((m, i) => ({ month: m, sales: Math.round(sums[i]) }))
  }, [orders, selectedServiceId, year])

  // Load sales totals and services
  useEffect(() => {
    let cancelled = false
    async function loadSales() {
      try {
        if (!cancelled) setLoading(true)
        const storeRes = await api.get('/print-store/mine')
        const sid: string | undefined = storeRes.data?._id
        if (!sid) return
        const ordRes = await api.get(`/orders/store/${sid}`)
        const ordersResp: Array<{ _id: string; subtotal?: number; createdAt?: string; status?: string; paymentStatus?: string; items?: Array<{ service?: string; serviceName?: string; totalPrice?: number }> }> = Array.isArray(ordRes.data) ? ordRes.data : []
        // fetch services for owner store
        const svcRes = await api.get('/services/mine')
        const svcList: ServiceLite[] = Array.isArray(svcRes.data)
          ? (svcRes.data as Array<{ _id: unknown; name: unknown; active?: unknown }>).map((s) => ({
              _id: String(s._id as string),
              name: String(s.name as string),
              active: Boolean(s.active),
            }))
          : []
        // fetch inventory items for owner store
        const invRes = await api.get('/inventory/mine')
        const invList: BackendInventoryItem[] = Array.isArray(invRes.data) ? invRes.data : []

        // group by category
        const grouped: Record<string, { name: string; amount: number; minAmount: number; expectedStock: number; unit: string }[]> = {}
        for (const it of invList) {
          const amt = Math.max(Number(it.amount) || 0, 0)
          const minAmt = Math.max(Number(it.minAmount) || 0, 0)
          const cat = (it.category && it.category.trim()) ? it.category.trim() : 'Uncategorized'
          if (!grouped[cat]) grouped[cat] = []

          // Use the largest of maxStock, initialStock, or calculated expected
          const expected = Math.max(
            it.maxStock || 0,
            it.initialStock || 0,
            (amt + minAmt * 3)
          )
          const unit = it.unit || 'units'

          grouped[cat].push({ name: it.name, amount: amt, minAmount: minAmt, expectedStock: expected, unit: unit})
        }
        const normalizedCategories = Object.keys(grouped)
          .sort((a,b)=>a.localeCompare(b))
          .map(cat => ({ category: cat, items: grouped[cat].sort((a,b)=>a.name.localeCompare(b.name)) }))

        const now = new Date()
        const startDay = new Date(now); startDay.setHours(0,0,0,0)
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startYear = new Date(now.getFullYear(), 0, 1)

        let d = 0, m = 0, y = 0
        for (const o of ordersResp) {
          const amt = Number(o.subtotal) || 0
          if (amt <= 0) continue
          const paid = o.paymentStatus === 'paid' || o.status === 'completed'
          if (!paid) continue
          const dt = o.createdAt ? new Date(o.createdAt) : null
          if (!dt) continue
          if (dt >= startYear) y += amt
          if (dt >= startMonth) m += amt
          if (dt >= startDay) d += amt
        }
        if (!cancelled) {
          setSalesDay(d)
          setSalesMonth(m)
          setSalesYear(y)
          setOrders(
            ordersResp.map((o) => ({
              _id: o._id,
              status: o.status,
              paymentStatus: o.paymentStatus,
              createdAt: o.createdAt,
              items: Array.isArray(o.items)
                ? o.items.map((it: { service?: unknown; serviceName?: string; totalPrice?: number }) => ({
                    service: it.service ? String(it.service) : undefined,
                    serviceName: it.serviceName,
                    totalPrice: it.totalPrice,
                  }))
                 : [],
              subtotal: o.subtotal,
            }))
          )
          setServices(svcList)
          setInventoryCategories(normalizedCategories)
          // ensure selected service remains valid
          if (selectedServiceId !== 'ALL' && !svcList.find((s) => s._id === selectedServiceId)) {
            setSelectedServiceId('ALL')
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadSales()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load Audit Trail - Using fetch instead of axios
  useEffect(() => {
    let cancelled = false;
    
    async function loadAuditLogs() {
      if (!showAuditTrail) return;
      
      try {
        setAuditLoading(true);
        console.log('🔄 Loading audit logs with fetch...');
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/audit-logs/mine', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Audit logs loaded:', data.logs?.length || 0, 'entries');
          
          const logs: AuditLog[] = Array.isArray(data.logs) ? data.logs : [];
          
          if (!cancelled) {
            setAuditLogs(logs);
          }
        } else {
          console.error('❌ Failed to load audit logs:', response.status);
          if (!cancelled) {
            setAuditLogs([]);
          }
        }
      } catch (error) {
        console.error('❌ Error loading audit logs:', error);
        if (!cancelled) {
          setAuditLogs([]);
        }
      } finally {
        if (!cancelled) {
          setAuditLoading(false);
        }
      }
    }

    loadAuditLogs();
    
    return () => {
      cancelled = true;
    };
  }, [showAuditTrail]);

  // Crossfade skeleton -> content when loading completes
  useEffect(() => {
    if (loading) {
      setContentReady(false)
      setShowSkeleton(true)
    } else {
      setContentReady(true)
      const t = setTimeout(() => setShowSkeleton(false), 250)
      return () => clearTimeout(t)
    }
  }, [loading])

  // Recompute yearly sales total based on selected year (day/month remain current only)
  useEffect(() => {
    // Sum paid orders within the selected year using subtotal
    let y = 0
    for (const o of orders) {
      const amt = Number(o.subtotal) || 0
      if (amt <= 0) continue
      const paid = o.paymentStatus === 'paid' || o.status === 'completed'
      if (!paid) continue
      const dt = o.createdAt ? new Date(o.createdAt) : null
      if (!dt) continue
      if (dt.getFullYear() === year) y += amt
    }
    setSalesYear(y)
  }, [orders, year])

  // FIXED PDF Download Function
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfW = pdf.internal.pageSize.getWidth()
      
      // Add logo
      const logoImg = new Image()
      logoImg.src = logo
      await new Promise(res => { 
        logoImg.onload = res; 
        logoImg.onerror = () => res(null) // Resolve even if logo fails
      })
      
      if (logoImg.complete && logoImg.naturalWidth !== 0) {
        pdf.addImage(logoImg, "PNG", 14, 10, pdfW/4, 20)
      }
      
      // Header
      pdf.setDrawColor(0).setLineWidth(0.5).line(10, 35, pdfW-10, 35)
      pdf.setFontSize(14)
        .text(`PrintEase Shop`, pdfW/2, 40, { align: "center" })
      
      const svcName = selectedServiceId === 'ALL' ? 'All Services' : (services.find((s) => s._id === selectedServiceId)?.name || 'Service')
      pdf.setFontSize(18)
        .text(`Annual Sales Report - ${svcName}`, pdfW/2, 50, { align: "center" })
      pdf.setFontSize(12)
        .text(`Year: ${year}`, pdfW/2, 58, { align: "center" })
      
      // Create a simple bar chart manually
      const maxSales = Math.max(...salesData.map(d => d.sales), 1) // Avoid division by zero
      const chartTop = 70
      const chartHeight = 60
      const barWidth = (pdfW - 40) / salesData.length
      
      // Draw bars and axes
      pdf.setDrawColor(200, 200, 200)
      pdf.line(20, chartTop, 20, chartTop + chartHeight) // Y-axis
      pdf.line(20, chartTop + chartHeight, pdfW - 20, chartTop + chartHeight) // X-axis
      
      // Draw bars
      salesData.forEach((data, index) => {
        const barHeight = (data.sales / maxSales) * chartHeight
        const x = 20 + (index * barWidth)
        const y = chartTop + chartHeight - barHeight
        
        pdf.setFillColor(30, 58, 138) // Blue color
        pdf.rect(x + 1, y, barWidth - 3, barHeight, 'F')
        
        // Month labels
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(data.month, x + (barWidth / 2) - 2, chartTop + chartHeight + 5)
        
        // Value labels on top of bars
        if (data.sales > 0) {
          pdf.setFontSize(7)
          pdf.setTextColor(30, 58, 138)
          pdf.text(peso(data.sales), x + (barWidth / 2) - 5, y - 2)
        }
      })
      
      // Sales data table
      const tableData = salesData.map(d => [FULL_MONTHS[d.month], peso(d.sales)])
      const total = salesData.reduce((sum, d) => sum + d.sales, 0)
      const avg = total / salesData.length
      
      tableData.push(
        ["", ""],
        ["Total", peso(total)],
        ["Average", peso(avg)],
        ["Highest", peso(Math.max(...salesData.map(d => d.sales)))],
        ["Lowest", peso(Math.min(...salesData.map(d => d.sales)))]
      )
      
      autoTable(pdf, {
        head: [["Month", "Sales"]],
        body: tableData,
        startY: chartTop + chartHeight + 20,
        theme: "grid",
        styles: { 
          halign: "center", 
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      })
      
      // Add footer
      const pageHeight = pdf.internal.pageSize.getHeight()
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdfW/2, pageHeight - 10, { align: "center" })
      
      pdf.save(`Annual_Sales_Report_${year}_${svcName.replace(/\s+/g, '_')}.pdf`)
      
    } catch (e) {
      console.error("PDF generation failed:", e)
      // Fallback: Create a simple PDF without complex elements
      const pdf = new jsPDF()
      pdf.text("Sales Report - Error generating full report", 20, 20)
      pdf.text(`Year: ${year}`, 20, 30)
      pdf.text(`Service: ${selectedServiceId === 'ALL' ? 'All Services' : services.find(s => s._id === selectedServiceId)?.name}`, 20, 40)
      pdf.save(`Sales_Report_${year}_simple.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen max-w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-gray-900 dark:text-gray-100">
      <div className="w-full space-y-8 px-0 sm:px-0 pt-0">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Welcome back! Here's your business performance summary.</p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg dark:shadow-gray-900/30 hover:shadow-xl dark:hover:shadow-gray-900/50 ${
                showAuditTrail 
                  ? "bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white" 
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              }`}
            >
              <DocumentChartBarIcon className="w-5 h-5" />
              {showAuditTrail ? "Hide Audit" : "Show Audit"}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg dark:shadow-gray-900/30 hover:shadow-xl dark:hover:shadow-gray-900/50"
            >
              <DocumentChartBarIcon className="w-5 h-5" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Overlay for skeleton and content */}
        <div className="relative">
          {/* Content block */}
          <div className={`space-y-8 transition-opacity duration-500 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                value={peso(salesDay)} 
                label="Today's Sales" 
                icon={ChartBarIcon}
                trend={5.2}
              />
              <StatCard 
                value={peso(salesMonth)} 
                label="This Month's Revenue" 
                icon={CubeIcon}
                trend={12.8}
              />
              <StatCard 
                value={peso(salesYear)} 
                label="Year to Date" 
                icon={DocumentChartBarIcon}
                trend={8.4}
              />
            </div>

            {/* Sales Analytics Section */}
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Sales Performance {selectedServiceId !== 'ALL' && `- ${services.find((s) => s._id === selectedServiceId)?.name || ''}`}
                      </h2>
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm px-3 py-1 rounded-full font-medium">
                        {year}
                      </span>
                    </div>
                    
                    <div className="cursor-pointer" onClick={() => setShowModal(true)}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#f0f0f0"} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} stroke={darkMode ? "#9ca3af" : "#374151"} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} stroke={darkMode ? "#9ca3af" : "#374151"} />
                          <Tooltip 
                            formatter={(v: number) => ["₱"+v,"Sales"]}
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                              backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                              color: darkMode ? '#f9fafb' : '#1f2937'
                            }}
                          />
                          <Bar 
                            dataKey="sales" 
                            fill={darkMode ? "#3b82f6" : "#1e3a8a"} 
                            radius={[8, 8, 0, 0]}
                            className="hover:opacity-80 transition-opacity"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <ProductButtons services={services} selected={selectedServiceId} set={setSelectedServiceId} />
                </div>
              </div>
              
              <div className="flex justify-center lg:justify-start">
                <YearSelector selected={year} set={setYear} />
              </div>
            </div>

            {/* Inventory Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Inventory Overview</h2>
                  <p className="text-gray-600 dark:text-gray-300">Monitor stock levels and restock alerts</p>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#1e3a8a] dark:bg-[#3b82f6] rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Remaining</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#60a5fa] rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Buffer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#d1d5db] dark:bg-[#93c5fd] rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Used</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {inventoryCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <CubeIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No inventory items yet.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add inventory items to start tracking stock levels.</p>
                  </div>
                ) : (
                  inventoryCategories.map((cat, idx) => (
                    <CategoryAccordion
                      key={cat.category}
                      category={cat.category}
                      items={cat.items}
                      open={openIndex === idx}
                      onToggle={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Skeleton overlay with dark mode */}
          {showSkeleton && (
            <div aria-busy="true" className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${contentReady ? 'opacity-0' : 'opacity-100'}`}>
              <div className="space-y-8">
                {/* Stats skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 animate-pulse">
                      <div className="flex justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-8 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
                          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sales skeleton */}
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 animate-pulse">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between">
                          <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
                          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="h-[300px] w-full bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                      <div className="w-full lg:w-64 space-y-4">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-64 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                </div>

                {/* Inventory skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 animate-pulse">
                  <div className="flex flex-col md:flex-row justify-between mb-6">
                    <div className="space-y-2">
                      <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="flex gap-6 mt-4 md:mt-0">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Trail Section */}
        {showAuditTrail && (
          <AuditTrailSection 
            logs={auditLogs} 
            loading={auditLoading} 
          />
        )}

        {/* Modal with dark mode */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 w-full max-w-4xl p-6 relative transition-colors duration-300">
              <button 
                className="absolute top-4 right-4 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                onClick={() => setShowModal(false)}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  ✕
                </div>
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PrintEase Analytics</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Annual Sales Performance Analysis Report ({year})</p>
              </div>
              
              <div ref={reportRef} className={`w-full h-[400px] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 transition-colors duration-300 ${
                downloading ? "pointer-events-none opacity-50" : ""
              }`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#f0f0f0"} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} stroke={darkMode ? "#9ca3af" : "#374151"} />
                    <YAxis axisLine={false} tickLine={false} stroke={darkMode ? "#9ca3af" : "#374151"} />
                    <Tooltip 
                      formatter={(v: number) => ["₱" + v, "Sales"]}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        color: darkMode ? '#f9fafb' : '#1f2937'
                      }}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill={darkMode ? "#3b82f6" : "#1e3a8a"} 
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-4">
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={downloading}
                  className={`px-8 py-3 rounded-xl font-semibold shadow-lg dark:shadow-gray-900/30 transition-all duration-200 flex items-center gap-2 ${
                    downloading 
                      ? "bg-gray-400 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed" 
                      : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl dark:hover:shadow-gray-900/50"
                  }`}
                >
                  <DocumentChartBarIcon className="w-5 h-5" />
                  {downloading ? "Preparing PDF..." : "Download as PDF"}
                </button>
                
                {downloading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Please wait, your professional report is being generated...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerDashboardContent