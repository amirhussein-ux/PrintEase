import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import './Notifications.css';

const Notifications: React.FC = () => {
  const { notifications, setNotifications } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return '📋';
      case 'warning': return '⚠️';
      case 'error': return '🚨';
      case 'success': return '✅';
      default: return '📋';
    }
  };

  const getNotificationClass = (type: string) => {
    return `notification-${type}`;
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleFilter = (f: 'all' | 'unread' | 'alerts') => {
    setFilter(f);
  };

  let filteredNotifications = notifications;
  if (filter === 'unread') {
    filteredNotifications = notifications.filter(n => !n.read);
  } else if (filter === 'alerts') {
    filteredNotifications = notifications.filter(n => n.type === 'warning' || n.type === 'error');
  }

  return (
    <div className="notifications-page">
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
              <div className="no-notifs">No notifications.</div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${getNotificationClass(notification.type)}${notification.read ? ' notification-read' : ''}`}
                >
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
    </div>
  );
};

export default Notifications;
