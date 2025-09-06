import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Authentication, Admin, Customer } from "./pages";
import CreatePrintStore from "./pages/Dashboard/Admin/CreateShop";
import SelectShop from "./pages/Dashboard/Customer/SelectShop";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Authentication />} />
        <Route path="/signup" element={<Authentication />} />
        <Route path="/forgot-password" element={<Authentication />} />

        {/* Protected Admin dashboard */}
        <Route
          path="/dashboard/admin"
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
        {/* Select shop picker for customers/guests */}
        <Route
          path="/customer/select-shop"
          element={
            <PrivateRoute>
              <SelectShop />
            </PrivateRoute>
          }
        />
        {/* Protected Create Print Store page*/}
        <Route
          path="/admin/create-shop"
          element={
            <PrivateRoute>
              <CreatePrintStore />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
