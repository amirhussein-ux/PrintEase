import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout: React.FC = () => {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Outlet /> {/* This renders the child component like Dashboard, Admin, etc */}
      </main>
    </div>
  );
};

export default Layout;
