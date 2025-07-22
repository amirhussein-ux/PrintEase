import React, { createContext, useContext, useState } from 'react';

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
}

// ✅ Create the context
const OrderContext = createContext<OrderContextType | undefined>(undefined);

// ✅ Hook to use context
export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrderContext must be used inside OrdersProvider');
  return context;
};

// ✅ Provider component
export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (order: Order) => {
    setOrders((prevOrders) => [...prevOrders, order]);
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder }}>
      {children}
    </OrderContext.Provider>
  );
};
