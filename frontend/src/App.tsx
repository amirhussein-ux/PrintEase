import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Authentication, Admin, Customer } from "./pages";
import CreatePrintStore from "./pages/Dashboard/Owner/CreateShop";
import OrderManagement from "./pages/Dashboard/Owner/OrderManagement";
import TrackOrders from "./pages/Dashboard/Customer/TrackOrders";
import SelectShop from "./pages/Dashboard/Customer/SelectShop";
import ServiceManagement from "./pages/Dashboard/Owner/ServiceManagement";
import PrivateRoute from "./components/PrivateRoute";
import DashboardLayout from "./pages/Dashboard/shared_components/DashboardLayout";
import Inventory from "./pages/Dashboard/Owner/Inventory";
import Profile from "./pages/Dashboard/Customer/Profile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Authentication />} />
        <Route path="/signup" element={<Authentication />} />
        <Route path="/forgot-password" element={<Authentication />} />

        {/* Profile Page */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Protected Owner dashboard */}
        <Route
          path="/dashboard/owner"
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          }
        />

        {/* Protected Customer dashboard */}
        <Route
          path="/dashboard/customer"
          element={
            <PrivateRoute>
              <Customer />
            </PrivateRoute>
          }
        />

        {/* Customer: My Orders */}
        <Route
          path="/dashboard/my-orders"
          element={
            <PrivateRoute>
              <TrackOrders />
            </PrivateRoute>
          }
        />

        {/* Select shop picker for customers/guests */}
        <Route
          path="/customer/select-shop"
          element={
            <PrivateRoute>
              <SelectShop />
            </PrivateRoute>
          }
        />

        {/* Protected Create Print Store page */}
        <Route
          path="/owner/create-shop"
          element={
            <PrivateRoute>
              <CreatePrintStore />
            </PrivateRoute>
          }
        />

        {/* Service Management */}
        <Route
          path="/dashboard/services"
          element={
            <PrivateRoute>
              <ServiceManagement />
            </PrivateRoute>
          }
        />

        {/* Order Management (Owner) */}
        <Route
          path="/dashboard/orders"
          element={
            <PrivateRoute>
              <OrderManagement />
            </PrivateRoute>
          }
        />

        {/* Inventory (Owner) */}
        <Route
          path="/dashboard/inventory"
          element={
            <PrivateRoute>
              <DashboardLayout role="owner">
                <Inventory />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
