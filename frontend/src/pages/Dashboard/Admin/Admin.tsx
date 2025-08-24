import React from 'react';
import DashboardHeader from '../shared_components/dashboard_header';
import AdminDashboardContent from './AdminDashboardContent';
import { useAuth } from '../../../context/AuthContext';

const Admin: React.FC = () => {
  const { user } = useAuth();

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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <DashboardHeader 
        role={user.role as 'admin'} 
        userName={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Guest"} 
/>


      {/* Main content */}
      <main className="pt-16 p-6">
        <AdminDashboardContent />
      </main>
    </div>
  );
};

export default Admin;
