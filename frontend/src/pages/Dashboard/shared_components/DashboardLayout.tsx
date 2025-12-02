import React, { useState, useEffect, useRef, Fragment } from "react";
import { BellIcon, TrashIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "../../../components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../../../components/ui/sidebar";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "/src/assets/PrintEase-Logo-Dark.png";
import { useSocket } from "../../../context/SocketContext";
import axios from "axios";
import { Socket } from "socket.io-client";
import api from "../../../lib/api";
import { Transition } from "@headlessui/react";
import ConfirmDialog from "./ConfirmDialog";

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
  const isOwnerUser = user?.role === "owner";
  const isOperationsManager = user?.role === "employee" && user.employeeRole === "Operations Manager";
  const canEditShop = isOwnerUser || isOperationsManager;
  const { socket } = useSocket() as { socket: Socket | null };
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Payment Order Modal State
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    orderId: string | null;
    subtotal: number;
    currency: string;
  }>({ open: false, orderId: null, subtotal: 0, currency: "PHP" });
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [verifyingPay, setVerifyingPay] = useState(false);

  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);

  const gradientClass =
    role === "owner"
      ? "bg-gradient-to-r from-[#0f172a] via-[#1e3a8a]/90 to-white"
      : "bg-gradient-to-r from-blue-900 via-indigo-900 to-black";

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen]);

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
    // Listen for payment_required to open modal globally
    const handlePaymentRequired = (data: { orderId: string; subtotal: number; currency?: string }) => {
      if (role !== "owner") return;
      setPaymentModal({ open: true, orderId: data.orderId, subtotal: Number(data.subtotal) || 0, currency: data.currency || "PHP" });
      setPayAmount("");
      setPayMethod("cash");
    };
    socket.on("payment_required", handlePaymentRequired);

    
  const handlePaymentVerified = () => {
      
      setVerifyingPay(false);
      setPaymentModal((p) => ({ ...p, open: false }));
    };
    socket.on("payment_verified", handlePaymentVerified);
    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("payment_required", handlePaymentRequired);
      socket.off("payment_verified", handlePaymentVerified);
    };
  }, [socket, user, role]);

  const toggleNotifications = () => {
    setNotificationsOpen((prev) => !prev);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  return (
    <SidebarProvider defaultOpen>
      <div className="relative flex min-h-screen w-full bg-transparent">
        <AppSidebar />
        <SidebarInset className="relative flex min-h-screen flex-1 flex-col overflow-x-hidden bg-transparent">
          <div aria-hidden className={`absolute inset-0 -z-10 ${gradientClass} pointer-events-none`} />
          <div className="relative z-10 flex min-h-screen flex-col">
            {/* Header */}
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 relative">
              <div className="flex items-center">
                <SidebarTrigger className="lg:hidden mr-3 border border-gray-300 bg-white text-gray-900 shadow-sm" />
                <div className="hidden sm:flex items-center gap-3">
                  <img src={logo} alt="PrintEase Logo" className="h-10 w-auto transition-transform duration-300 hover:scale-105" />
                </div>
              </div>

              {/* Right icons */}
              <div className="flex items-center gap-4 relative">
                {/* Notifications */}
                <div ref={notifRef} className="relative">
                  <button
                    title="Notifications"
                    className="p-3 border border-gray-300 rounded-xl shadow-sm hover:bg-blue-100/60 hover:border-blue-400 transition-all duration-300 ease-out transform hover:scale-110 active:scale-95 cursor-pointer relative group"
                    onClick={toggleNotifications}
                  >
                    <BellIcon className="h-6 w-6 text-gray-800 transition-transform duration-300 group-hover:scale-110" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />
                    )}
                  </button>
                  <Transition
                    show={notificationsOpen}
                    as={Fragment}
                    enter="transition ease-out duration-300"
                    enterFrom="opacity-0 scale-95 -translate-y-2"
                    enterTo="opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-200"
                    leaveFrom="opacity-100 scale-100 translate-y-0"
                    leaveTo="opacity-0 scale-95 -translate-y-2"
                  >
                    <div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 py-3 max-h-96 overflow-y-auto">
                      {/* Header */}
                      <div className="px-4 pb-2 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                        <p className="text-sm text-gray-600">{unreadCount} unread</p>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No notifications yet</p>
                        </div>
                      ) : (
                        <>
                          {/* Top actions */}
                          <div className="flex justify-between items-center px-4 py-3 bg-gray-50/50">
                            <button
                              className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-all duration-300 ease-out transform hover:scale-105"
                              onClick={async () => {
                                if (!token) return;
                                try {
                                  await axios.put(
                                    "http://localhost:8000/api/notifications/read-all",
                                    {},
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                                } catch (error) {
                                  console.error("Failed to mark notifications as read", error);
                                }
                              }}
                            >
                              Mark all as read
                            </button>
                            <button
                              className="text-red-600 text-sm font-medium hover:text-red-700 transition-all duration-300 ease-out transform hover:scale-105 flex items-center gap-1"
                              onClick={async () => {
                                if (!token) return;
                                try {
                                  await axios.delete("http://localhost:8000/api/notifications/delete-all", {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  setNotifications([]);
                                } catch (error) {
                                  console.error("Failed to delete all notifications", error);
                                }
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                              Clear all
                            </button>
                          </div>

                          {/* Notifications list */}
                          <div className="space-y-1 px-2">
                            {notifications.map((n) => (
                              <div
                                key={n._id}
                                className={`group flex items-start justify-between p-3 rounded-xl transition-all duration-300 ease-out cursor-pointer ${
                                  n.read
                                    ? "text-gray-700 hover:bg-gray-100/80"
                                    : "font-semibold text-gray-900 bg-blue-50/80 hover:bg-blue-100/80"
                                } hover:scale-[1.02] hover:shadow-sm`}
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
                                      if (role === "owner") {
                                        navigate("/dashboard/orders");
                                      } else {
                                        navigate("/dashboard/my-orders");
                                      }
                                      setNotificationsOpen(false);
                                    } catch (error) {
                                      console.error("Failed to handle notification selection", error);
                                    }
                                  }
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm leading-tight truncate">{n.title}</p>
                                  {n.description && (
                                    <p className="text-gray-600 text-xs mt-1 line-clamp-2">{n.description}</p>
                                  )}
                                  <p className="text-gray-400 text-xs mt-2">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </p>
                                </div>

                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.delete(`http://localhost:8000/api/notifications/${n._id}`, {
                                        headers: { Authorization: `Bearer ${token}` },
                                      });
                                      setNotifications((prev) => prev.filter((notif) => notif._id !== n._id));
                                    } catch (error) {
                                      console.error("Failed to delete notification", error);
                                    }
                                  }}
                                  className="ml-2 p-2 rounded-lg text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform hover:scale-110"
                                  title="Delete notification"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </Transition>
                </div>
              </div>
            </header>

            {/* Main content */}
            <div className="flex-1 w-full min-h-0 px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>

      {/* Logout Confirmation */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log Out?"
        message={
          <span>
            You're about to log out{user?.role === 'guest' ? ' of your guest session' : ''}. Any unsaved changes may be lost.
            <br />
            Continue?
          </span>
        }
        confirmText="Log Out"
        cancelText="Stay"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
          navigate("/login");
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />

      {/* Payment Verification Modal - remains exactly the same */}
      {paymentModal.open && paymentModal.orderId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <button
              className="absolute top-3 right-3 bg-white rounded-full border border-gray-300 shadow px-2.5 py-1 text-sm font-bold cursor-pointer hover:bg-gray-100 transition-all duration-300 ease-out transform hover:scale-110"
              onClick={() => {
                if (!verifyingPay) setPaymentModal({ open: false, orderId: null, subtotal: 0, currency: "PHP" });
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Verification</h3>
            <p className="text-sm text-gray-700 mb-4">Order: <span className="font-mono">#{paymentModal.orderId.slice(-6).toUpperCase()}</span></p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Amount Due</span>
                <span className="text-base font-semibold">{paymentModal.currency} {paymentModal.subtotal.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Payment Method</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Amount Tendered</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  placeholder="enter amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  min={0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Change</span>
                <span className="text-base font-semibold">
                  {paymentModal.currency}{" "}
                  {(() => {
                    const amt = Number(payAmount);
                    if (!isFinite(amt)) return "0.00";
                    const ch = Math.max(0, amt - paymentModal.subtotal);
                    return ch.toLocaleString(undefined, { maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg border bg-white text-gray-800 hover:bg-gray-50 transition-all duration-300 ease-out transform hover:scale-105"
                onClick={() => setPaymentModal({ open: false, orderId: null, subtotal: 0, currency: 'PHP' })}
                disabled={verifyingPay}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white transition-all duration-300 ease-out transform hover:scale-105 ${
                  Number(payAmount) >= paymentModal.subtotal 
                    ? 'bg-blue-600 hover:bg-blue-500' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={async () => {
                  if (!paymentModal.orderId) return;
                  const amt = Number(payAmount);
                  if (!isFinite(amt) || amt < paymentModal.subtotal) return;
                  try {
                    setVerifyingPay(true);
                    await api.patch(`/orders/${paymentModal.orderId}/status`, {
                      status: 'completed',
                      paymentStatus: 'paid',
                      paymentAmount: amt,
                      paymentMethod: payMethod,
                    });
                    setPaymentModal({ open: false, orderId: null, subtotal: 0, currency: 'PHP' });
                  } catch (e) {
                    console.error('Payment verify failed', e);
                  } finally {
                    setVerifyingPay(false);
                  }
                }}
                disabled={verifyingPay || !(Number(payAmount) >= paymentModal.subtotal)}
              >
                {verifyingPay ? 'Verifying…' : 'Verify Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fade animations */}
      <style>{`
        @keyframes fadeIn { from {opacity: 0} to {opacity:1} }
        @keyframes fadeOut { from {opacity: 1} to {opacity:0} }
        .animate-fadeIn { animation: fadeIn 0.2s ease forwards; }
        .animate-fadeOut { animation: fadeOut 0.2s ease forwards; }
      `}</style>
    </SidebarProvider>
  );
};

export default DashboardLayout;