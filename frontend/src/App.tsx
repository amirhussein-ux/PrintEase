import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Authentication, Admin, Customer } from "./pages";
import CreatePrintStore from "./pages/Dashboard/Owner/CreateShop";
import OrderManagement from "./pages/Dashboard/Owner/OrderManagement";
import TrackOrders from "./pages/Dashboard/Customer/TrackOrders";
import SelectShop from "./pages/Dashboard/Customer/SelectShop";
import ServiceManagement from "./pages/Dashboard/Owner/ServiceManagement";
import Inventory from "./pages/Dashboard/Owner/Inventory";
import Profile from "./pages/Dashboard/shared_components/Profile";
import PrivateRoute from "./components/PrivateRoute";

// Customer Pages
import Customize from "./pages/Dashboard/Customer/Customize";

// Shared Chat Views
import Chat from "./pages/Dashboard/shared_components/Chat";

function App() {
  return (
    <Router>
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
          path="/dashboard/inventory"
          element={
            <PrivateRoute>
              <Inventory />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/chat-owner"
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
      </Routes>
    </Router>
  );
}

export default App;
