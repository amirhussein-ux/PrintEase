import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { PersonCircle, BoxArrowRight } from 'react-bootstrap-icons';
import './CustomerHeader.css';
import { useOrderContext } from '../contexts/OrdersContext';

const CustomerHeader: React.FC = () => {
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
    // ✅ Save logout flag to show toast on homepage
    localStorage.setItem('logoutToast', 'true');

    // ✅ Clear session-related data
    localStorage.removeItem('loggedInUsername');
    localStorage.removeItem('accountData');
    localStorage.removeItem('profileImage');

    clearOrders();

    // ✅ Navigate to homepage
    navigate('/');
  };

  return (
    <header className="customer-header">
      <div className="customer-header-container">
        {/* Navigation Tabs */}
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

        {/* User Dropdown */}
        <div className="customer-profile d-flex align-items-center gap-2">
          <span className="fw-bold" style={{ color: 'white' }}>
            Welcome, {username}
          </span>
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
        </div>
      </div>
    </header>
  );
};

export default CustomerHeader;