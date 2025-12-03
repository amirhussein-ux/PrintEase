import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Home, Authentication, Admin, Customer } from "./pages";
import CreatePrintStore from "./pages/Dashboard/Store/CreateShop";
import OrderManagement from "./pages/Dashboard/Store/OrderManagement";
import TrackOrders from "./pages/Dashboard/Customer/TrackOrders";
import SelectShop from "./pages/Dashboard/Customer/SelectShop";
import ServiceManagement from "./pages/Dashboard/Store/ServiceManagement";
import Inventory from "./pages/Dashboard/Store/Inventory";
import Profile from "./pages/Dashboard/shared_components/Profile";
import PrivateRoute from "./components/PrivateRoute";
import SavedDesigns from "./pages/Dashboard/Customer/SavedDesigns";
import { useEffect } from "react";

// Customer Pages
import Customize from "./pages/Dashboard/Customer/Customize";

// Shared Chat Views
import Chat from "./pages/Dashboard/shared_components/Chat";

// Debug component to catch errors
const DebugErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Add global error handler to catch the Transition error
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('A <Transition /> is used but it is missing')) {
        console.log('🛑 TRANSITION ERROR DETECTED!');
        console.log('Current URL:', window.location.pathname);
        console.log('Error details:', args);
        
        // Try to find which component is causing it
        const stackTrace = new Error().stack;
        console.log('Stack trace:', stackTrace);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
};

// Route Debugger
const RouteDebugger = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log(`📍 Current route: ${location.pathname}`);
  }, [location]);

  return null;
};

function App() {
  return (
    <DebugErrorBoundary>
      <Router>
        <RouteDebugger />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Authentication />} />
          <Route path="/signup" element={<Authentication />} />
          <Route path="/forgot-password" element={<Authentication />} />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* Owner Dashboard */}
          <Route
            path="/dashboard/owner"
            element={
              <PrivateRoute>
                <Admin />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/orders"
            element={
              <PrivateRoute>
                <OrderManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/services"
            element={
              <PrivateRoute>
                <ServiceManagement />
              </PrivateRoute>
            }
            />
            <Route
            path="/dashboard/services/add"
            element={
              <PrivateRoute>
                <ServiceManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/services/deleted"
            element={
              <PrivateRoute>
                <ServiceManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/inventory"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/inventory/analytics"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/inventory/products"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/inventory/employees"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/chat-store"
            element={
              <PrivateRoute>
                <Chat role="owner" />
              </PrivateRoute>
            }
          />
          <Route
            path="/owner/create-shop"
            element={
              <PrivateRoute>
                <CreatePrintStore />
              </PrivateRoute>
            }
          />

          {/* Customer Dashboard */}
          <Route
            path="/dashboard/customer"
            element={
              <PrivateRoute>
                <Customer />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/my-orders"
            element={
              <PrivateRoute>
                <TrackOrders />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/customize"
            element={
              <PrivateRoute>
                <Customize />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/chat-customer"
            element={
              <PrivateRoute>
                <Chat role="customer" />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/select-shop"
            element={
              <PrivateRoute>
                <SelectShop />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/saved-designs"
            element={
              <PrivateRoute>
                <SavedDesigns />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </DebugErrorBoundary>
  );
}

export default App;