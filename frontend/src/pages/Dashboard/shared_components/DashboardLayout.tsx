import React, { useState, useEffect } from "react";
import { AppSidebar } from "../../../components/app-sidebar";
import { SidebarProvider, SidebarInset } from "../../../components/ui/sidebar";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../context/SocketContext";
import { Socket } from "socket.io-client";
import api from "../../../lib/api";
import DashboardHeader from "./DashboardHeader";

interface DashboardLayoutProps {
  role: "owner" | "customer";
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children }) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket() as { socket: Socket | null };
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("dashboardDarkMode");
    if (stored !== null) return stored === "true";
    const prefersDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    return prefersDark;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboardDarkMode", String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
    return () => {
      root.classList.remove("dark");
    };
  }, [isDarkMode]);
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

  // Socket.io events shared across dashboard (non-header)
  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("register", { userId: user._id, role });
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
      socket.off("payment_required", handlePaymentRequired);
      socket.off("payment_verified", handlePaymentVerified);
    };
  }, [socket, user, role]);

  if (!user) return null;

  return (
    <div className={isDarkMode ? "dark" : undefined}>
      <SidebarProvider defaultOpen>
        <div className="relative flex min-h-screen w-full bg-transparent">
        <AppSidebar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />
        <SidebarInset className="relative flex min-h-screen flex-1 flex-col overflow-x-hidden bg-transparent p-0">
          <div aria-hidden className={`absolute inset-0 -z-10 pointer-events-none ${isDarkMode ? 'bg-slate-950' : 'bg-neutral-100'}`} />
          <div className="relative z-10 flex min-h-screen flex-col px-0">
            <DashboardHeader
              role={role}
              isDarkMode={isDarkMode}
            />

            {/* Main content */}
            <div className="flex-1 w-full min-h-0 px-0 py-0">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>


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
    </div>
  );
};

export default DashboardLayout;