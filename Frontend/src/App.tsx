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

// ✅ Add Toast imports
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
  return (
    <Router>
      <OrdersProvider>
        <Routes>
          {/* Public Homepage */}
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

        {/* ✅ Global Toast Container */}
        <ToastContainer position="bottom-right" autoClose={3000} />
      </OrdersProvider>
    </Router>
  );
};

export default App;
