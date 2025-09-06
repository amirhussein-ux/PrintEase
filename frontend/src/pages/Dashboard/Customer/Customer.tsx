import React from 'react'
import DashboardHeader from '../shared_components/dashboard_header'
import { useAuth } from '../../../context/useAuth'

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
