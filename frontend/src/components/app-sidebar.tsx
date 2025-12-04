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
// ADD THIS IMPORT FOR SAVED DESIGNS ICON
import { HiOutlineRefresh } from 'react-icons/hi';
import { FiSave } from "react-icons/fi";

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
  const location = useLocation()
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
  const [shopOpen, setShopOpen] = React.useState<boolean>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('sidebarShopOpen') : null
      if (raw !== null) return raw === 'true'
    } catch {
      // ignore
    }
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
  const syncStoreFromStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('customerStore')
      setStore(raw ? (JSON.parse(raw) as StoreInfo) : null)
    } catch {
      setStore(null)
    }
  }, [setStore])
  const navigate = useNavigate()

  const isCustomer = user?.role === 'customer'
  const isOwner = user?.role === 'owner';
  const isOperationsManager = user?.employeeRole === 'Operations Manager';
  const isPrinterOperator = user?.employeeRole === 'Printer Operator';
  const isInventoryAndSupplies = user?.employeeRole === 'Inventory and Supplies';
  const isFrontDesk = user?.employeeRole === 'Front Desk';

  const canEditShop = isOwner || isOperationsManager;

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

    if (link.title === 'Inventory') {
      return !isPrinterOperator && !isFrontDesk;
    }
    if (link.title === 'Service Management') {
      return !isPrinterOperator && !isFrontDesk && !isInventoryAndSupplies;
    }
    return true;
  });

  const navUser = {
    name: user ? (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User') : 'Guest',
    email: user?.email || '',
    role: user ? (user.employeeRole || user.role || '') : '',
    avatar: user?.avatarUrl || '',
  }

  const statusIcon = {
    notStarted: <HiOutlineClock className="size-4" title="Not started" />,
    inProgress: <FaSpinner className="size-4 spin" title="In progress" />,
    readyForPickup: <FaBoxOpen className="size-4" title="Ready for pick-up" />,
    completed: <FaCheckCircle className="size-4" title="Completed" />,
    returnRefund: <HiOutlineRefresh className="size-4" title="Return / Refund" />,
  }

  const theme = {
    sidebarWrapper: isDarkMode
      ? "[&_[data-sidebar=sidebar]]:bg-gray-900 [&_[data-sidebar=sidebar]]:text-white [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-slate-800"
      : "[&_[data-sidebar=sidebar]]:bg-white [&_[data-sidebar=sidebar]]:text-gray-900 [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-gray-200 [&_[data-sidebar=sidebar]]:shadow-sm",
    headerText: isDarkMode ? "text-white/90" : "text-gray-700",
    headerHoverBg: isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100",
    headerHoverText: isDarkMode ? "hover:text-white" : "hover:text-gray-900",
    headerMuted: isDarkMode ? "text-white/70" : "text-gray-500",
    navText: isDarkMode ? "text-white/80" : "text-gray-700",
    navHoverBg: isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100",
    navHoverText: isDarkMode ? "hover:text-white" : "hover:text-gray-900",
    navActiveBg: isDarkMode ? "bg-white/10" : "bg-gray-200",
    navActiveText: isDarkMode ? "text-white" : "text-gray-900",
    navIcon: isDarkMode ? "text-white/90" : "text-gray-700",
    navToggleBtn: isDarkMode ? "text-white/80" : "text-gray-500",
    navSubText: isDarkMode ? "text-white/70" : "text-gray-600",
    navSubHoverBg: isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100",
    navSubActiveBg: isDarkMode ? "bg-white/10" : "bg-gray-100",
    navSubActiveText: isDarkMode ? "text-white font-medium" : "text-gray-900 font-medium",
  }

  const primaryNavContainer = `flex items-center gap-3 w-full px-3 py-2 rounded-md`;
  const primaryNavWrapper = `${primaryNavContainer} ${theme.navHoverBg} ${theme.navHoverText} ${theme.navText}`;
  const navLinkBase = `flex items-center gap-2 flex-1 min-w-0 group-data-[state=collapsed]:justify-center`;
  const navIconWrapper = `flex items-center justify-center size-6 rounded-md flex-shrink-0 ${theme.navIcon}`;
  const navToggleButton = `p-1 rounded-md cursor-pointer ${theme.navToggleBtn}`;
  const getPrimaryNavLinkClass = (isActive: boolean) =>
    `${navLinkBase} ${isActive ? `${theme.navActiveText} font-semibold` : theme.navText}`;
  const getFlatNavClass = (isActive: boolean) =>
    `flex items-center gap-2 flex-1 min-w-0 w-full px-3 py-2 rounded-md group-data-[state=collapsed]:justify-center ${theme.navHoverBg} ${theme.navHoverText} ${
      isActive ? `${theme.navActiveBg} ${theme.navActiveText} font-semibold` : theme.navText
    }`;
  const getSubNavClass = (isActive: boolean) =>
    `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm ${theme.navSubHoverBg} ${
      isActive ? `${theme.navSubActiveBg} ${theme.navSubActiveText}` : theme.navSubText
    }`;
  const getStatusButtonClass = (active: boolean) =>
    `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm ${theme.navSubHoverBg} ${
      active ? `${theme.navSubActiveBg} ${theme.navSubActiveText}` : theme.navSubText
    }`;
  const sidebarFooterClasses = isDarkMode
    ? "[&_button[data-slot=sidebar-menu-button]]:hover:bg-white/10 [&_button[data-slot=sidebar-menu-button]]:hover:text-white"
    : "[&_button[data-slot=sidebar-menu-button]]:hover:bg-gray-100 [&_button[data-slot=sidebar-menu-button]]:hover:text-gray-900"

  return (
      <Sidebar
        collapsible="icon"
        className={`select-none ${theme.sidebarWrapper}`}
        {...props}
      >
          <SidebarHeader>
              <div
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-md ${theme.headerHoverBg} ${theme.headerHoverText} ${theme.headerText}`}
                onClick={handleHeaderClick}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="size-8">
                    {store?.logoFileId ? (
                      <AvatarImage
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/print-store/logo/${store.logoFileId}`}
                        alt={store?.name || user?.store || user?.fullName || 'Shop'}
                      />
                    ) : user?.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.fullName || user?.email || 'Shop'} />
                    ) : (
                      <AvatarFallback>{(user?.firstName || 'S').charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>

                  <div className="truncate group-data-[state=collapsed]:hidden">
                    <div className="text-sm font-semibold truncate">{store?.name || user?.store || (isCustomer ? 'Shop' : 'Your Shop')}</div>
                    <div className={`text-xs truncate ${theme.headerMuted}`}>
                      {
                        (() => {
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
                        })()
                      }
                    </div>
                  </div>
                </div>

                {(canEditShop || isCustomer) && (
                <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                  <button
                    aria-expanded={shopOpen}
                    className={`p-1 rounded-md cursor-pointer ${theme.navToggleBtn}`}
                    title="Toggle Shop Info"
                  >
                    <IoIosArrowForward className={`size-4 transition-transform duration-200 ${shopOpen ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              )}
              </div>
              {canEditShop && shopOpen && (
                <div className="mt-2 ml-6 mr-1 space-y-2 group-data-[state=collapsed]:hidden">
                  <NavLink
                    to="/owner/create-shop"
                    className={({ isActive }) =>
                      `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm ${theme.navSubHoverBg} ${
                        isActive ? `${theme.navSubActiveBg} ${theme.navSubActiveText}` : theme.navSubText
                      }`
                    }
                  >
                    <span className="size-4"><MdOutlineEdit /></span>
                    <span className="truncate group-data-[state=collapsed]:hidden">Edit Shop</span>
                  </NavLink>
                </div>
              )}
              {isCustomer && shopOpen && (
                <div className="mt-2 ml-6 mr-1 space-y-1 group-data-[state=collapsed]:hidden">
                  <NavLink
                    to="/customer/select-shop"
                    className={({ isActive }) =>
                      `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm ${theme.navSubHoverBg} ${
                        isActive ? `${theme.navSubActiveBg} ${theme.navSubActiveText}` : theme.navSubText
                      }`
                    }
                  >
                    <span className="size-4"><IoStorefrontOutline /></span>
                    <span className="truncate group-data-[state=collapsed]:hidden">Change Store</span>
                  </NavLink>
                </div>
              )}
          </SidebarHeader>

        <SidebarContent>
          <div className="px-2">
            <nav className="space-y-1">
              {!isCustomer && visibleStoreLinks.map((link) => {
                const Icon = link.icon

                if (link.title === "Inventory") {
                  return (
                    <div key={link.title}>
                      <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                        <div className={primaryNavWrapper}>
                          <NavLink
                            to={link.to}
                            className={({ isActive }) => `${getPrimaryNavLinkClass(isActive)} bg-transparent`}
                          >
                            <span className={navIconWrapper}>
                              <Icon className="size-4" />
                            </span>
                            <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                          </NavLink>

                          <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                            <CollapsibleTrigger asChild>
                              <button
                                aria-expanded={inventoryOpen}
                                className={navToggleButton}
                                title="Toggle Inventory"
                              >
                                <IoIosArrowForward className={`size-4 transition-transform duration-200 ${inventoryOpen ? 'rotate-90' : ''}`} />
                              </button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1 group-data-[state=collapsed]:hidden">
                            <NavLink to="/dashboard/inventory/analytics" className={({ isActive }) => getSubNavClass(isActive)}>
                              <span className="size-4"><GoGraph /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Analytics</span>
                            </NavLink>

                            <NavLink to="/dashboard/inventory/products" className={({ isActive }) => getSubNavClass(isActive)}>
                              <span className="size-4"><AiOutlineProduct /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Products</span>
                            </NavLink>

                            {!isInventoryAndSupplies && (
                              <NavLink to="/dashboard/inventory/employees" className={({ isActive }) => getSubNavClass(isActive)}>
                                <span className="size-4"><LuUsers /></span>
                                <span className="truncate group-data-[state=collapsed]:hidden">Employees</span>
                              </NavLink>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )
                }

                if (link.title === "Order Management") {
                  return (
                    <div key={link.title}>
                      <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
                        <div className={primaryNavWrapper}>
                          <NavLink
                            to={link.to}
                            className={({ isActive }) => `${getPrimaryNavLinkClass(isActive)} bg-transparent`}
                          >
                            <span className={navIconWrapper}>
                              <Icon className="size-4" />
                            </span>
                            <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                          </NavLink>

                          <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                            <CollapsibleTrigger asChild>
                              <button
                                aria-expanded={ordersOpen}
                                className={navToggleButton}
                                title="Toggle Orders"
                              >
                                <IoIosArrowForward className={`size-4 transition-transform duration-200 ${ordersOpen ? 'rotate-90' : ''}`} />
                              </button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1 group-data-[state=collapsed]:hidden">
                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=pending')}
                              className={getStatusButtonClass(
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'pending'
                              )}
                            >
                              <span className="size-4">{statusIcon.notStarted}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Not yet Started</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=processing')}
                              className={getStatusButtonClass(
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'processing'
                              )}
                            >
                              <span className="size-4">{statusIcon.inProgress}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">In progress</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=ready')}
                              className={getStatusButtonClass(
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'ready'
                              )}
                            >
                              <span className="size-4">{statusIcon.readyForPickup}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Ready for Pick-up</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=completed')}
                              className={getStatusButtonClass(
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'completed'
                              )}
                            >
                              <span className="size-4">{statusIcon.completed}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Completed</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=return_refund')}
                              className={getStatusButtonClass(
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'return_refund'
                              )}
                            >
                              <span className="size-4">{statusIcon.returnRefund}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Return / Refund</span>
                            </button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )
                }

                if (link.title === "Service Management") {
                  return (
                    <div key={link.title}>
                      <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
                        <div className={primaryNavWrapper}>
                          <NavLink
                            to={link.to}
                            className={({ isActive }) => `${getPrimaryNavLinkClass(isActive)} bg-transparent`}
                          >
                            <span className={navIconWrapper}>
                              <Icon className="size-4" />
                            </span>
                            <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                          </NavLink>

                          <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                            <CollapsibleTrigger asChild>
                              <button
                                aria-expanded={servicesOpen}
                                className={navToggleButton}
                                title="Toggle Services"
                              >
                                <IoIosArrowForward className={`size-4 transition-transform duration-200 ${servicesOpen ? 'rotate-90' : ''}`} />
                              </button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1 group-data-[state=collapsed]:hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setServicesOpen(true)
                                navigate('/dashboard/services/add')
                              }}
                              className={getStatusButtonClass(false)}
                            >
                              <span className="size-4"><IoMdAdd /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Add Service</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setServicesOpen(true)
                                navigate('/dashboard/services/deleted')
                              }}
                              className={getStatusButtonClass(false)}
                            >
                              <span className="size-4"><GoTrash /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Deleted Services</span>
                            </button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )
                }

                return (
                  <NavLink
                    key={link.title}
                    to={link.to}
                    className={({ isActive }) => getFlatNavClass(isActive)}
                  >
                    <span className={navIconWrapper}>
                      <Icon className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                  </NavLink>
                )
              })}
              {isCustomer && (
                <div className="space-y-1">
                  <NavLink to="/dashboard/customer" className={({ isActive }) => getFlatNavClass(isActive)}>
                    <span className={navIconWrapper}>
                      <MdOutlineDashboard className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Order Page</span>
                  </NavLink>

                  <Collapsible open={customerOrdersOpen} onOpenChange={setCustomerOrdersOpen}>
                    <div className={primaryNavWrapper}>
                      <NavLink
                        to="/dashboard/my-orders"
                        className={({ isActive }) => `${getPrimaryNavLinkClass(isActive)} bg-transparent`}
                      >
                        <span className={navIconWrapper}>
                          <HiOutlineClock className="size-4" />
                        </span>
                        <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Track Orders</span>
                      </NavLink>
                      <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                        <CollapsibleTrigger asChild>
                          <button
                            aria-expanded={customerOrdersOpen}
                            className={navToggleButton}
                            title="Toggle Track Orders"
                          >
                            <IoIosArrowForward className={`size-4 transition-transform duration-200 ${customerOrdersOpen ? 'rotate-90' : ''}`} />
                          </button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1 group-data-[state=collapsed]:hidden">
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=pending')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'pending'
                          )}
                        >
                          <span className="size-4">{statusIcon.notStarted}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Pending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=processing')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'processing'
                          )}
                        >
                          <span className="size-4">{statusIcon.inProgress}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Processing</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=ready')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'ready'
                          )}
                        >
                          <span className="size-4">{statusIcon.readyForPickup}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Ready for Pick-up</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=completed')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'completed'
                          )}
                        >
                          <span className="size-4">{statusIcon.completed}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Completed</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=return_refund')}
                          className={getStatusButtonClass(
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'return_refund'
                          )}
                        >
                          <span className="size-4">{statusIcon.returnRefund}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Return / Refund</span>
                        </button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <NavLink to="/dashboard/customize" className={({ isActive }) => getFlatNavClass(isActive)}>
                    <span className={navIconWrapper}>
                      <MdOutlineEdit className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Customize</span>
                  </NavLink>

                  {/* Saved Designs (placed after Customize) */}
                  <NavLink to="/dashboard/saved-designs" className={({ isActive }) => getFlatNavClass(isActive)}>
                    <span className={navIconWrapper}>
                      <FiSave className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Saved Designs</span>
                  </NavLink>

                  <NavLink to="/dashboard/chat-customer" className={({ isActive }) => getFlatNavClass(isActive)}>
                    <span className={navIconWrapper}>
                      <BsChatDots className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Chat with Store</span>
                  </NavLink>
                </div>
              )}
            </nav>
          </div>
        </SidebarContent>

        <SidebarFooter className={sidebarFooterClasses}>
          <NavUser user={navUser} isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
  )
}

export function AppSidebar({ isDarkMode = false, onToggleTheme, ...props }: AppSidebarProps) {
  return <AppSidebarContent isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} {...props} />
}