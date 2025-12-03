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
import { MdOutlineLogout, MdDarkMode, MdLightMode } from "react-icons/md";

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import ConfirmDialog from "@/pages/Dashboard/shared_components/ConfirmDialog"

export function NavUser({
  user,
  isDarkMode = false,
  onToggleTheme,
}: {
  user: {
    name: string
    email?: string
    role?: string
    avatar: string
  }
  isDarkMode?: boolean
  onToggleTheme?: () => void
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

  const navUserHoverClasses = isDarkMode
    ? "hover:bg-white/10 hover:text-white active:bg-white/10 active:text-white active:border-white/20"
    : "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 active:text-gray-900 active:border-gray-300"
  const navUserThemeClasses = isDarkMode
    ? "bg-gray-900 text-white border border-gray-700 focus-visible:ring-white/70 focus-visible:ring-offset-gray-900 transition-colors"
    : "bg-white text-gray-900 border border-gray-200 focus-visible:ring-blue-500 focus-visible:ring-offset-white transition-colors"
  const navUserOpenStateClasses = isDarkMode
    ? "data-[state=open]:bg-white/10 data-[state=open]:text-white data-[state=open]:border-white/20 data-[state=open]:hover:bg-white/10 data-[state=open]:hover:text-white data-[state=open]:font-semibold"
    : "data-[state=open]:bg-gray-200 data-[state=open]:text-gray-900 data-[state=open]:border-gray-300 data-[state=open]:hover:bg-gray-200 data-[state=open]:hover:text-gray-900 data-[state=open]:font-semibold"
  const dropdownContainerClasses = isDarkMode
    ? "bg-gray-900 text-white border border-white/10 shadow-2xl"
    : "bg-white text-gray-900 border border-gray-200 shadow-xl"
  const dropdownDividerClasses = isDarkMode ? "border-t border-white/10" : "border-t border-gray-100"
  const dropdownButtonClasses = isDarkMode
    ? "w-full flex items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
    : "w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
  const themeToggleLabel = isDarkMode ? "Switch to light mode" : "Switch to dark mode"
  const ThemeToggleIcon = isDarkMode ? MdLightMode : MdDarkMode

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem ref={rootRef} className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:mb-2">
          <Collapsible open={collapsibleOpen} onOpenChange={(v) => setCollapsibleOpen(v)}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                size="lg"
                onClick={handleNavUserClick}
                className={`group-data-[state=collapsed]:justify-center ${navUserThemeClasses} ${navUserHoverClasses} ${navUserOpenStateClasses}`}
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
              <div className={`absolute bottom-full mb-2 right-0 w-full rounded-lg z-50 overflow-hidden ${dropdownContainerClasses}`}>
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
                <div className={dropdownDividerClasses}>
                  <button
                    onClick={() => {
                      setCollapsibleOpen(false)
                      navigate('/profile')
                    }}
                    className={dropdownButtonClasses}
                    type="button"
                  >
                    <FaRegUser />
                    <span>Account</span>
                  </button>
                </div>
                <div className={dropdownDividerClasses}>
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsibleOpen(false)
                      onToggleTheme?.()
                    }}
                    className={`${dropdownButtonClasses} justify-between`}
                  >
                    <span className="flex items-center gap-2">
                      <ThemeToggleIcon />
                      <span>{themeToggleLabel}</span>
                    </span>
                  </button>
                </div>
                <div className={dropdownDividerClasses}>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className={dropdownButtonClasses}
                    type="button"
                  >
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
