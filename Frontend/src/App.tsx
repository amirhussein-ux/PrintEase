import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Feedback from './components/Feedback';
import Contact from './components/Contact';

import CustomerHeader from './components/CustomerHeader';
import OrderPage from './pages/OrderPage';
import CustomizePage from './pages/CustomizePage';
import TrackOrdersPage from './pages/TrackOrdersPage';
import AccountPage from './pages/AccountPage';

import { OrdersProvider } from './contexts/OrdersContext';
import { ToastProvider } from './contexts/NotificationContext';

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
        <Route
          path="/"
          element={
            <>
              <Header />
              <Hero />
              <About />
              <Services />
              <Feedback />
              <Contact />
            </>
          }
        />

        {/* ✅ Customer Dashboard Pages */}
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

      {/* ✅ Always-visible Chat Support */}
      <ChatWidget />

      {/* ✅ Logout Toast on bottom-left */}
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
          <AppWrapper />
        </OrdersProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;