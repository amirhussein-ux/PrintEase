"use client"

import * as React from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { MdOutlineEdit, MdOutlineInventory2, MdOutlineDashboard, MdOutlineHomeRepairService } from "react-icons/md"
import { LuPackage } from "react-icons/lu"
import { GoGraph } from "react-icons/go"
import { IoIosArrowForward } from "react-icons/io"
import { AiOutlineProduct } from "react-icons/ai"
import { LuUsers } from "react-icons/lu"
import { IoMdAdd } from "react-icons/io"
import { GoTrash } from "react-icons/go"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { NavUser } from "@/components/nav-user"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { BsChatDots } from "react-icons/bs";
import { HiOutlineClock } from 'react-icons/hi';
import { FaSpinner, FaBoxOpen, FaCheckCircle } from 'react-icons/fa';
import { IoStorefrontOutline } from "react-icons/io5";
import { HiOutlineRefresh } from 'react-icons/hi';
import { FiSave } from "react-icons/fi";
import { cn } from "@/lib/utils"

const CUSTOMER_STORE_EVENT = 'customer-store-updated'

const toLetterCase = (value?: string) => {
  if (!value) return ""
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ")
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  isDarkMode?: boolean
  onToggleTheme?: () => void
}

function AppSidebarContent({ isDarkMode = false, onToggleTheme, ...props }: AppSidebarProps) {
  const { state, setOpen } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  
  type StoreInfo = {
    _id?: string
    name?: string
    mobile?: string
    address?:
      | string
      | {
          addressLine?: string
          city?: string
          state?: string
          country?: string
          postal?: string
          location?: { lat?: number; lng?: number }
        }
    logoFileId?: string
  }

  // State management
  const [shopOpen, setShopOpen] = React.useState<boolean>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('sidebarShopOpen') : null
      if (raw !== null) return raw === 'true'
    } catch { /* ignore */ }
    return false
  })

  const [inventoryOpen, setInventoryOpen] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.location.pathname.includes("/dashboard/inventory") : true
  )
  const [servicesOpen, setServicesOpen] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.location.pathname.includes("/dashboard/services") : false
  )
  const [ordersOpen, setOrdersOpen] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.location.pathname.includes("/dashboard/orders") : false
  )
  const [customerOrdersOpen, setCustomerOrdersOpen] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.location.pathname.includes('/dashboard/my-orders') : false
  )

  const { user } = useAuth()
  const [store, setStore] = React.useState<StoreInfo | null>(() => {
    try {
      if (typeof window === 'undefined') return null
      const rawCustomer = window.localStorage.getItem('customerStore')
      if (rawCustomer) return JSON.parse(rawCustomer) as StoreInfo
      const rawOwner = window.localStorage.getItem('myStore')
      return rawOwner ? (JSON.parse(rawOwner) as StoreInfo) : null
    } catch { return null }
  })

  // Role checks
  const isCustomer = user?.role === 'customer'
  const isOwner = user?.role === 'owner';
  const isOperationsManager = user?.employeeRole === 'Operations Manager';
  const isPrinterOperator = user?.employeeRole === 'Printer Operator';
  const isInventoryAndSupplies = user?.employeeRole === 'Inventory and Supplies';
  const isFrontDesk = user?.employeeRole === 'Front Desk';
  const canEditShop = isOwner || isOperationsManager;

  // Store sync
  const syncStoreFromStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('customerStore')
      setStore(raw ? (JSON.parse(raw) as StoreInfo) : null)
    } catch {
      setStore(null)
    }
  }, [setStore])

  // Effects
  React.useEffect(() => {
    if (location.pathname.includes("/dashboard/inventory")) setInventoryOpen(true)
    if (location.pathname.includes("/dashboard/services")) setServicesOpen(true)
    if (location.pathname.includes("/dashboard/orders")) setOrdersOpen(true)
    if (location.pathname.includes('/dashboard/my-orders')) setCustomerOrdersOpen(true)
  }, [location.pathname])

  React.useEffect(() => {
    let cancelled = false
    async function loadContext() {
      if (!user) return
      if (isCustomer) {
        if (store) return
        try {
          const selId = typeof window !== 'undefined' ? window.localStorage.getItem('customerStoreId') : null
          if (!selId) return
          const res = await api.get('/print-store/list')
          if (cancelled) return
          const list: StoreInfo[] = Array.isArray(res.data) ? res.data : []
          const found = list.find(s => s._id === selId)
          if (found) {
            setStore(found)
            try { window.localStorage.setItem('customerStore', JSON.stringify(found)) } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      } else {
        try {
          const res = await api.get('/print-store/mine')
          if (cancelled) return
          if (res && res.data) {
            setStore(res.data)
            try { window.localStorage.setItem('myStore', JSON.stringify(res.data)) } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
    }
    loadContext()
    return () => { cancelled = true }
  }, [user, isCustomer, store])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const handleCustomEvent = () => syncStoreFromStorage()
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'customerStore' || event.key === 'customerStoreId') {
        syncStoreFromStorage()
      }
    }
    window.addEventListener(CUSTOMER_STORE_EVENT, handleCustomEvent as EventListener)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(CUSTOMER_STORE_EVENT, handleCustomEvent as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [syncStoreFromStorage])

  // Event handlers
  const handleHeaderClick = () => {
    if (state === 'collapsed') {
      setOpen(true)
    } else if (canEditShop || isCustomer) {
      setShopOpen((v) => {
        const next = !v
        try { window.localStorage.setItem('sidebarShopOpen', String(next)) } catch { void 0 }
        return next
      })
    }
  }

  // Navigation data
  const storeLinks = [
    { title: "Dashboard", to: "/dashboard/owner", icon: MdOutlineDashboard },
    { title: "Order Management", to: "/dashboard/orders", icon: LuPackage },
    { title: "Service Management", to: "/dashboard/services", icon: MdOutlineHomeRepairService },
    { title: "Inventory", to: "/dashboard/inventory", icon: MdOutlineInventory2, children: [
      { title: "Analytics", to: "/dashboard/inventory/analytics" },
      { title: "Products", to: "/dashboard/inventory/products" },
      { title: "Employees", to: "/dashboard/inventory/employees" },
    ] },
    { title: "Chat", to: "/dashboard/chat-store", icon: BsChatDots },
  ]

  const visibleStoreLinks = storeLinks.filter(link => {
    if (isOwner || isOperationsManager) return true;
    if (link.title === 'Inventory') return !isPrinterOperator && !isFrontDesk;
    if (link.title === 'Service Management') return !isPrinterOperator && !isFrontDesk && !isInventoryAndSupplies;
    return true;
  });

  const navUser = {
    name: user ? (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User') : 'Guest',
    email: user?.email || '',
    role: user ? (user.employeeRole || user.role || '') : '',
    avatar: user?.avatarUrl || '',
  }

  // Status icons - Now properly defined for both store and customer views
  const statusIcon = {
    notStarted: <HiOutlineClock className="size-4" title="Not started" />,
    inProgress: <FaSpinner className="size-4 animate-spin" title="In progress" />,
    readyForPickup: <FaBoxOpen className="size-4" title="Ready for pick-up" />,
    completed: <FaCheckCircle className="size-4" title="Completed" />,
    returnRefund: <HiOutlineRefresh className="size-4" title="Return / Refund" />,
    // Customer specific status icons
    pending: <HiOutlineClock className="size-4" title="Pending" />,
    processing: <FaSpinner className="size-4 animate-spin" title="Processing" />,
    ready: <FaBoxOpen className="size-4" title="Ready for pick-up" />,
    return_refund: <HiOutlineRefresh className="size-4" title="Return / Refund" />,
  }

  // Theme configuration
  const theme = {
    sidebarBg: isDarkMode ? "bg-gray-900" : "bg-white",
    sidebarBorder: isDarkMode ? "border-gray-800" : "border-gray-200",
    sidebarText: isDarkMode ? "text-gray-100" : "text-gray-900",
    sidebarMuted: isDarkMode ? "text-gray-400" : "text-gray-500",
    
    // Cards and surfaces
    cardBg: isDarkMode ? "bg-gray-800/50" : "bg-gray-50",
    cardBorder: isDarkMode ? "border-gray-700" : "border-gray-200",
    
    // Interactive states
    hoverBg: isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100",
    activeBg: isDarkMode ? "bg-white/10" : "bg-gray-200",
    activeText: isDarkMode ? "text-white" : "text-gray-900",
    
    // Navigation specific
    navIcon: isDarkMode ? "text-gray-300" : "text-gray-600",
    navActiveIcon: isDarkMode ? "text-white" : "text-gray-900",
    navSubBg: isDarkMode ? "bg-gray-800/30" : "bg-gray-50/80",
    
    // Accent colors
    accentBorder: isDarkMode ? "border-blue-500/30" : "border-blue-200",
    accentGlow: isDarkMode ? "shadow-lg shadow-blue-500/10" : "shadow-md shadow-blue-100",
  }

  // Style classes - UPDATED FOR BETTER CENTERING
  const getNavItemClass = (isActive: boolean) => cn(
    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
    "hover:translate-x-0.5 hover:shadow-sm",
    theme.hoverBg,
    isActive ? cn(
      theme.activeBg,
      theme.activeText,
      "font-semibold",
      "border-l-2 border-blue-500",
      "shadow-inner"
    ) : theme.sidebarText,
    "group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
  )

  const getSubNavItemClass = (isActive: boolean) => cn(
    "flex items-center gap-2.5 px-4 py-2 rounded-md text-sm transition-all",
    "hover:pl-5 hover:shadow-sm",
    theme.hoverBg,
    isActive ? cn(
      theme.activeBg,
      theme.activeText,
      "font-medium",
      "border-l-2 border-blue-400"
    ) : theme.sidebarMuted,
    "ml-1"
  )

  const getCollapsibleHeaderClass = (isOpen: boolean, isActive: boolean) => cn(
    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all",
    "hover:translate-x-0.5 hover:shadow-sm",
    theme.hoverBg,
    isActive && cn(
      theme.activeBg,
      theme.activeText,
      "font-semibold"
    ),
    isOpen && "mb-1",
    "group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
  )

  const getIconClass = (isActive: boolean) => cn(
    "flex-shrink-0 size-5 transition-colors",
    isActive ? theme.navActiveIcon : theme.navIcon,
    "group-data-[state=collapsed]:mx-auto" // Center the icon when collapsed
  )

  const getStatusButtonClass = (active: boolean) => cn(
    "flex items-center gap-2.5 px-4 py-2 rounded-md text-sm transition-all",
    "hover:pl-5",
    theme.hoverBg,
    active ? cn(
      theme.activeBg,
      theme.activeText,
      "font-medium",
      "border-l-2 border-blue-400"
    ) : theme.sidebarMuted,
    "ml-1"
  )

  const getShopHeaderClass = () => cn(
    "group flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all cursor-pointer",
    theme.cardBg,
    theme.cardBorder,
    "border",
    theme.accentGlow,
    "hover:shadow-lg hover:-translate-y-0.5",
    (canEditShop || isCustomer) && "hover:bg-gray-800/20 dark:hover:bg-gray-700/50",
    "group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2"
  )

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending':
        return statusIcon.pending || statusIcon.notStarted;
      case 'processing':
        return statusIcon.processing || statusIcon.inProgress;
      case 'ready':
        return statusIcon.ready || statusIcon.readyForPickup;
      case 'completed':
        return statusIcon.completed;
      case 'return_refund':
        return statusIcon.return_refund || statusIcon.returnRefund;
      default:
        return statusIcon.notStarted;
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "select-none transition-all duration-300",
        theme.sidebarBg,
        "border-r",
        theme.sidebarBorder,
        "shadow-xl"
      )}
      {...props}
    >
      <SidebarHeader className="px-3 py-4 group-data-[state=collapsed]:px-2">
        <div
          className={getShopHeaderClass()}
          onClick={handleHeaderClick}
        >
          <div className="relative">
            <Avatar className={cn(
              "size-10 ring-2 ring-gray-300/50 dark:ring-gray-700/50",
              "group-data-[state=collapsed]:size-9" // Smaller in collapsed state
            )}>
              {store?.logoFileId ? (
                <AvatarImage
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/print-store/logo/${store.logoFileId}`}
                  alt={store?.name || user?.store || user?.fullName || 'Shop'}
                  className="object-cover"
                />
              ) : user?.avatarUrl ? (
                <AvatarImage 
                  src={user.avatarUrl} 
                  alt={user.fullName || user?.email || 'Shop'} 
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {(user?.firstName || 'S').charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className={cn(
              "absolute -bottom-1 -right-1 size-3 rounded-full border-2",
              isCustomer ? "bg-green-500 border-gray-900" : "bg-blue-500 border-gray-900",
              "group-data-[state=collapsed]:hidden"
            )} />
          </div>

          <div className="flex-1 min-w-0 space-y-0.5 group-data-[state=collapsed]:hidden">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold truncate">
                {store?.name || user?.store || (isCustomer ? 'Selected Store' : 'My Store')}
              </div>
              {(canEditShop || isCustomer) && (
                <IoIosArrowForward className={cn(
                  "size-3.5 transition-transform duration-200",
                  theme.sidebarMuted,
                  shopOpen && "rotate-90"
                )} />
              )}
            </div>
            <div className={cn(
              "text-xs truncate leading-tight",
              theme.sidebarMuted,
              "line-clamp-2"
            )}>
              {(() => {
                const fallback = toLetterCase(user?.address?.trim()) || 'No address set'
                const a = store?.address
                if (!a) return fallback
                if (typeof a === 'string') return toLetterCase(a.trim()) || fallback
                const city = a.city || ''
                const state = a.state || ''
                const line = a.addressLine || ''
                const parts = [] as string[]
                if (city) parts.push(city)
                if (state) parts.push(state)
                if (parts.length) {
                  return toLetterCase(parts.join(', ').trim()) || fallback
                }
                if (line) return toLetterCase(line.trim()) || fallback
                return fallback
              })()}
            </div>
          </div>
        </div>

        {/* Shop Actions */}
        {shopOpen && (canEditShop || isCustomer) && (
          <div className="mt-3 space-y-1.5 px-1 group-data-[state=collapsed]:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {canEditShop && (
              <NavLink
                to="/owner/create-shop"
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                  "hover:translate-x-0.5 hover:shadow-sm",
                  theme.hoverBg,
                  isActive && cn(theme.activeBg, theme.activeText, "font-medium")
                )}
              >
                <MdOutlineEdit className="size-4" />
                <span>Edit Shop</span>
              </NavLink>
            )}
            {isCustomer && (
              <NavLink
                to="/customer/select-shop"
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                  "hover:translate-x-0.5 hover:shadow-sm",
                  theme.hoverBg,
                  isActive && cn(theme.activeBg, theme.activeText, "font-medium")
                )}
              >
                <IoStorefrontOutline className="size-4" />
                <span>Change Store</span>
              </NavLink>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2.5 py-3 group-data-[state=collapsed]:px-1">
        <nav className="space-y-1">
          {!isCustomer ? (
            visibleStoreLinks.map((link) => {
              const Icon = link.icon
              
              // Inventory Section
              if (link.title === "Inventory") {
                return (
                  <Collapsible 
                    key={link.title} 
                    open={inventoryOpen} 
                    onOpenChange={setInventoryOpen}
                    className="group/collapsible"
                  >
                    <div className={getCollapsibleHeaderClass(inventoryOpen, location.pathname.startsWith(link.to))}>
                      <NavLink
                        to={link.to}
                        className="flex items-center gap-3 flex-1 min-w-0 group-data-[state=collapsed]:justify-center"
                        onClick={(e) => {
                          if (!location.pathname.startsWith(link.to)) {
                            e.preventDefault()
                            setInventoryOpen(true)
                            navigate(link.to)
                          }
                        }}
                      >
                        <Icon className={cn(
                          getIconClass(location.pathname.startsWith(link.to)),
                          "group-data-[state=collapsed]:size-5" // Consistent icon size
                        )} />
                        <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">
                          {link.title}
                        </span>
                      </NavLink>
                      <CollapsibleTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-white/10 dark:hover:bg-white/10 group-data-[state=collapsed]:hidden">
                          <IoIosArrowForward className={cn(
                            "size-3.5 transition-transform duration-200",
                            inventoryOpen && "rotate-90"
                          )} />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                      <div className="ml-2 mt-1.5 space-y-1 py-1 pl-5 border-l border-gray-300/50 dark:border-gray-700/50 group-data-[state=collapsed]:hidden">
                        <NavLink 
                          to="/dashboard/inventory/analytics" 
                          className={({ isActive }) => getSubNavItemClass(isActive)}
                        >
                          <GoGraph className="size-3.5" />
                          <span>Analytics</span>
                        </NavLink>
                        <NavLink 
                          to="/dashboard/inventory/products" 
                          className={({ isActive }) => getSubNavItemClass(isActive)}
                        >
                          <AiOutlineProduct className="size-3.5" />
                          <span>Products</span>
                        </NavLink>
                        {!isInventoryAndSupplies && (
                          <NavLink 
                            to="/dashboard/inventory/employees" 
                            className={({ isActive }) => getSubNavItemClass(isActive)}
                          >
                            <LuUsers className="size-3.5" />
                            <span>Employees</span>
                          </NavLink>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              // Order Management Section
              if (link.title === "Order Management") {
                return (
                  <Collapsible 
                    key={link.title} 
                    open={ordersOpen} 
                    onOpenChange={setOrdersOpen}
                    className="group/collapsible"
                  >
                    <div className={getCollapsibleHeaderClass(ordersOpen, location.pathname.startsWith(link.to))}>
                      <NavLink
                        to={link.to}
                        className="flex items-center gap-3 flex-1 min-w-0 group-data-[state=collapsed]:justify-center"
                        onClick={(e) => {
                          if (!location.pathname.startsWith(link.to)) {
                            e.preventDefault()
                            setOrdersOpen(true)
                            navigate(link.to)
                          }
                        }}
                      >
                        <Icon className={cn(
                          getIconClass(location.pathname.startsWith(link.to)),
                          "group-data-[state=collapsed]:size-5"
                        )} />
                        <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">
                          {link.title}
                        </span>
                      </NavLink>
                      <CollapsibleTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-white/10 dark:hover:bg-white/10 group-data-[state=collapsed]:hidden">
                          <IoIosArrowForward className={cn(
                            "size-3.5 transition-transform duration-200",
                            ordersOpen && "rotate-90"
                          )} />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                      <div className="ml-2 mt-1.5 space-y-1 py-1 pl-5 border-l border-gray-300/50 dark:border-gray-700/50 group-data-[state=collapsed]:hidden">
                        <button
                          onClick={() => navigate('/dashboard/orders?status=pending')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/orders' && 
                            new URLSearchParams(location.search).get('status') === 'pending'
                          )}
                        >
                          {statusIcon.notStarted}
                          <span>Not yet Started</span>
                        </button>
                        <button
                          onClick={() => navigate('/dashboard/orders?status=processing')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/orders' && 
                            new URLSearchParams(location.search).get('status') === 'processing'
                          )}
                        >
                          {statusIcon.inProgress}
                          <span>In progress</span>
                        </button>
                        <button
                          onClick={() => navigate('/dashboard/orders?status=ready')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/orders' && 
                            new URLSearchParams(location.search).get('status') === 'ready'
                          )}
                        >
                          {statusIcon.readyForPickup}
                          <span>Ready for Pick-up</span>
                        </button>
                        <button
                          onClick={() => navigate('/dashboard/orders?status=completed')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/orders' && 
                            new URLSearchParams(location.search).get('status') === 'completed'
                          )}
                        >
                          {statusIcon.completed}
                          <span>Completed</span>
                        </button>
                        <button
                          onClick={() => navigate('/dashboard/orders?status=return_refund')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/orders' && 
                            new URLSearchParams(location.search).get('status') === 'return_refund'
                          )}
                        >
                          {statusIcon.returnRefund}
                          <span>Return / Refund</span>
                        </button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              // Service Management Section
              if (link.title === "Service Management") {
                return (
                  <Collapsible 
                    key={link.title} 
                    open={servicesOpen} 
                    onOpenChange={setServicesOpen}
                    className="group/collapsible"
                  >
                    <div className={getCollapsibleHeaderClass(servicesOpen, location.pathname.startsWith(link.to))}>
                      <NavLink
                        to={link.to}
                        className="flex items-center gap-3 flex-1 min-w-0 group-data-[state=collapsed]:justify-center"
                        onClick={(e) => {
                          if (!location.pathname.startsWith(link.to)) {
                            e.preventDefault()
                            setServicesOpen(true)
                            navigate(link.to)
                          }
                        }}
                      >
                        <Icon className={cn(
                          getIconClass(location.pathname.startsWith(link.to)),
                          "group-data-[state=collapsed]:size-5"
                        )} />
                        <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">
                          {link.title}
                        </span>
                      </NavLink>
                      <CollapsibleTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-white/10 dark:hover:bg-white/10 group-data-[state=collapsed]:hidden">
                          <IoIosArrowForward className={cn(
                            "size-3.5 transition-transform duration-200",
                            servicesOpen && "rotate-90"
                          )} />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                      <div className="ml-2 mt-1.5 space-y-1 py-1 pl-5 border-l border-gray-300/50 dark:border-gray-700/50 group-data-[state=collapsed]:hidden">
                        <button
                          onClick={() => {
                            setServicesOpen(true)
                            navigate('/dashboard/services/add')
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2 rounded-md text-sm transition-all",
                            "hover:pl-5 hover:bg-green-50 dark:hover:bg-green-900/20",
                            "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                          )}
                        >
                          <IoMdAdd className="size-4" />
                          <span>Add Service</span>
                        </button>
                        <button
                          onClick={() => {
                            setServicesOpen(true)
                            navigate('/dashboard/services/deleted')
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2 rounded-md text-sm transition-all",
                            "hover:pl-5 hover:bg-red-50 dark:hover:bg-red-900/20",
                            "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          )}
                        >
                          <GoTrash className="size-4" />
                          <span>Deleted Services</span>
                        </button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              // Regular links (Dashboard, Chat)
              return (
                <NavLink
                  key={link.title}
                  to={link.to}
                  className={({ isActive }) => getNavItemClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn(
                        getIconClass(isActive),
                        "group-data-[state=collapsed]:size-5"
                      )} />
                      <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">
                        {link.title}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            })
          ) : (
            // Customer navigation
            <div className="space-y-1">
              <NavLink 
                to="/dashboard/customer" 
                className={({ isActive }) => getNavItemClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <MdOutlineDashboard className={cn(
                      getIconClass(isActive),
                      "group-data-[state=collapsed]:size-5"
                    )} />
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Order Page</span>
                  </>
                )}
              </NavLink>

              <Collapsible 
                open={customerOrdersOpen} 
                onOpenChange={setCustomerOrdersOpen}
                className="group/collapsible"
              >
                <div className={getCollapsibleHeaderClass(customerOrdersOpen, location.pathname.startsWith('/dashboard/my-orders'))}>
                  <NavLink
                    to="/dashboard/my-orders"
                    className="flex items-center gap-3 flex-1 min-w-0 group-data-[state=collapsed]:justify-center"
                    onClick={(e) => {
                      if (!location.pathname.startsWith('/dashboard/my-orders')) {
                        e.preventDefault()
                        setCustomerOrdersOpen(true)
                        navigate('/dashboard/my-orders')
                      }
                    }}
                  >
                    <HiOutlineClock className={cn(
                      getIconClass(location.pathname.startsWith('/dashboard/my-orders')),
                      "group-data-[state=collapsed]:size-5"
                    )} />
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">
                      Track Orders
                    </span>
                  </NavLink>
                  <CollapsibleTrigger asChild>
                    <button className="p-1 rounded-md hover:bg-white/10 dark:hover:bg-white/10 group-data-[state=collapsed]:hidden">
                      <IoIosArrowForward className={cn(
                        "size-3.5 transition-transform duration-200",
                        customerOrdersOpen && "rotate-90"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                  <div className="ml-2 mt-1.5 space-y-1 py-1 pl-5 border-l border-gray-300/50 dark:border-gray-700/50 group-data-[state=collapsed]:hidden">
                    {['pending', 'processing', 'ready', 'completed', 'return_refund'].map((status) => (
                      <button
                        key={status}
                        onClick={() => navigate(`/dashboard/my-orders?status=${status}`)}
                        className={getStatusButtonClass(
                          location.pathname === '/dashboard/my-orders' && 
                          new URLSearchParams(location.search).get('status') === status
                        )}
                      >
                        {getStatusIcon(status)}
                        <span>
                          {status === 'pending' && 'Pending'}
                          {status === 'processing' && 'Processing'}
                          {status === 'ready' && 'Ready for Pick-up'}
                          {status === 'completed' && 'Completed'}
                          {status === 'return_refund' && 'Return / Refund'}
                        </span>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <NavLink 
                to="/dashboard/customize" 
                className={({ isActive }) => getNavItemClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <MdOutlineEdit className={cn(
                      getIconClass(isActive),
                      "group-data-[state=collapsed]:size-5"
                    )} />
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Customize</span>
                  </>
                )}
              </NavLink>

              <NavLink 
                to="/dashboard/saved-designs" 
                className={({ isActive }) => getNavItemClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <FiSave className={cn(
                      getIconClass(isActive),
                      "group-data-[state=collapsed]:size-5"
                    )} />
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Saved Designs</span>
                  </>
                )}
              </NavLink>

              <NavLink 
                to="/dashboard/chat-customer" 
                className={({ isActive }) => getNavItemClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <BsChatDots className={cn(
                      getIconClass(isActive),
                      "group-data-[state=collapsed]:size-5"
                    )} />
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Chat with Store</span>
                  </>
                )}
              </NavLink>
            </div>
          )}
        </nav>
      </SidebarContent>

      <SidebarFooter className="px-3 py-4 border-t border-gray-300/50 dark:border-gray-700/50 group-data-[state=collapsed]:px-2">
        <div className={cn(
          "rounded-xl p-3 transition-all",
          theme.cardBg,
          theme.cardBorder,
          "border",
          "hover:shadow-md",
          "group-data-[state=collapsed]:p-2" // Less padding when collapsed
        )}>
          <NavUser 
            user={navUser} 
            isDarkMode={isDarkMode} 
            onToggleTheme={onToggleTheme} 
          />
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}

export function AppSidebar({ isDarkMode = false, onToggleTheme, ...props }: AppSidebarProps) {
  return <AppSidebarContent isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} {...props} />
}