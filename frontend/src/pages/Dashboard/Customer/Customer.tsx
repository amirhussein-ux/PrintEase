import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../shared_components/DashboardLayout';
import api from '../../../lib/api';
import OrderPage from './OrderPage';
import toast, { Toaster } from 'react-hot-toast';

const Customer: React.FC = () => {
  const location = useLocation() as { state?: { storeId?: string } };
  const navigate = useNavigate();

  const [store, setStore] = useState<{ _id: string; name: string; logoFileId?: unknown } | null>(null);
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);
  const centerRef = useRef<HTMLDivElement | null>(null);

  const storeId = location.state?.storeId;

  // Load store
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!storeId) return;
      try {
        const res = await api.get('/print-store/list');
        const stores = (res.data || []) as Array<{ _id: string; name: string; logoFileId?: unknown }>;
        const found = stores.find((s) => s._id === storeId) || null;
        if (active) setStore(found);
      } catch (err) {
        if (active) setStore(null);
        toast.error('Failed to load store list');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [storeId]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!centerRef.current) return;
      if (!centerRef.current.contains(e.target as Node)) {
        setCenterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const centerContent = useMemo(() => {
    if (!store) return null;

    let logoId: string | undefined;
    const raw = store.logoFileId as unknown;
    if (typeof raw === 'string') {
      logoId = raw;
    } else if (raw && typeof raw === 'object') {
      const maybe = raw as { _id?: unknown; toString?: () => string };
      if (typeof maybe._id === 'string') logoId = maybe._id;
      else if (typeof maybe.toString === 'function') logoId = maybe.toString();
    }

    const initials = store.name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div ref={centerRef} className="relative">
        <button
          type="button"
          onClick={() => setCenterMenuOpen((v) => !v)}
          className="flex items-center gap-2 border-2 shadow border-gray-300 rounded-full px-3 py-1 hover:bg-gray-200"
          title="Selected shop"
        >
          {logoId ? (
            <img
              src={`${api.defaults.baseURL}/print-store/logo/${logoId}`}
              alt={`${store.name} logo`}
              className="h-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
          )}
          <span className="text-gray-900 font-semibold text-xl truncate max-w-[50vw]">
            {store.name}
          </span>
        </button>

        {centerMenuOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-30 py-1">
            <button
              className="w-full text-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setCenterMenuOpen(false);
                navigate('/customer/select-shop');
              }}
            >
              Change shop
            </button>
          </div>
        )}
      </div>
    );
  }, [store, centerMenuOpen, navigate]);

  return (
    <DashboardLayout role="customer" centerContent={centerContent}>
      <OrderPage />
      <Toaster position="top-right" reverseOrder={false} />
    </DashboardLayout>
  );
};

export default Customer;
