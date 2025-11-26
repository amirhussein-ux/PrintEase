import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../shared_components/DashboardLayout';
import DashboardContent from './Dashboard';
import { useAuth } from "../../../context/AuthContext";
import api from '../../../lib/api';
import { useNavigate } from 'react-router-dom';

const DashboardAccessValidation: React.FC = () => {
  const { user } = useAuth();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const navigate = useNavigate();
  const allowedEmployeeRoles = useMemo(() => new Set(["Operations Manager", "Front Desk", "Inventory & Supplies", "Printer Operator"]), []);
  const isOwnerUser = user?.role === "owner";
  const isStoreStaff = user?.role === "employee" && !!user.employeeRole && allowedEmployeeRoles.has(user.employeeRole);

  useEffect(() => {
    const checkPrintStore = async () => {
      if (!user || (!isOwnerUser && !isStoreStaff)) {
        setHasStore(null);
        setStoreError(null);
        return;
      }
      try {
        await api.get("/print-store/mine");
        setHasStore(true);
        setStoreError(null);
      } catch (err: unknown) {
        let status: number | undefined;
        if (typeof err === "object" && err !== null && "response" in err) {
          const maybe = err as { response?: { status?: number } };
          status = maybe.response?.status;
        }
        if (status === 404) {
          setHasStore(false);
          setStoreError(isOwnerUser ? null : "You are not assigned to a print store yet.");
        } else {
          setHasStore(false);
          setStoreError("Failed to load store information.");
        }
      } 
    };
    checkPrintStore();
  }, [user, isOwnerUser, isStoreStaff]);

  useEffect(() => {
    if (isOwnerUser && hasStore === false) {
      navigate("/owner/create-shop");
    }
  }, [isOwnerUser, hasStore, navigate]);

  if (!user || (!isOwnerUser && !isStoreStaff)) {
    return (
      <DashboardLayout role={"owner"}>
        <div className="max-w-4xl mx-auto text-center text-white mt-12">
          <p>You do not have access to this dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (hasStore === false && !isOwnerUser) {
    return (
      <DashboardLayout role={"owner"}>
        <div className="max-w-3xl mx-auto text-center text-white mt-12">
          <p className="font-semibold text-lg">{storeError || "No print store found."}</p>
          <p className="text-sm text-gray-200 mt-2">Please contact the store owner to be assigned.</p>
        </div>
      </DashboardLayout>
    );
  }

 
  return (
    <DashboardLayout role={"owner"}>
      <DashboardContent />
    </DashboardLayout>
  );
};

export default DashboardAccessValidation;
