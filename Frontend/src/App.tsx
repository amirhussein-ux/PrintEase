import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import LandingWrapper from './components/LandingWrapper';
import CustomerHeader from './components/CustomerHeader';
import OrderPage from './pages/OrderPage';
import CustomizePage from './pages/CustomizePage';
import TrackOrdersPage from './pages/TrackOrdersPage';
import AccountPage from './pages/AccountPage';

import Dashboard from './pages/Dashboard';
import ServiceManagement from './pages/ServiceManagement';
import Notifications from './pages/Notifications';
import ChatSupport from './pages/ChatSupport';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/admin/Layout';

import { OrdersProvider } from './contexts/OrdersContext';
import { ToastProvider } from './contexts/NotificationContext';
import { AppProvider } from './contexts/AppContext';

import { Toast, ToastContainer as BootstrapToastContainer } from 'react-bootstrap';
import ChatWidget from './components/ChatWidget';

const AppWrapper: React.FC = () => {
  const location = useLocation();
  const [showLogoutToast, setShowLogoutToast] = useState(false);

  useEffect(() => {
    const isAtLanding = location.pathname === '/';
    const shouldShow = localStorage.getItem('logoutToast') === 'true';

    if (isAtLanding && shouldShow) {
      setShowLogoutToast(true);
      localStorage.removeItem('logoutToast');
    }
  }, [location.pathname]);

  return (
    <>
      <Routes>
        {/* ✅ Landing Page */}
        <Route path="/" element={<LandingWrapper />} />

        {/* ✅ Admin Routes with Sidebar Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/service-management" element={<ServiceManagement />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/chat-support" element={<ChatSupport />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* ✅ Customer Routes */}
        <Route
          path="/customer/order"
          element={
            <>
              <CustomerHeader />
              <OrderPage />
            </>
          }
        />
        <Route
          path="/customer/customize"
          element={
            <>
              <CustomerHeader />
              <CustomizePage />
            </>
          }
        />
        <Route
          path="/customer/track"
          element={
            <>
              <CustomerHeader />
              <TrackOrdersPage />
            </>
          }
        />
        <Route
          path="/customer/account"
          element={
            <>
              <CustomerHeader />
              <AccountPage />
            </>
          }
        />
      </Routes>

      {/* ✅ Always-visible Chat Widget */}
      <ChatWidget />

      {/* ✅ Logout Toast Notification */}
      <BootstrapToastContainer position="bottom-start" className="p-3">
        <Toast
          bg="success"
          onClose={() => setShowLogoutToast(false)}
          show={showLogoutToast}
          delay={3000}
          autohide
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className="text-white fw-bold">
            Successfully logged out.
          </Toast.Body>
        </Toast>
      </BootstrapToastContainer>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <OrdersProvider>
          <AppProvider>
            <AppWrapper />
          </AppProvider>
        </OrdersProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;
