import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Authentication, Admin, Customer } from "./pages";
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
      </Routes>
    </Router>
  );
}

export default App;
