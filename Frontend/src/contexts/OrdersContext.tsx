import React, { createContext, useContext, useState, useEffect } from 'react';

// ✅ Define the Order interface
interface Order {
  orderId: string;
  date: string;
  product: string;
  quantity: number;
  total: string;
  status: string;
  deliveryMethod: string;
  deliveryAddress: string;
  paymentMethod: string;
  notes: string;
  timeline: Record<string, string>;
}

// ✅ Define the context type
interface OrderContextType {
  orders: Order[];
  addOrder: (order: Order) => void;
  clearOrders: () => void; // 👈 Added this
}

// ✅ Create the context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// ✅ Hook to use context
export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrderContext must be used inside OrdersProvider');
  return context;
};

// Helper to get guestToken from localStorage
const getGuestToken = () => localStorage.getItem('guestToken');

// Helper to get customerEmail from localStorage (if you store it there)
const getCustomerEmail = () => {
  const accountData = localStorage.getItem('accountData');
  if (accountData) {
    try {
      const data = JSON.parse(accountData);
      return data.email || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      let url = 'http://localhost:8000/api/orders';
      const email = getCustomerEmail();
      const guestToken = getGuestToken();
      if (email) {
        url += `?customerEmail=${encodeURIComponent(email)}`;
      } else if (guestToken) {
        url += `?guestToken=${encodeURIComponent(guestToken)}`;
      } else {
        setOrders([]);
        return;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        setOrders(data.map((order: any) => ({
          orderId: order._id,
          date: new Date(order.createdAt).toLocaleDateString(),
          product: order.productType,
          quantity: order.quantity,
          total: order.details?.total ? order.details.total : '₱0',
          status: order.status,
          deliveryMethod: order.details?.deliveryMethod || '',
          deliveryAddress: order.details?.deliveryAddress || '',
          paymentMethod: order.details?.paymentMethod || '',
          notes: order.details?.notes || '',
          timeline: order.details?.timeline || {},
        })));
      } catch (err) {
        setOrders([]);
      }
    };
    fetchOrders();
  }, []);

  const addOrder = (order: Order) => {
    setOrders((prevOrders) => [...prevOrders, order]);
  };

  const clearOrders = () => {
    setOrders([]); // 👈 This clears all orders
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, clearOrders }}>
      {children}
    </OrderContext.Provider>
  );
};
