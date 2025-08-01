import React, { useEffect, useState } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const AdminNotificationPopup: React.FC = () => {
  const { notifications } = useNotificationContext();
  const [popup, setPopup] = useState<null | { orderId: string; customer: string }>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (
        latest.userType === 'admin' &&
        latest.type === 'info' &&
        latest.title === 'New Order Placed' &&
        latest.message.includes('order')
      ) {
        // Extract orderId and customer from message
        const match = latest.message.match(/#(\d+).*by (.+?)\./);
        if (match) {
          setPopup({ orderId: match[1], customer: match[2] });
        }
      }
    }
  }, [notifications]);

  if (!popup) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: '#1e3a8a',
        color: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: '18px 32px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '1.1rem',
        minWidth: 280,
        transition: 'opacity 0.3s',
      }}
      onClick={() => {
        navigate(`/admin/admin-dashboard?orderId=${popup.orderId}`);
        setPopup(null);
      }}
    >
      <span style={{ marginRight: 12 }}>🔔</span>
      New order placed by <b>{popup.customer}</b>! Click to view details.
    </div>
  );
};

export default AdminNotificationPopup;
