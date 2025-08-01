import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
  orderId?: string;
  userType?: 'admin' | 'customer';
  recipient?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Poll admin notifications if admin is logged in
    useEffect(() => {
      // Determine user type and recipient
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      let recipient = '';
      let userType: 'admin' | 'customer' | undefined = undefined;
      if (isAdmin) {
        recipient = 'admin';
        userType = 'admin';
      } else {
        // For guests or logged-in customers, use guestToken or username/email as recipient
        recipient = localStorage.getItem('guestToken') || localStorage.getItem('loggedInUsername') || localStorage.getItem('loggedInEmail') || '';
        userType = 'customer';
      }

      if (!recipient) return;

      const fetchNotifications = async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/notifications?recipient=${encodeURIComponent(recipient)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (Array.isArray(data)) {
            // Strictly filter: Only show notifications for this userType and recipient
            const filtered = data.filter(n => {
              // Only show admin notifications to admin, and customer notifications to customer
              if (userType === 'admin') {
                return n.userType === 'admin' && n.recipient === recipient;
              } else {
                return n.userType === 'customer' && n.recipient === recipient;
              }
            });
            setNotifications((prev) => {
              const prevIds = new Set(prev.map((n) => n.id));
              const newNotifs = filtered.filter((n) => !prevIds.has(n.id));
              // Mark all new notifications as unread
              return [...newNotifs.map(n => ({ ...n, read: false })), ...prev];
            });
          }
        } catch (err) {
          // Optionally handle error
        }
      };
      const interval = setInterval(fetchNotifications, 5000);
      fetchNotifications();
      return () => clearInterval(interval);
    }, []);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
