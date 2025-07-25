import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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

// ✅ Toast imports
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ ChatWidget import
import ChatWidget from './components/ChatWidget';

const App: React.FC = () => {
  return (
    <Router>
      <OrdersProvider>
        <Routes>
          {/* ✅ Public Landing Page with Chat */}
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
                <ChatWidget /> {/* ✅ Chat added here */}
              </>
            }
          />

          {/* Customer Dashboard Pages */}
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

        {/* Global Toasts */}
        <ToastContainer position="bottom-right" autoClose={3000} />
      </OrdersProvider>
    </Router>
  );
};

export default App;
