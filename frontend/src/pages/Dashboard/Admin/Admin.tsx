import React from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import AdminDashboardContent from "./AdminDashboardContent";

const Admin: React.FC = () => {
  return (
    <DashboardLayout role="admin">
      <AdminDashboardContent />
    </DashboardLayout>
  );
};

export default Admin;
