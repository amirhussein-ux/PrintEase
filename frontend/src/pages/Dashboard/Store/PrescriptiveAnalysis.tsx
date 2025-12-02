import { useState, useEffect } from 'react';
import DashboardLayout from '../shared_components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { isAxiosError } from 'axios';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ServicePerformance {
  serviceId: string;
  serviceName: string;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
  revenuePercentage: number;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  items?: string[];
  services?: string[];
}

interface AnalysisData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    topService: string;
    lowStockCount: number;
  };
  servicePerformance: ServicePerformance[];
  recommendations: Recommendation[];
  period: string;
}

function toErrorMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    return data?.message || e.message || fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

function money(v: number, currency: string = 'PHP') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    const prefix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₱';
    return `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'border-red-400 text-red-300 bg-red-400/10';
    case 'medium': return 'border-yellow-400 text-yellow-300 bg-yellow-400/10';
    case 'low': return 'border-blue-400 text-blue-300 bg-blue-400/10';
    default: return 'border-gray-400 text-gray-300 bg-gray-400/10';
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'high': return <ExclamationTriangleIcon className="h-5 w-5" />;
    case 'medium': return <LightBulbIcon className="h-5 w-5" />;
    case 'low': return <ClockIcon className="h-5 w-5" />;
    default: return <LightBulbIcon className="h-5 w-5" />;
  }
}

export default function PrescriptiveAnalysis() {
  const { user } = useAuth();
  const role: "owner" | "customer" = user?.role === "customer" ? "customer" : "owner";

  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAnalysis() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/analytics/prescriptive');
        if (cancelled) return;
        setAnalysisData(res.data);
      } catch (e: unknown) {
        if (!cancelled) setError(toErrorMessage(e, "Failed to load analysis"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAnalysis();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Prescriptive Sales Analysis</h1>
            <p className="text-gray-300 text-sm">AI-powered insights to optimize your business.</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-blue-800 bg-blue-800 p-6 animate-pulse">
                <div className="h-6 w-48 rounded bg-white/10 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-white/10" />
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role={role}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Prescriptive Sales Analysis</h1>
            <p className="text-gray-300 text-sm">AI-powered insights to optimize your business.</p>
          </div>
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analysisData) {
    return (
      <DashboardLayout role={role}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Prescriptive Sales Analysis</h1>
            <p className="text-gray-300 text-sm">AI-powered insights to optimize your business.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
            No analysis data available.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Prescriptive Sales Analysis</h1>
          <p className="text-gray-300 text-sm">AI-powered insights to optimize your business.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-blue-800 bg-blue-800 p-4">
            <div className="flex items-center gap-3">
              <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">{money(analysisData.summary.totalRevenue)}</div>
                <div className="text-sm text-gray-300">Total Revenue</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-800 bg-blue-800 p-4">
            <div className="flex items-center gap-3">
              <ShoppingCartIcon className="h-8 w-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{analysisData.summary.totalOrders}</div>
                <div className="text-sm text-gray-300">Total Orders</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-800 bg-blue-800 p-4">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="h-8 w-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">{money(analysisData.summary.avgOrderValue)}</div>
                <div className="text-sm text-gray-300">Avg Order Value</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-800 bg-blue-800 p-4">
            <div className="flex items-center gap-3">
              <ArrowTrendingUpIcon className="h-8 w-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">{analysisData.summary.topService}</div>
                <div className="text-sm text-gray-300">Top Service</div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Service Performance</h2>
          <div className="rounded-xl border border-blue-800 bg-blue-800 p-4">
            <div className="space-y-3">
              {analysisData.servicePerformance.slice(0, 5).map((service, index) => (
                <div key={service.serviceId} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-white">#{index + 1}</div>
                    <div>
                      <div className="font-semibold text-white">{service.serviceName}</div>
                      <div className="text-sm text-gray-300">{service.orderCount} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">{money(service.revenue)}</div>
                    <div className="text-sm text-gray-300">{service.revenuePercentage.toFixed(1)}% of revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">AI Recommendations</h2>
          <div className="space-y-4">
            {analysisData.recommendations.map((rec, index) => (
              <div key={index} className="rounded-xl border border-blue-800 bg-blue-800 p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getPriorityColor(rec.priority)}`}>
                    {getPriorityIcon(rec.priority)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{rec.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{rec.description}</p>
                    <p className="text-blue-300 text-sm font-medium">{rec.action}</p>
                    {rec.items && rec.items.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-400 mb-1">Items:</div>
                        <div className="flex flex-wrap gap-1">
                          {rec.items.map((item, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {rec.services && rec.services.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-400 mb-1">Services:</div>
                        <div className="flex flex-wrap gap-1">
                          {rec.services.map((service, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-white/10 text-gray-200">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Period Info */}
        <div className="text-center text-sm text-gray-400">
          Analysis period: {analysisData.period}
        </div>
      </div>
    </DashboardLayout>
  );
}
