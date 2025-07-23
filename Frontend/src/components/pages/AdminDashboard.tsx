import React, { useState } from 'react'
import './AdminDashboard.css'

interface OrderCard {
  id: string
  status: 'Completed' | 'In Progress' | 'Pending'
  customer: string
  details: string
}

const AdminDashboard: React.FC = () => {
  const [orders, setOrders] = useState<OrderCard[]>([
    {
      id: '#12345',
      status: 'Completed',
      customer: 'Customer: John Smith',
      details: 'Color Print, 50 pages, A4 size'
    },
    {
      id: '#12346',
      status: 'In Progress',
      customer: 'Customer: Emily Johnson',
      details: 'Black & White Print, 25 pages'
    },
    {
      id: '#12347',
      status: 'Pending',
      customer: 'Customer: Michael Brown',
      details: 'Color Print, 100 pages, Letter size'
    }
  ])

  const [modalOrder, setModalOrder] = useState<OrderCard | null>(null);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'In Progress':
        return 'status-progress';
      case 'Pending':
        return 'status-pending';
      default:
        return '';
    }
  };

  const handleStatusChange = (id: string, newStatus: 'Completed' | 'In Progress' | 'Pending') => {
    setOrders(orders => orders.map(order => order.id === id ? { ...order, status: newStatus } : order));
  };

  return (
    <div className="admin-dashboard-page">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>📄 PrintEase Admin Dashboard</h2>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">📊 Dashboard</a>
          <a href="#" className="nav-item">🔧 Services</a>
          <a href="#" className="nav-item">📦 Orders</a>
          <a href="#" className="nav-item">🔔 Notifications</a>
          <a href="#" className="nav-item">👤 User Profile</a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <span>PrintEase</span>
          </div>
          <div className="header-right">
            <span>👤</span>
            <span>John Doe</span>
          </div>
        </header>

        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <h3>Order {order.id}</h3>
                <select
                  className={`status ${getStatusClass(order.status)}`}
                  value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value as 'Completed' | 'In Progress' | 'Pending')}
                  style={{ fontWeight: 600, textTransform: 'uppercase' }}
                >
                  <option value="Completed">COMPLETED</option>
                  <option value="In Progress">IN PROGRESS</option>
                  <option value="Pending">PENDING</option>
                </select>
              </div>
              <div className="order-details">
                <p className="customer">{order.customer}</p>
                <p className="details">{order.details}</p>
              </div>
              <button className="view-details-btn" onClick={() => setModalOrder(order)}>View Details</button>
            </div>
          ))}
        </div>

        {/* Modal for order details */}
        {modalOrder && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
            onClick={() => setModalOrder(null)}
          >
            <div style={{
              background: '#222',
              color: '#fff',
              borderRadius: 12,
              padding: 32,
              minWidth: 320,
              maxWidth: '90vw',
              boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0 }}>Order Details</h2>
              <p><strong>ID:</strong> {modalOrder.id}</p>
              <p><strong>Status:</strong> {modalOrder.status}</p>
              <p><strong>{modalOrder.customer}</strong></p>
              <p><strong>Details:</strong> {modalOrder.details}</p>
              <button style={{ marginTop: 16, padding: '8px 18px', borderRadius: 6, border: 'none', background: '#4a9eff', color: '#fff', fontWeight: 500, cursor: 'pointer' }} onClick={() => setModalOrder(null)}>Close</button>
            </div>
          </div>
        )}

        <footer className="admin-footer">
          <p>© 2024 PrintEase</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Us</a>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default AdminDashboard
