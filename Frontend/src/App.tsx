import React from 'react';
import { useAppContext } from './context/AppContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Admin/staff side
import AppLanding from './landing/components/AppLanding';
import Dashboard from './components/pages/Dashboard';
import ServiceManagement from './components/pages/ServiceManagement';
import AdminDashboard from './components/pages/AdminDashboard';
import Notifications from './components/pages/Notifications';
import Layout from './components/layout/Layout';

// Customer side
import Header from './landing/components/Header';
import Hero from './landing/components/Hero';
import About from './landing/components/About';
import Services from './landing/components/Services';
import Feedback from './landing/components/Feedback';
import Contact from './landing/components/Contact';

import CustomerHeader from './components/CustomerHeader';
import OrderPage from './pages/OrderPage';
import CustomizePage from './pages/CustomizePage';
import TrackOrdersPage from './pages/TrackOrdersPage';
import AccountPage from './pages/AccountPage';

import { OrdersProvider } from './contexts/OrdersContext';
import AdminNotificationPopup from './components/AdminNotificationPopup';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';

// ✅ Add Toast imports
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <NotificationProvider>
      <AppProvider>
        <OrdersProvider>
          <Router>
            <Routes>
              {/* Landing page */}
              <Route path="/" element={<AppLanding />} />
              {/* Admin/staff dashboard */}
              <Route path="/admin" element={<Layout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="service-management" element={<ServiceManagement />} />
                <Route path="admin-dashboard" element={<AdminDashboard />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
              {/* Public homepage */}
              <Route path="/home" element={<><Header /><Hero /><About /><Services /><Feedback /><Contact /></>} />
              {/* Customer dashboard pages */}
              <Route path="/customer/order" element={<><CustomerHeader /><OrderPage /></>} />
              <Route path="/customer/customize" element={<><CustomerHeader /><CustomizePage /></>} />
              <Route path="/customer/track" element={<><CustomerHeader /><TrackOrdersPage /></>} />
              <Route path="/customer/account" element={<><CustomerHeader /><AccountPage /></>} />
            </Routes>
            {/* Global admin notification popup */}
            <AdminNotificationPopup />
          </Router>
        </OrdersProvider>
      </AppProvider>
    </NotificationProvider>
  );
}
export default App;