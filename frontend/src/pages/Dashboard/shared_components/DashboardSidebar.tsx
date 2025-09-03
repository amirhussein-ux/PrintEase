"use client"

import { NavLink } from "react-router-dom"
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  BellIcon,
  CubeIcon,
  UserCircleIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline"

interface DashboardSidebarProps {
  role: "admin" | "customer"
  className?: string
  closeSidebar?: () => void 
}

export default function DashboardSidebar({ role, className, closeSidebar }: DashboardSidebarProps) {
  const adminLinks = [
    { name: "Dashboard", href: "/dashboard/admin", icon: <HomeIcon className="h-5 w-5" /> },
    { name: "Order Management", href: "/dashboard/orders", icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
    { name: "Service Management", href: "/dashboard/services", icon: <Cog6ToothIcon className="h-5 w-5" /> },
    { name: "Inventory", href: "/dashboard/inventory", icon: <CubeIcon className="h-5 w-5" /> },
    { name: "Notifications", href: "/dashboard/notifications", icon: <BellIcon className="h-5 w-5" /> },
    { name: "User Profile", href: "/profile", icon: <UserCircleIcon className="h-5 w-5" /> },
  ]

  const customerLinks = [
    { name: "Dashboard", href: "/dashboard/customer", icon: <HomeIcon className="h-5 w-5" /> },
    { name: "My Orders", href: "/dashboard/my-orders", icon: <ShoppingBagIcon className="h-5 w-5" /> },
    { name: "Notifications", href: "/dashboard/notifications", icon: <BellIcon className="h-5 w-5" /> },
    { name: "Profile", href: "/profile", icon: <UserCircleIcon className="h-5 w-5" /> },
  ]

  const links = role === "admin" ? adminLinks : customerLinks

  return (
    <aside
      className={`fixed left-0 top-1/2 -translate-y-1/2 w-64 flex flex-col h-auto z-30 ${className ?? ""}`}
    >
      <nav className="flex-1 px-3 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.name}
            to={link.href}
            onClick={() => {
              if (closeSidebar) closeSidebar() // close on mobile
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium tracking-wide transition-all duration-200 ${
                isActive
                  ? "text-white font-semibold bg-blue-600 shadow-[0_0_8px_#3b82f6] border-l-4 border-blue-500"
                  : "text-gray-100 hover:text-white hover:bg-white/10"
              }`
            }
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
