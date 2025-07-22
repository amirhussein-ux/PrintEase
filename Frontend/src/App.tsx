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

// 🔥 Add this import:
import { OrdersProvider } from './contexts/OrdersContext'; // You'll create this next

const App: React.FC = () => {
  return (
    <Router>
      {/* 👇 Wrap everything with OrdersProvider */}
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
      </OrdersProvider>
    </Router>
  );
};

export default App;
