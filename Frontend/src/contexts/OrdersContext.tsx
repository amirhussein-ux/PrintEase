import React, { createContext, useContext, useState } from 'react';

interface Order {
  orderId: string;
  date: string;
  product: string;
  type?: string;
  size?: string;
  quantity: number;
  total: string;
  status: string;
  deliveryMethod: string;
  deliveryAddress: string;
  paymentMethod: string;
  notes: string;
  file?: File;
  sheets?: number;
  timeline: Record<string, string>;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, newStatus: string) => void;
  clearOrders: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrderContext must be used inside OrdersProvider');
  return context;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (order: Order) => {
    const orderWithStatus = {
      ...order,
      status: order.status || 'Pending',
      date: new Date().toLocaleString(), // Set the date when the order is placed
    };
    setOrders((prevOrders) => [...prevOrders, orderWithStatus]);
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.orderId === orderId
          ? {
              ...order,
              status: newStatus,
              timeline: {
                ...order.timeline,
                [newStatus]: new Date().toLocaleString()
              }
            }
          : order
      )
    );
  };

  const clearOrders = () => {
    setOrders([]);
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, clearOrders }}>
      {children}
    </OrderContext.Provider>
  );
};
