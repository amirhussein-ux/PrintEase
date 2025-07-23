import React from "react";
import { AppProvider } from "./context/AppContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLanding from "./landing/components/AppLanding";
import Dashboard from './components/pages/Dashboard';
import ServiceManagement from './components/pages/ServiceManagement';
import AdminDashboard from './components/pages/AdminDashboard';
import Notifications from './components/pages/Notifications';
import Layout from './components/layout/Layout';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Landing page (outside of layout) */}
          <Route path="/" element={<AppLanding />} />

          {/* All nested layout pages */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="service-management" element={<ServiceManagement />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
