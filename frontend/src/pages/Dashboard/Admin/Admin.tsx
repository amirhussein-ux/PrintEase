import React, { useEffect, useState } from 'react';
import DashboardHeader from '../shared_components/dashboard_header';
import AdminDashboardContent from './AdminDashboardContent';
import { useAuth } from '../../../context/useAuth';
import type { User } from '../../../context/authContextCore';
import api from '../../../lib/api';
import { useNavigate } from 'react-router-dom';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPrintStore = async () => {
  if (!user || user.role !== 'owner') {
        setLoading(false);
        return;
      }
      try {
        await api.get('/print-store/mine');
        setHasStore(true);
      } catch (err: unknown) {
        // only if 404 (no shop)
        let status: number | undefined;
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const maybe = err as { response?: { status?: number } };
          status = maybe.response?.status;
        }
        if (status === 404) {
          setHasStore(false);
        } else {
          // other errors -> treat as error
          setHasStore(true);
        }
      } finally {
        setLoading(false);
      }
    };
    checkPrintStore();
  }, [user]);

  // redirect owner without store
  useEffect(() => {
    if (user && user.role === 'owner' && hasStore === false) {
      navigate('/owner/create-shop');
    }
  }, [user, hasStore, navigate]);

  if (!user || loading || hasStore === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent border-solid rounded-full animate-spin mb-4"></div>
          <p className="text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  if (user.role === 'owner' && !hasStore) {
    // navigation handled in effect above; render nothing during redirect
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* header */}
      <DashboardHeader
        role={user.role as 'owner'}
        userName={(() => {
          // name fallback: full, email local-part, Guest
          const u = user as User;
          const full = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
          if (full) return full;
          if (u?.email) return u.email.split('@')[0];
          return 'Guest';
        })()}
      />

      {/* main */}
      <main className="pt-16 p-6">
        <AdminDashboardContent sidebarOpen={false} />
      </main>
    </div>
  );
};

export default Admin;
