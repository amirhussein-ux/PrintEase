import { useState, useEffect } from 'react';
import api from '../lib/api';
import { isAxiosError } from 'axios';

interface BestSellingService {
  serviceId: string;
  serviceName: string;
  orderCount: number;
  revenue: number;
}

interface BestSellingServicesProps {
  storeId: string;
}

function toErrorMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    return data?.message || e.message || fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

export default function BestSellingServices({ storeId }: BestSellingServicesProps) {
  const [bestSelling, setBestSelling] = useState<BestSellingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBestSelling() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/analytics/best-selling/${storeId}`);
        if (cancelled) return;
        setBestSelling(res.data.bestSelling || []);
      } catch (e: unknown) {
        if (!cancelled) setError(toErrorMessage(e, "Failed to load best selling services"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBestSelling();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-white/20 rounded mb-2" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-white/20 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  if (bestSelling.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <h3 className="font-semibold text-lg">🔥 Best Selling Services</h3>
      </div>
      <div className="space-y-2">
        {bestSelling.slice(0, 3).map((service, index) => (
          <div key={service.serviceId} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <span className="font-medium">{service.serviceName}</span>
            </div>
            <div className="text-sm text-white/80">
              {service.orderCount} orders
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-white/70 text-center">
        Based on last 30 days performance
      </div>
    </div>
  );
}
