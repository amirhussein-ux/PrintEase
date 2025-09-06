<<<<<<< HEAD
import React from 'react'
import DashboardHeader from '../shared_components/dashboard_header'
import { useAuth } from '../../../context/useAuth'
=======
import React from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
>>>>>>> f3d04468c04bbb81a2947062f8eac47f04a57145

const Customer: React.FC = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout role="customer">
      <h1 className="text-2xl font-bold">Welcome, {user?.firstName}</h1>
      {/* Add customer-specific dashboard content here */}
    </DashboardLayout>
  );
};

export default Customer;
