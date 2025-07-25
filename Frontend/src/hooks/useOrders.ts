import { useEffect, useState } from 'react';

export interface Order {
  _id: string;
  customerName: string;
  customerEmail?: string;
  guestToken?: string;
  productType: string;
  quantity: number;
  details: any;
  status: string;
  createdAt: string;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:8000/api/orders');
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        setOrders(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return { orders, loading, error };
}
