import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './CustomerHeader.css';

const CustomerHeader: React.FC = () => {
  const underlineRef = useRef<HTMLDivElement | null>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const location = useLocation();
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeIndex = ['/customer/order', '/customer/customize', '/customer/track'].indexOf(location.pathname);
    const activeLink = navRefs.current[activeIndex];
    if (activeLink && underlineRef.current) {
      const { offsetLeft, offsetWidth } = activeLink;
      setUnderlineStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [location]);

  return (
    <header className="customer-header">
      <div className="customer-header-container">
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
        <div className="customer-profile">
          <NavLink to="/customer/account">Account</NavLink>
        </div>
      </div>
    </header>
  );
};

export default CustomerHeader;
