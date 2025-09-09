import React from 'react'
import DashboardLayout from '../shared_components/DashboardLayout'

const Customer: React.FC = () => {
  return (
    <DashboardLayout role="customer">
      <div className="text-gray-800">{/* Customer dashboard content goes here */}</div>
    </DashboardLayout>
  );
};

export default Customer;
