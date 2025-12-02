"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import api from "../lib/api"
import { FaRegEdit } from "react-icons/fa"
import type { AxiosInstance } from "axios"
import { ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// Define the Shop shape used by this component
interface ShopAddress {
  addressLine?: string
  city?: string
  state?: string
  country?: string
  postal?: string
  location?: { lat: number; lng: number }
}

interface Shop {
  _id?: string
  name: string
  logoFileId?: unknown
  address?: ShopAddress
}

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [activeTeam] = React.useState(
    () =>
      (teams && teams.length && teams[0]) || {
        name: "",
        logo: () => null,
        plan: "",
      }
  )
  const [isStoreDashboard, setIsStoreDashboard] = React.useState(false)
  const [store, setStore] = React.useState<Shop | null>(null)
  const navigate = useNavigate()
  const [logoSrc, setLogoSrc] = React.useState<string | null>(null)

  

  React.useEffect(() => {
    try {
      setIsStoreDashboard(
        typeof window !== "undefined" &&
          (window.location.pathname.includes("/Dashboard/Store") ||
            window.location.pathname.includes("/dashboard/owner") ||
            window.location.pathname.includes("/owner") ||
            window.location.pathname.includes("/dashboard/store"))
      )
    } catch {
      setIsStoreDashboard(false)
    }
  }, [])

  // fetch current store (if any) and show in dropdown
  React.useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.get<Shop>("/print-store/mine")
        if (!active) return
        setStore(res.data)
      } catch {
        // no store or unauthorized — keep store as null
        setStore(null)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // derive a logo URL for the store if available
  React.useEffect(() => {
    if (!store) {
      setLogoSrc(null)
      return
    }
    let logoId: string | undefined
    const raw = store.logoFileId
    if (typeof raw === "string") logoId = raw
    else if (raw && typeof raw === "object") {
      const maybe = raw as { _id?: unknown; toString?: () => string }
      if (typeof maybe._id === "string") logoId = maybe._id
      else if (typeof maybe.toString === "function") {
        try {
          const s = maybe.toString()
          if (s && s !== "[object Object]") logoId = s
        } catch {
          /* ignore */
        }
      }
    }
    if (logoId && api && (api as unknown as AxiosInstance).defaults && (api as unknown as AxiosInstance).defaults.baseURL) {
      setLogoSrc(`${(api as unknown as AxiosInstance).defaults.baseURL}/print-store/logo/${logoId}`)
    } else {
      setLogoSrc(null)
    }
  }, [store])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={store?.name || activeTeam.name}
                    className="h-6 w-6 object-cover rounded-md"
                  />
                ) : (
                  React.createElement(activeTeam.logo, { className: "size-4" })
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{store?.name || activeTeam.name}</span>
                <span className="truncate text-xs">{store?.address?.city || activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg text-gray-900 dark:bg-slate-800 dark:text-white"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {store ? (
              <div className="px-3 py-2">
                <div className="text-sm font-semibold truncate">{store.name}</div>
                <div className="text-xs truncate text-muted-foreground">
                  {store.address?.addressLine
                    ? `${store.address.addressLine}, ${store.address.city || ''} ${store.address.state || ''}`
                    : store.address?.city || "No address set"}
                </div>
                <DropdownMenuSeparator className="bg-white mt-2" />
                <div className="mt-2">
                  <DropdownMenuItem
                    onClick={() => navigate("/owner/create-shop")}
                    className="gap-2 p-2 items-center hover:bg-accent/10 dark:hover:bg-white/10 transition-colors rounded-sm"
                  >
                    <FaRegEdit className="w-4 h-4 mr-2" />
                    Edit Store
                  </DropdownMenuItem>
                </div>
              </div>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  if (isStoreDashboard) {
                    navigate("/owner/create-shop")
                  }
                }}
                className="gap-2 p-2"
              >
                {isStoreDashboard ? "Edit Shop" : "(Customer) Placeholder"}
              </DropdownMenuItem>
            )}
            {/* teams list and add-store action removed per request */}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
