
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useOrders } from '../../hooks/useOrders';
import './Notifications.css';




const Notifications: React.FC = () => {
  const { notifications, setNotifications } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');
  const { orders } = useOrders();
  const [filteredByOrder, setFilteredByOrder] = useState(notifications);

  // Filter notifications to only those with existing orders (if notification has orderId)
  useEffect(() => {
    if (!orders || orders.length === 0) {
      setFilteredByOrder(notifications);
      return;
    }
    const orderIds = new Set(orders.map((o: any) => o.orderId || o._id));
    const filtered = notifications.filter((n: any) => {
      // If notification is not tied to an order, keep it
      if (!n.orderId) return true;
      // Some notifications may use _id instead of orderId
      return orderIds.has(n.orderId) || orderIds.has(n._id);
    });
    setFilteredByOrder(filtered);
  }, [notifications, orders]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return '📋'
      case 'warning':
        return '⚠️'
      case 'error':
        return '🚨'
      case 'success':
        return '✅'
      default:
        return '📋'
    }
  }

  const getNotificationClass = (type: string) => {
    return `notification-${type}`
  }

  // Button handlers

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleFilter = (f: 'all' | 'unread' | 'alerts') => {
    setFilter(f);
  };


  let filteredNotifications = filteredByOrder;
  if (filter === 'unread') {
    filteredNotifications = filteredByOrder.filter(n => !n.read);
  } else if (filter === 'alerts') {
    filteredNotifications = filteredByOrder.filter(n => n.type === 'warning' || n.type === 'error');
  }

  return (
    <div className="notifications-page" style={{ marginLeft: -20, marginTop: -20, marginRight: -20, marginBottom: -20, padding: '2px 2px', minHeight: '100vh', background: '#000000ff' }}>
      <main className="notifications-main">
        <header className="notifications-header">
          <h1>Notifications</h1>
          <div className="header-actions">
            <button className="mark-all-read" onClick={handleMarkAllRead}>Mark All Read</button>
            <div className="notification-filters">
              <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => handleFilter('all')}>All</button>
              <button className={`filter-btn${filter === 'unread' ? ' active' : ''}`} onClick={() => handleFilter('unread')}>Unread</button>
              <button className={`filter-btn${filter === 'alerts' ? ' active' : ''}`} onClick={() => handleFilter('alerts')}>Alerts</button>
            </div>
          </div>
        </header>

        <div className="notifications-container">
          <section className="notifications-section">
            <h2>System Notifications</h2>
            <div className="notifications-list">
              {filteredNotifications.length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', padding: 32 }}>No notifications.</div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div key={notification.id} className={`notification-item ${getNotificationClass(notification.type)}${notification.read ? ' notification-read' : ''}`}>
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                    <button className="notification-dismiss" onClick={() => handleDismiss(notification.id)}>×</button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Notifications
