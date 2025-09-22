import React, { useEffect, useState } from 'react';
import DashboardLayout from '../shared_components/DashboardLayout';
import OwnerDashboardContent from './OwnerDashboardContent';
import { useAuth } from '../../../context/useAuth';
import api from '../../../lib/api';
import { useNavigate } from 'react-router-dom';

const Owner: React.FC = () => {
  const { user } = useAuth();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPrintStore = async () => {
      if (!user || user.role !== "owner") {
        return;
      }
      try {
        await api.get("/print-store/mine");
        setHasStore(true);
      } catch (err: unknown) {
        let status: number | undefined;
        if (typeof err === "object" && err !== null && "response" in err) {
          const maybe = err as { response?: { status?: number } };
          status = maybe.response?.status;
        }
        if (status === 404) {
          setHasStore(false);
        } else {
          setHasStore(true);
        }
      } 
    };
    checkPrintStore();
  }, [user]);

  useEffect(() => {
    if (user && user.role === "owner" && hasStore === false) {
      navigate("/owner/create-shop");
    }
  }, [user, hasStore, navigate]);

 
  return (
    <DashboardLayout role={"owner"}>
      <OwnerDashboardContent />
    </DashboardLayout>
  );
};

export default Owner;
