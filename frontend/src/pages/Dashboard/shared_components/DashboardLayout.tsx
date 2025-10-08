import React, { useState, useEffect, useRef } from "react";
import { BellIcon, UserCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "../../../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "/src/assets/PrintEase-Logo-Dark.png";
import { useSocket } from "../../../context/SocketContext";
import axios from "axios";
import { Socket } from "socket.io-client";
import api from "../../../lib/api";

interface DashboardLayoutProps {
  role: "owner" | "customer";
  children: React.ReactNode;
}

interface Notification {
  _id: string;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children }) => {
  const { user, logout, token } = useAuth();
  const { socket } = useSocket() as { socket: Socket | null };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [closingDropdown, setClosingDropdown] = useState<"profile" | "notifications" | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [store, setStore] = useState<{ _id: string; name: string; logoFileId?: unknown } | null>(null);
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const gradientClass = sidebarOpen
    ? "bg-blue-900"
    : role === "owner"
    ? "bg-gradient-to-r from-[#0f172a] via-[#1e3a8a]/90 to-white"
    : "bg-gradient-to-r from-blue-900 via-indigo-900 to-black";

  const storeId = (location.state as any)?.storeId;

  // Load store for customer pages
  useEffect(() => {
    if (role !== "customer" || !storeId) return;
    let active = true;
    const loadStores = async () => {
      try {
        const res = await api.get("/print-store/list");
        const stores = res.data as Array<{ _id: string; name: string; logoFileId?: unknown }>;
        const found = stores.find((s) => s._id === storeId) || null;
        if (active) setStore(found);
      } catch {
        if (active) setStore(null);
      }
    };
    loadStores();
    return () => {
      active = false;
    };
  }, [storeId, role]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (centerRef.current && !centerRef.current.contains(e.target as Node)) setCenterMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) closeDropdown("profile");
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) closeDropdown("notifications");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!user || !token) return;
    axios
      .get("http://localhost:8000/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotifications([]));
  }, [user, token]);

  // Socket.io real-time notifications
  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("register", { userId: user._id, role });
    const handleNewNotification = (data: Notification) => setNotifications((prev) => [data, ...prev]);
    socket.on("newNotification", handleNewNotification);
    return () => socket.off("newNotification", handleNewNotification);
  }, [socket, user]);

  const closeDropdown = (type: "profile" | "notifications") => {
    setClosingDropdown(type);
    setTimeout(() => {
      if (type === "profile") setProfileOpen(false);
      if (type === "notifications") setNotificationsOpen(false);
      setClosingDropdown(null);
    }, 200);
  };

  const toggleProfile = () => {
    if (notificationsOpen) closeDropdown("notifications");
    profileOpen ? closeDropdown("profile") : setProfileOpen(true);
  };

  const toggleNotifications = () => {
    if (profileOpen) closeDropdown("profile");
    notificationsOpen ? closeDropdown("notifications") : setNotificationsOpen(true);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Show shop dropdown only on customer dashboard pages
  const showShopDropdown = role === "customer" && location.pathname.startsWith("/dashboard") && !location.pathname.includes("my-orders");

  // Shop dropdown content
  const shopDropdown = showShopDropdown && store && (
    <div ref={centerRef} className="relative">
      <button
        type="button"
        onClick={() => setCenterMenuOpen((v) => !v)}
        className="flex items-center gap-2 border-2 shadow border-gray-300 rounded-full px-3 py-1 hover:bg-gray-200 transition"
      >
        {store.logoFileId ? (
          <img
            src={`${api.defaults.baseURL}/print-store/logo/${store.logoFileId}`}
            alt={store.name}
            className="h-10 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
            {store.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
        )}
        <span className="text-gray-900 font-semibold text-xl truncate max-w-[50vw]">{store.name}</span>
      </button>

      {centerMenuOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-30 py-1 animate-fadeIn">
          <button
            className="w-full text-center px-3 py-2 text-sm text-gray-900 font-bold hover:bg-gray-100 transition"
            onClick={() => {
              setCenterMenuOpen(false);
              navigate("/customer/select-shop");
            }}
          >
            Change Shop
          </button>
        </div>
      )}
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center">
          {/* Sidebar toggle */}
          <button className="lg:hidden mr-4 p-2 rounded hover:bg-gray-100 transition" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="block w-6 h-0.5 bg-gray-900 mb-1"></span>
            <span className="block w-6 h-0.5 bg-gray-900 mb-1"></span>
            <span className="block w-6 h-0.5 bg-gray-900"></span>
          </button>

          {/* Logo */}
          <div className="hidden sm:flex items-center gap-3">
            <img src={logo} alt="PrintEase Logo" className="h-10 w-auto" />
          </div>
        </div>

        {/* Center content */}
        {shopDropdown && <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">{shopDropdown}</div>}

        {/* Right icons */}
        <div className="flex items-center gap-3 relative">
          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              title="Profile"
              className="p-2 border border-gray-300 rounded-xl shadow-sm hover:bg-blue-100/60 hover:border-blue-400 transition transform active:scale-95 cursor-pointer"
              onClick={toggleProfile}
            >
              <UserCircleIcon className="h-6 w-6 text-gray-800" />
            </button>
            {profileOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-lg z-30 py-2 ${
                  closingDropdown === "profile" ? "animate-fadeOut" : "animate-fadeIn"
                }`}
              >
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-200 font-semibold hover:bg-blue-600 hover:text-white transition rounded-lg"
                  onClick={() => setProfileOpen(false)}
                >
                  Edit Profile
                </Link>
                {role === "owner" && (
                  <Link
                    to="/owner/create-shop"
                    className="block px-4 py-2 text-sm text-gray-200 font-semibold hover:bg-blue-600 hover:text-white transition rounded-lg"
                    onClick={() => setProfileOpen(false)}
                  >
                    Edit Shop
                  </Link>
                )}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-400 font-semibold hover:bg-red-600/20 hover:text-red-500 transition rounded-lg"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              title="Notifications"
              className="p-2 border border-gray-300 rounded-xl shadow-sm hover:bg-blue-100/60 hover:border-blue-400 transition transform active:scale-95 cursor-pointer relative"
              onClick={toggleNotifications}
            >
              <BellIcon className="h-6 w-6 text-gray-800" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </button>
            {notificationsOpen && (
              <div
                className={`absolute right-0 mt-2 w-80 bg-gray-900 border border-white/10 rounded-xl shadow-lg z-30 py-2 max-h-96 overflow-y-auto ${
                  closingDropdown === "notifications" ? "animate-fadeOut" : "animate-fadeIn"
                }`}
              >
                {notifications.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400 text-center">No notifications</p>
                ) : (
                  <>
                    {/* Top actions */}
                    <div className="flex justify-between items-center px-4 py-2 text-sm">
                      <span
                        className="text-blue-400 cursor-pointer hover:text-blue-300 transition"
                        onClick={async () => {
                          if (!token) return;
                          try {
                            await axios.put(
                              "http://localhost:8000/api/notifications/read-all",
                              {},
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                          } catch {}
                        }}
                      >
                        Mark all as read
                      </span>
                      <span
                        className="text-red-400 cursor-pointer hover:text-red-500 transition flex items-center gap-1"
                        onClick={async () => {
                          if (!token) return;
                          try {
                            await axios.delete("http://localhost:8000/api/notifications/delete-all", {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setNotifications([]);
                          } catch {}
                        }}
                      >
                        <TrashIcon className="h-4 w-4" /> Delete all
                      </span>
                    </div>

                    {/* Individual notifications */}
                    {notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`group flex items-start justify-between px-4 py-2 text-sm rounded-lg transition ${
                          n.read
                            ? "text-gray-300 hover:bg-gray-800/70"
                            : "font-semibold text-white bg-blue-600/10 hover:bg-blue-600/20"
                        }`}
                      >
                        <div
                          className="flex-1"
                          onClick={async () => {
                            if (token) {
                              try {
                                if (!n.read) {
                                  await axios.put(
                                    `http://localhost:8000/api/notifications/${n._id}/read`,
                                    {},
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  setNotifications((prev) =>
                                    prev.map((notif) => (notif._id === n._id ? { ...notif, read: true } : notif))
                                  );
                                }
                                role === "owner" ? navigate("/dashboard/orders") : navigate("/dashboard/my-orders");
                                setNotificationsOpen(false);
                              } catch {}
                            }
                          }}
                        >
                          <p>{n.title}</p>
                          {n.description && <p className="text-gray-400 text-xs">{n.description}</p>}
                        </div>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await axios.delete(`http://localhost:8000/api/notifications/${n._id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              setNotifications((prev) => prev.filter((notif) => notif._id !== n._id));
                            } catch {}
                          }}
                          className="ml-2 p-1 rounded-md text-red-500 hover:bg-red-600/20 opacity-0 group-hover:opacity-100 transition"
                          title="Delete notification"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

  {/* Background gradient (fixed to prevent white bars on overscroll) */}
  <div aria-hidden className={`fixed inset-0 ${gradientClass} pointer-events-none z-0`} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:top-1/2 lg:-translate-y-1/2 lg:left-0 lg:w-64 lg:z-30">
        <DashboardSidebar role={role} closeSidebar={() => {}} />
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed left-0 right-0 top-16 w-full z-40 ${sidebarOpen ? "block" : "hidden"}`}>
        <DashboardSidebar
          role={role}
          closeSidebar={() => setSidebarOpen(false)}
          className="h-auto bg-blue-900 text-white items-center justify-center py-4"
          centered={sidebarOpen}
        />
      </div>

      {/* Main content */}
      <main className={`relative z-10 mt-16 p-6 lg:ml-64 ${sidebarOpen ? "hidden lg:block" : "block"}`}>
        <div className="w-full">{children}</div>
      </main>

      {/* Fade animations */}
      <style>{`
        @keyframes fadeIn { from {opacity: 0} to {opacity:1} }
        @keyframes fadeOut { from {opacity: 1} to {opacity:0} }
        .animate-fadeIn { animation: fadeIn 0.2s ease forwards; }
        .animate-fadeOut { animation: fadeOut 0.2s ease forwards; }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
