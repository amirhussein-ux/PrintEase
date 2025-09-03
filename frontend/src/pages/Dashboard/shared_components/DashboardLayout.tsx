import React, { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "../../../context/AuthContext";
import logo from "/src/assets/PrintEase-Logo-Dark.png";

interface DashboardLayoutProps {
  role: "admin" | "customer";
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 fixed top-0 left-0 right-0 z-20">
        {/* Sidebar toggle button */}
        <button
          className="lg:hidden mr-4 p-2 rounded hover:bg-gray-100 transition"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="block w-6 h-0.5 bg-gray-900 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-900 mb-1"></span>
          <span className="block w-6 h-0.5 bg-gray-900"></span>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="PrintEase Logo" className="h-10 w-auto" />
        </div>
      </header>

      {/* Background gradient */}
      <div className="absolute inset-0 top-16 bg-gradient-to-r from-[#0f172a] via-[#1e3a8a]/90 to-white" />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:top-1/2 lg:-translate-y-1/2 lg:left-0 lg:w-64 lg:z-30">
        <DashboardSidebar role={role} closeSidebar={() => {}} />
      </div>

      {/* Mobile/Tablet Sidebar */}
      <div
        className={`fixed left-0 top-1/4 -translate-y-1/4 w-64 z-40 transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <DashboardSidebar
          role={role}
          closeSidebar={() => setSidebarOpen(false)}
          className="bg-transparent h-auto"
        />
      </div>

      {/* Main content */}
      <main
        className={`relative z-10 mt-16 p-6 transition-all duration-300
          ${sidebarOpen ? "hidden lg:block" : "block"}
        `}
      >
        <div className="w-full md:w-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
