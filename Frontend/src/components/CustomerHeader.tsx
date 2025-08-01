
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { PersonCircle, BoxArrowRight } from 'react-bootstrap-icons';
import './CustomerHeader.css'; // Uncomment if the file exists */
import { useOrderContext } from '../contexts/OrdersContext';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// Duplicate import removed

const CustomerHeader: React.FC = () => {
  const { notifications, setNotifications } = useAppContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Helper to get customerEmail or guestToken
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
  const getGuestToken = () => localStorage.getItem('guestToken');

  // Poll notifications from backend
  const fetchNotifications = useCallback(async () => {
    let url = 'http://localhost:8000/api/notifications';
    const email = getCustomerEmail();
    const guestToken = getGuestToken();
    if (email) {
      url += `?recipient=${encodeURIComponent(email)}`;
    } else if (guestToken) {
      url += `?recipient=${encodeURIComponent(guestToken)}`;
    } else {
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      // Filter: Only show notifications for this userType and recipient
      const recipient = email || guestToken;
      const filtered = Array.isArray(data)
        ? data.filter((n: any) => n.userType === 'customer' && n.recipient === recipient)
        : [];
      setNotifications(filtered);
    } catch (err) {
      // Ignore errors
    }
  }, [setNotifications]);


  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => { fetchNotifications(); }, 5000);
    fetchNotifications(); // initial fetch
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Only use filtered notifications for badge and dropdown
  const email = getCustomerEmail();
  const guestToken = getGuestToken();
  const recipient = email || guestToken;
  const customerNotifications = notifications.filter(
    (n: any) => n.userType === 'customer' && n.recipient === recipient
  );
  const unreadCount = customerNotifications.filter((n: any) => !n.read).length;

  const handleNotificationClick = (notif: any) => {
    setNotifications(
      notifications.map((n: any) => n.id === notif.id ? { ...n, read: true } : n)
    );
    if (notif.orderId) {
      navigate(`/customer/track-orders/${notif.orderId}`);
    }
  };

  const underlineRef = useRef<HTMLDivElement | null>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  const username = localStorage.getItem('loggedInUsername') || 'Guest';
  const { clearOrders } = useOrderContext();

  useEffect(() => {
    const activeIndex = ['/customer/order', '/customer/customize', '/customer/track'].indexOf(location.pathname);
    const activeLink = navRefs.current[activeIndex];
    if (activeLink && underlineRef.current) {
      const { offsetLeft, offsetWidth } = activeLink;
      setUnderlineStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('loggedInUsername');
    localStorage.removeItem('accountData');
    localStorage.removeItem('profileImage'); // ✅ Clear uploaded profile picture
    clearOrders(); // ✅ Clear all placed orders
    navigate('/');
  };

  return (
    <>
      <header className="customer-header">
        <div className="customer-header-container">
          {/* Navigation */}
          <nav className="customer-nav-center">
            <NavLink
            to="/customer/order"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            ref={(el) => (navRefs.current[0] = el)}
          >
            Order
          </NavLink>
          <NavLink
            to="/customer/customize"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            ref={(el) => (navRefs.current[1] = el)}
          >
            Customize
          </NavLink>
          <NavLink
            to="/customer/track"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            ref={(el) => (navRefs.current[2] = el)}
          >
            Track Orders
          </NavLink>
            <div
              className="nav-underline"
              ref={underlineRef}
              style={{
                left: underlineStyle.left,
                width: underlineStyle.width,
              }}
            />
          </nav>

          {/* Welcome + Dropdown (hide dropdown for guests) */}
          <div className="customer-profile d-flex align-items-center gap-2">
            <span className="fw-bold" style={{ color: 'white' }}>Welcome, {username}</span>
            {username !== 'Guest' && (
              <Dropdown align="end">
                <Dropdown.Toggle
                  as="span"
                  style={{ cursor: 'pointer', color: 'white' }}
                  className="d-flex align-items-center"
                >
                  <PersonCircle size={24} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-animated">
                  <Dropdown.Item onClick={() => navigate('/customer/account')}>
                    <PersonCircle className="me-2" /> Profile
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleLogout}>
                    <BoxArrowRight className="me-2" /> Log Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Notification Bell */}
            <div className="notification-bell-container">
              <button
                className="notification-bell"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Notifications"
              >
                <span role="img" aria-label="bell">🔔</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {showDropdown && (
                <div className="notification-dropdown" ref={dropdownRef}>
                  <h4>Notifications</h4>
                  {customerNotifications.length === 0 ? (
                    <div className="notification-empty">No notifications</div>
                  ) : (
                    <ul className="notification-list">
                      {customerNotifications.map(notif => (
                        <li
                          key={notif.id}
                          className={`notification-item${notif.read ? ' read' : ''}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="notification-title">{notif.title}</div>
                          <div className="notification-message">{notif.message}</div>
                          <div className="notification-time">{notif.time}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* ToastContainer must be ToastContainer, not toast.Container */}
    </>
  );
};

export default CustomerHeader;
