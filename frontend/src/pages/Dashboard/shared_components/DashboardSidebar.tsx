"use client"

import { NavLink } from "react-router-dom"
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline"

interface DashboardSidebarProps {
  role: "owner" | "customer"
  className?: string
  closeSidebar?: () => void 
  centered?: boolean
}

export default function DashboardSidebar({ role, className, closeSidebar, centered }: DashboardSidebarProps) {
  // Owner links
  const adminLinks = [
    { name: "Dashboard", href: "/dashboard/owner", icon: <HomeIcon className="h-5 w-5" /> },
    { name: "Order Management", href: "/dashboard/orders", icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
    { name: "Service Management", href: "/dashboard/services", icon: <Cog6ToothIcon className="h-5 w-5" /> },
    { name: "Inventory", href: "/dashboard/inventory", icon: <CubeIcon className="h-5 w-5" /> },
    { name: "Chat", href: "/dashboard/chat-owner", icon: <ChatBubbleLeftRightIcon className="h-5 w-5" /> },
  ]

  // Customer links
  const customerLinks = [
    { name: "Services", href: "/dashboard/customer", icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
    { name: "My Orders", href: "/dashboard/my-orders", icon: <ShoppingBagIcon className="h-5 w-5" /> },
    { name: "Customize", href: "/dashboard/customize", icon: <CubeIcon className="h-5 w-5" /> },
    { name: "Chat", href: "/dashboard/chat-customer", icon: <ChatBubbleLeftRightIcon className="h-5 w-5" /> },
  ]

  const links = role === "owner" ? adminLinks : customerLinks

  return (
    <aside
      className={`w-full lg:w-64 flex flex-col h-auto ${className ?? ""}`}
    >
      <nav className={`flex-1 space-y-1 ${centered ? 'w-full px-0 text-center flex flex-col items-center' : 'px-3'}`}>
        {links.map(link => (
          <NavLink
            key={link.name}
            to={link.href}
            onClick={() => {
              if (closeSidebar) closeSidebar() // close on mobile
            }}
            className={({ isActive }) => (
              centered
                ? `inline-flex items-center justify-center w-full gap-2 px-5 py-2 rounded-lg font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-white hover:text-white hover:bg-white/10'
                  }`
                : `flex items-center w-full gap-3 px-4 py-3 rounded-lg font-medium tracking-wide ${
                    isActive
                      ? 'text-white font-semibold bg-blue-600'
                      : 'text-gray-100 hover:text-white hover:bg-white/10'
                  }`
            )}
          >
            {link.icon}
            <span className={`${centered ? 'text-center' : ''}`}>{link.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
