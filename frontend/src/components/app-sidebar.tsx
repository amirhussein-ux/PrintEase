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


function AppSidebarContent({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
  }

  return (
      <Sidebar
        collapsible="icon"
        className="select-none [&_[data-sidebar=sidebar]]:bg-slate-900 [&_[data-sidebar=sidebar]]:text-white [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-slate-800"
        {...props}
      >
          <SidebarHeader>
              <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/5 hover:text-white text-white/90" onClick={handleHeaderClick}>
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
                    <div className="text-xs text-white/70 truncate">
                      {
                        (() => {
                          const a = store?.address
                          if (!a) return user?.address || 'No address set'
                          if (typeof a === 'string') return a
                          const city = a.city || ''
                          const state = a.state || ''
                          const line = a.addressLine || ''
                          const parts = [] as string[]
                          if (city) parts.push(city)
                          if (state) parts.push(state)
                          if (parts.length) return parts.join(', ')
                          if (line) return line
                          return user?.address || 'No address set'
                        })()
                      }
                    </div>
                  </div>
                </div>

                {(canEditShop || isCustomer) && (
                <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                  <button
                    aria-expanded={shopOpen}
                    
                    className="p-1 rounded-md text-white/80 cursor-pointer"
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
                      `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                        isActive ? "bg-white/10 text-white font-medium" : "text-white/70"
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
                      `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                        isActive ? 'bg-white/10 text-white font-medium' : 'text-white/70'
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
                return (
                  <div key={link.title} className="">
                              {link.title === "Inventory" ? (
                      <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                        <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white text-white/80">
                          <NavLink
                            to={link.to}
                            className={({ isActive }) =>
                              `flex items-center gap-2 flex-1 min-w-0 group-data-[state=collapsed]:justify-center ${isActive ? "bg-transparent text-white font-semibold" : "text-white/80"}`
                            }
                          >
                            <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                              <Icon className="size-4" />
                            </span>
                            <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                          </NavLink>

                          <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                            <CollapsibleTrigger asChild>
                              <button
                                aria-expanded={inventoryOpen}
                                className="p-1 rounded-md text-white/80 cursor-pointer"
                                title="Toggle Inventory"
                              >
                                <IoIosArrowForward className={`size-4 transition-transform duration-200 ${inventoryOpen ? 'rotate-90' : ''}`} />
                              </button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1 group-data-[state=collapsed]:hidden">
                            <NavLink
                              to="/dashboard/inventory/analytics"
                              className={({ isActive }) =>
                                `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                  isActive ? "bg-white/10 text-white font-medium" : "text-white/70"
                                }`
                              }
                            >
                              <span className="size-4"><GoGraph /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Analytics</span>
                            </NavLink>

                            <NavLink
                              to="/dashboard/inventory/products"
                              className={({ isActive }) =>
                                `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                  isActive ? "bg-white/10 text-white font-medium" : "text-white/70"
                                }`
                              }
                            >
                              <span className="size-4"><AiOutlineProduct /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Products</span>
                            </NavLink>

                            {!isInventoryAndSupplies && (
                              <NavLink
                                to="/dashboard/inventory/employees"
                                className={({ isActive }) =>
                                  `flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                    isActive ? "bg-white/10 text-white font-medium" : "text-white/70"
                                  }`
                                }
                              >
                                <span className="size-4"><LuUsers /></span>
                                <span className="truncate group-data-[state=collapsed]:hidden">Employees</span>
                              </NavLink>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : link.title === "Order Management" ? (
                      <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
                        <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white text-white/80">
                          <NavLink
                            to={link.to}
                            className={({ isActive }) =>
                              `flex items-center gap-2 flex-1 min-w-0 group-data-[state=collapsed]:justify-center ${isActive ? "bg-transparent text-white font-semibold" : "text-white/80"}`
                            }
                          >
                            <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                              <Icon className="size-4" />
                            </span>
                            <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                          </NavLink>

                          <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                            <CollapsibleTrigger asChild>
                              <button
                                aria-expanded={ordersOpen}
                                className="p-1 rounded-md text-white/80 cursor-pointer"
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
                              className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'pending'
                                  ? "bg-white/10 text-white font-medium"
                                  : "text-white/70"
                              }`}
                            >
                              <span className="size-4">{statusIcon.notStarted}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Not yet Started</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=processing')}
                              className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'processing'
                                  ? "bg-white/10 text-white font-medium"
                                  : "text-white/70"
                              }`}
                            >
                              <span className="size-4">{statusIcon.inProgress}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">In progress</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=ready')}
                              className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'ready'
                                  ? "bg-white/10 text-white font-medium"
                                  : "text-white/70"
                              }`}
                            >
                              <span className="size-4">{statusIcon.readyForPickup}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Ready for Pick-up</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/orders?status=completed')}
                              className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                                location.pathname === '/dashboard/orders' && new URLSearchParams(location.search).get('status') === 'completed'
                                  ? "bg-white/10 text-white font-medium"
                                  : "text-white/70"
                              }`}
                            >
                              <span className="size-4">{statusIcon.completed}</span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Completed</span>
                            </button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : link.title === "Service Management" ? (
                      <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
                        <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white text-white/80">
                          <NavLink
                            to={link.to}
                            className={({ isActive }) =>
                              `flex items-center gap-2 flex-1 min-w-0 group-data-[state=collapsed]:justify-center ${isActive ? "bg-transparent text-white font-semibold" : "text-white/80"}`
                            }
                          >
                            <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                              <Icon className="size-4" />
                            </span>
                            <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                          </NavLink>

                          <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                            <CollapsibleTrigger asChild>
                              <button
                                aria-expanded={servicesOpen}
                                className="p-1 rounded-md text-white/80 cursor-pointer"
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
                              className="flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 text-white/70"
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
                              className="flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 text-white/70"
                            >
                              <span className="size-4"><GoTrash /></span>
                              <span className="truncate group-data-[state=collapsed]:hidden">Deleted Services</span>
                            </button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <NavLink
                        to={link.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2 flex-1 min-w-0 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white group-data-[state=collapsed]:justify-center ${
                            isActive ? "bg-white/10 text-white font-semibold" : "text-white/80"
                          }`
                        }
                      >
                        <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                          <Icon className="size-4" />
                        </span>
                        <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">{link.title}</span>
                      </NavLink>
                    )}
                  </div>
                )
              })}
              {isCustomer && (
                <div className="space-y-1">
                  <NavLink
                    to="/dashboard/customer"
                    className={({ isActive }) =>
                      `flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white group-data-[state=collapsed]:justify-center ${
                        isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/80'
                      }`
                    }
                  >
                    <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                      <MdOutlineDashboard className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Order Page</span>
                  </NavLink>

                  <Collapsible open={customerOrdersOpen} onOpenChange={setCustomerOrdersOpen}>
                    <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white text-white/80">
                      <NavLink
                        to="/dashboard/my-orders"
                        className={({ isActive }) =>
                          `flex items-center gap-2 flex-1 min-w-0 group-data-[state=collapsed]:justify-center ${isActive ? 'bg-transparent text-white font-semibold' : 'text-white/80'}`
                        }
                      >
                        <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                          <HiOutlineClock className="size-4" />
                        </span>
                        <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Track Orders</span>
                      </NavLink>
                      <div className="flex-shrink-0 group-data-[state=collapsed]:hidden">
                        <CollapsibleTrigger asChild>
                          <button
                            aria-expanded={customerOrdersOpen}
                            className="p-1 rounded-md text-white/80 cursor-pointer"
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
                          className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'pending'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-white/70'
                          }`}
                        >
                          <span className="size-4">{statusIcon.notStarted}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Pending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=processing')}
                          className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'processing'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-white/70'
                          }`}
                        >
                          <span className="size-4">{statusIcon.inProgress}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Processing</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=ready')}
                          className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'ready'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-white/70'
                          }`}
                        >
                          <span className="size-4">{statusIcon.readyForPickup}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Ready for Pick-up</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/my-orders?status=completed')}
                          className={`flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm transition-all duration-150 hover:bg-white/5 ${
                            location.pathname === '/dashboard/my-orders' && new URLSearchParams(location.search).get('status') === 'completed'
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-white/70'
                          }`}
                        >
                          <span className="size-4">{statusIcon.completed}</span>
                          <span className="truncate group-data-[state=collapsed]:hidden">Completed</span>
                        </button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <NavLink
                    to="/dashboard/customize"
                    className={({ isActive }) =>
                      `flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white group-data-[state=collapsed]:justify-center ${
                        isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/80'
                      }`
                    }
                  >
                    <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                      <MdOutlineEdit className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Customize</span>
                  </NavLink>

                  <NavLink
                    to="/dashboard/chat-customer"
                    className={({ isActive }) =>
                      `flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all duration-150 hover:bg-white/10 hover:text-white group-data-[state=collapsed]:justify-center ${
                        isActive ? 'bg-white/10 text-white font-semibold' : 'text-white/80'
                      }`
                    }
                  >
                    <span className="flex items-center justify-center size-6 rounded-md text-white/90 flex-shrink-0">
                      <BsChatDots className="size-4" />
                    </span>
                    <span className="whitespace-nowrap group-data-[state=collapsed]:hidden">Chat with Store</span>
                  </NavLink>
                </div>
              )}
            </nav>
          </div>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={navUser} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return <AppSidebarContent {...props} />
}