import React, { useState } from "react";
import { BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "../../../context/useAuth";
import { Link, useNavigate } from "react-router-dom";
import logo from "/src/assets/PrintEase-Logo-Dark.png";

interface DashboardLayoutProps {
  role: "owner" | "customer";
  children: React.ReactNode;
  centerContent?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children, centerContent }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  
  // Background style: default gradient, solid blue when sidebar is open on mobile
  const gradientClass = sidebarOpen
    ? 'bg-blue-900'
    : role === 'owner'
      ? 'bg-gradient-to-r from-[#0f172a] via-[#1e3a8a]/90 to-white'
      : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-black';

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
          {/* Sidebar toggle button */}
          <button
            className="lg:hidden mr-4 p-2 rounded hover:bg-gray-100 transition"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="block w-6 h-0.5 bg-gray-900 mb-1"></span>
            <span className="block w-6 h-0.5 bg-gray-900 mb-1"></span>
            <span className="block w-6 h-0.5 bg-gray-900"></span>
          </button>

          {/* Logo (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-3">
            <img src={logo} alt="PrintEase Logo" className="h-10 w-auto" />
          </div>
        </div>

        {/* Center content*/}
        {centerContent && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            {centerContent}
          </div>
        )}

        {/* Right-side icons*/}
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
                {role === 'owner' && (
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
          {/* Notifications on right */}
          <button title="Notifications" className="p-2 rounded hover:bg-gray-100">
            <BellIcon className="h-6 w-6 text-gray-800" />
          </button>
        </div>
      </header>

  {/* Background gradient (role-based) */}
  <div className={`absolute inset-0 top-16 ${gradientClass}`} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:top-1/2 lg:-translate-y-1/2 lg:left-0 lg:w-64 lg:z-30">
        <DashboardSidebar role={role} closeSidebar={() => {}} />
      </div>

      {/* Mobile/Tablet Sidebar */}
      <div
        className={`fixed left-0 right-0 top-16 w-full z-40 ${sidebarOpen ? 'block' : 'hidden'}`}
      >
        <DashboardSidebar
          role={role}
          closeSidebar={() => setSidebarOpen(false)}
          className={`h-auto bg-blue-900 text-white items-center justify-center py-4`}
          centered={sidebarOpen}
        />
      </div>

      {/* Main content */}
      <main
        className={`relative z-10 mt-16 p-6 lg:ml-64 ${sidebarOpen ? 'hidden lg:block' : 'block'}`}
      >
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
