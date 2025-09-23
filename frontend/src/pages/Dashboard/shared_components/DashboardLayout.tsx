import React, { useState, useEffect } from "react";
import { BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "../../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import logo from "/src/assets/PrintEase-Logo-Dark.png";
import { useSocket } from "../../../context/SocketContext";
import axios from "axios";
import { Socket } from "socket.io-client";

interface DashboardLayoutProps {
  role: "owner" | "customer";
  children: React.ReactNode;
  centerContent?: React.ReactNode;
}

interface Notification {
  _id: string;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children, centerContent }) => {
  const { user, logout, token } = useAuth();
  const { socket } = useSocket() as { socket: Socket | null };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  // Background gradient
  const gradientClass = sidebarOpen
    ? "bg-blue-900"
    : role === "owner"
    ? "bg-gradient-to-r from-[#0f172a] via-[#1e3a8a]/90 to-white"
    : "bg-gradient-to-r from-blue-900 via-indigo-900 to-black";

  // Fetch persistent notifications
  useEffect(() => {
    if (!user || !token) return;

    axios
      .get("http://localhost:8000/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
        setNotifications([]);
      });
  }, [user, token]);

  // Socket.io: real-time notifications
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("register", { userId: user._id, role });

    const handleNewNotification = (data: Notification) => {
      setNotifications((prev) => [data, ...prev]);
    };

    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newNotification", handleNewNotification);
    };
  }, [socket, user]);

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.read).length
    : 0;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent border-solid rounded-full animate-spin mb-4"></div>
          <p className="text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center">
          {/* Sidebar toggle */}
          <button
            className="lg:hidden mr-4 p-2 rounded hover:bg-gray-100 transition"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
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
        {centerContent && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            {centerContent}
          </div>
        )}

        {/* Right icons */}
        <div className="flex items-center gap-3 relative">
          {/* Profile dropdown */}
          <div className="relative">
            <button
              title="Profile"
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <UserCircleIcon className="h-6 w-6 text-gray-800" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-30 py-1">
                <Link
                  to="/profile"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setProfileOpen(false)}
                >
                  Edit Profile
                </Link>
                {role === "owner" && (
                  <Link
                    to="/owner/create-shop"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setProfileOpen(false)}
                  >
                    Edit Shop
                  </Link>
                )}
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              title="Notifications"
              className="p-2 rounded hover:bg-gray-100 relative"
              onClick={() => setNotificationsOpen((v) => !v)}
            >
              <BellIcon className="h-6 w-6 text-gray-800" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-30 py-2 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">No notifications</p>
                ) : (
                  <>
                    {/* Mark All as Read Button */}
                    <div className="px-3 py-2 text-sm text-blue-600 cursor-pointer hover:bg-gray-100 font-semibold"
                      onClick={async () => {
                        if (!token) return;
                        try {
                          await axios.put(
                            "http://localhost:8000/api/notifications/read-all",
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                        } catch (err) {
                          console.error("Failed to mark all notifications as read:", err);
                        }
                      }}
                    >
                      Mark all as read
                    </div>

                    {/* Individual notifications */}
                    {notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                          n.read ? "" : "font-semibold"
                        }`}
                        onClick={async () => {
                          if (token) {
                            try {
                              // Mark as read if not already
                              if (!n.read) {
                                await axios.put(
                                  `http://localhost:8000/api/notifications/${n._id}/read`,
                                  {},
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setNotifications((prev) =>
                                  prev.map((notif) =>
                                    notif._id === n._id ? { ...notif, read: true } : notif
                                  )
                                );
                              }

                              // Redirect to order management based on role
                              if (role === "owner") {
                                navigate("/dashboard/orders");
                              } else if (role === "customer") {
                                navigate("/dashboard/my-orders");
                              } 
                              setNotificationsOpen(false); // close the dropdown
                            } catch (err) {
                              console.error("Failed to handle notification click:", err);
                            }
                          }
                        }}
                      >
                        <p>{n.title}</p>
                        {n.description && <p className="text-gray-500 text-xs">{n.description}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Background gradient */}
      <div className={`absolute inset-0 top-16 ${gradientClass}`} />

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
    </div>
  );
};

export default DashboardLayout;
