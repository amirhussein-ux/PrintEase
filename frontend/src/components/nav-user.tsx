import {
  ChevronsUpDown,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { FaRegUser } from "react-icons/fa";
import { FaRegBell } from "react-icons/fa";
import { MdOutlineLogout } from "react-icons/md";

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import ConfirmDialog from "@/pages/Dashboard/shared_components/ConfirmDialog"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email?: string
    role?: string
    avatar: string
  }
}) {
  const [collapsibleOpen, setCollapsibleOpen] = useState(false)
  const rootRef = useRef<HTMLLIElement | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { logout, user: authUser } = useAuth();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target as Node)) return
      setCollapsibleOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [])
  const { isMobile, state: sidebarState, setOpen: setSidebarOpen } = useSidebar()
  const navigate = useNavigate()
  const capitalizeFirst = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

  const handleNavUserClick = () => {
    if (sidebarState === 'collapsed') {
      setSidebarOpen(true)
    } else {
      setCollapsibleOpen((s) => !s)
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem ref={rootRef} className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:mb-2">
          <Collapsible open={collapsibleOpen} onOpenChange={(v) => setCollapsibleOpen(v)}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                size="lg"
                onClick={handleNavUserClick}
                className={`group-data-[state=collapsed]:justify-center ${collapsibleOpen ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-xs whitespace-normal">{capitalizeFirst(user.role)}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 group-data-[state=collapsed]:hidden" />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="absolute bottom-full mb-2 right-0 w-full rounded-lg bg-white text-gray-900 dark:bg-slate-800 dark:text-white shadow-lg z-50 overflow-hidden">
                <div className="px-2 py-2 text-sm">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs whitespace-normal">{user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-t-gray-100 dark:border-t-slate-700">
                  <button onClick={() => { setCollapsibleOpen(false); navigate('/profile') }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">
                    <FaRegUser />
                    <span>Account</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">
                    <FaRegBell />
                    <span>Notifications</span>
                  </button>
                </div>
                <div className="border-t border-t-gray-100 dark:border-t-slate-700">
                  <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">
                    <MdOutlineLogout />
                    <span>Log out</span>
                  </button>
                  
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarMenu>
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log Out?"
        message={
          <span>
            You're about to log out{authUser?.role === 'guest' ? ' of your guest session' : ''}. Any unsaved changes may be lost.
            <br />
            Continue?
          </span>
        }
        confirmText="Log Out"
        cancelText="Stay"
        onConfirm={handleLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  )
}
