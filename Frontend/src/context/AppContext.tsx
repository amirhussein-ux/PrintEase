import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Types
type Service = {
  icon: string;
  title: string;
  description: string;
};

type Order = {
  id: string;
  status: 'Completed' | 'In Progress' | 'Pending';
  customer: string;
  details: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read?: boolean;
};

interface AppContextType {
  services: Service[];
  addService: (service: Service) => void;
  updateService: (index: number, service: Service) => void;
  deleteService: (index: number) => void;

  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;

  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  addNotification: (notification: Notification) => void;
}

const initialServices: Service[] = [
  {
    icon: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=100&h=100&fit=crop",
    title: "QR Code Pickup",
    description: "Streamline business transactions with our QR code system. Customers can easily track and pick up their orders by scanning QR codes, ensuring a smooth and efficient pickup process."
  },
  {
    icon: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop",
    title: "Advanced Queue Management",
    description: "Optimize your workflow with our intelligent queue management system. Prioritize jobs, track progress, and ensure timely delivery with our advanced scheduling algorithms."
  },
  {
    icon: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&h=100&fit=crop",
    title: "Document Cloud Integration",
    description: "Seamlessly integrate with popular cloud services like Google Drive, Dropbox, and OneDrive. Access, print, and manage documents directly from your preferred cloud storage platform."
  },
  {
    icon: "/pmug.png",
    title: "Mug Designs",
    description: "Design personalized mugs with your own photos, names, or messages. Create unique, memorable gifts or branded merchandise with high-quality, full-color prints on durable ceramic mugs."
  },
  {
    icon: "/pen.png",
    title: "Pen Designs",
    description: "Design personalized pens with your own names, logos, or messages. Ideal for promotional giveaways or professional branding, these high-quality pens combine functionality with a personal touch."
  },
  {
    icon: "/ecobag.png",
    title: "Ecobag Designs",
    description: "Design personalized eco bags with custom text, logos, or artwork. Perfect for gifts, promotions, or everyday use, these reusable bags offer an eco-friendly way to showcase your brand or personal style."
  },
  {
    icon: "/shirt.png",
    title: "Shirt Designs",
    description: "Create personalized shirts with your own designs, logos, or messages. Ideal for events, teams, or everyday wear, these high-quality shirts combine comfort, style, and self-expression."
  }
];

const initialOrders: Order[] = [
  {
    id: '#12345',
    status: 'Completed',
    customer: 'Customer: John Smith',
    details: 'Color Print, 50 pages, A4 size'
  },
  {
    id: '#12346',
    status: 'In Progress',
    customer: 'Customer: Emily Johnson',
    details: 'Black & White Print, 25 pages'
  },
  {
    id: '#12347',
    status: 'Pending',
    customer: 'Customer: Michael Brown',
    details: 'Color Print, 100 pages, Letter size'
  }
];

const initialNotifications: Notification[] = [];
// --- Admin notification polling ---

import { useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

export const useAdminNotificationPolling = (setNotifications: any) => {
  // Only run for admin users
  const isAdmin = (() => {
    // Check localStorage for admin flag or username
    const accountData = localStorage.getItem('accountData');
    if (accountData) {
      try {
        const data = JSON.parse(accountData);
        return data.role === 'admin' || data.email === 'admin';
      } catch {
        return false;
      }
    }
    // Fallback: check username
    const username = localStorage.getItem('loggedInUsername');
    return username === 'admin';
  })();

  const fetchAdminNotifications = useCallback(async () => {
    let url = 'http://localhost:8000/api/notifications?recipient=admin';
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications((prev: any[]) => {
          const prevIds = new Set(prev.map((n) => n.id));
          const newNotifs = data.filter((n) => !prevIds.has(n.id));
          newNotifs.forEach((notif) => {
            toast.info(notif.message, { position: 'top-right', autoClose: 5000 });
          });
          const formattedNewNotifs = newNotifs.map((n) => ({ ...n, read: false }));
          return [...formattedNewNotifs, ...prev].slice(0, 20);
        });
      }
    } catch (err) {
      // Optionally log error
    }
  }, [setNotifications]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(fetchAdminNotifications, 5000); // Poll every 5s
    fetchAdminNotifications();
    return () => clearInterval(interval);
  }, [fetchAdminNotifications, isAdmin]);
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  // Enable admin notification polling (for admin users only)
  useAdminNotificationPolling(setNotifications);

  const addService = (service: Service) => {
    setServices(prev => [...prev, service]);
    addNotification({
      id: Date.now().toString(),
      title: 'New Service Added',
      message: `Service "${service.title}" was added successfully!`,
      time: 'Just now',
      type: 'success',
      read: false
    });
  };

  const updateService = (index: number, service: Service) => {
    setServices(prev => prev.map((s, i) => (i === index ? service : s)));
  };

  const deleteService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      services,
      addService,
      updateService,
      deleteService,
      orders,
      setOrders,
      notifications,
      setNotifications,
      addNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
