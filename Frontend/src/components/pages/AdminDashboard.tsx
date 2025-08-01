import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';


interface OrderCard {
  id: string;
  status: string;
  customer: string;
  details: string;
}


const AdminDashboard: React.FC = () => {
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [modalOrder, setModalOrder] = useState<OrderCard | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/orders');
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        // Map backend data to dashboard format
        setOrders(
          data.map((order: any) => ({
            id: order.orderId || order._id,
            status:
              order.status?.toLowerCase() === 'completed'
                ? 'Completed'
                : order.status?.toLowerCase() === 'in progress'
                ? 'In Progress'
                : order.status?.toLowerCase() === 'quality check'
                ? 'Quality Check'
                : order.status?.toLowerCase() === 'for pick-up'
                ? 'For Pick-Up'
                : order.status?.toLowerCase() === 'pending'
                ? 'Pending'
                : order.status || 'Pending',
            customer: `Customer: ${order.customerName || order.customerEmail || 'Guest'}`,
            details: getOrderDetailsString(order),
          }))
        );
      } catch (err) {
        setOrders([]);
      }
    };
    fetchOrders();
  }, []);

  // Helper to format details string
  function getOrderDetailsString(order: any): string {
    if (!order.details) return '';
    const details = order.details;
    // Try to show relevant info for each product type
    switch (order.productType) {
      case 'mug':
        return `Color: ${details.color || ''}, Delivery: ${details.deliveryMethod || ''}, Payment: ${details.paymentMethod || ''}`;
      case 'tshirt':
        return `Color: ${details.color || ''}, Size: ${details.size || ''}, Delivery: ${details.deliveryMethod || ''}, Payment: ${details.paymentMethod || ''}`;
      case 'ecobag':
        return `Color: ${details.color || ''}, Size: ${details.size || ''}, Delivery: ${details.deliveryMethod || ''}, Payment: ${details.paymentMethod || ''}`;
      case 'pen':
        return `Color: ${details.color || ''}, Ink: ${details.inkType || ''}, Delivery: ${details.deliveryMethod || ''}, Payment: ${details.paymentMethod || ''}`;
      case 'tarpaulin':
        return `Size: ${details.size || ''}, Delivery: ${details.deliveryMethod || ''}, Payment: ${details.paymentMethod || ''}`;
      case 'document':
        return `Paper: ${details.paperSize || ''}, Color: ${details.colorMode || ''}, Print: ${details.printType || ''}, Delivery: ${details.deliveryMethod || ''}, Payment: ${details.paymentMethod || ''}`;
      default:
        return JSON.stringify(details);
    }
  }


  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'In Progress':
        return 'status-progress';
      case 'Quality Check':
        return 'status-quality';
      case 'For Pick-Up':
        return 'status-pickup';
      case 'Pending':
        return 'status-pending';
      default:
        return '';
    }
  };


  // Update order status in backend and UI
  const handleStatusChange = async (id: string, newStatus: 'For Pick-Up' | 'Completed' | 'Quality Check' | 'In Progress' | 'Pending') => {
    try {
      // Map UI status to backend status value
      let backendStatus = newStatus.toLowerCase();
      const res = await fetch(`http://localhost:8000/api/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: backendStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const result = await res.json();
      // Update UI with new status from backend
      setOrders(orders => orders.map(order => order.id === id ? {
        ...order,
        status:
            result.order.status?.toLowerCase() === 'for pick-up'
            ? 'For Pick-Up'
            : result.order.status?.toLowerCase() === 'completed'
            ? 'Completed'
            : result.order.status?.toLowerCase() === 'quality check'
            ? 'Quality Check'
            : result.order.status?.toLowerCase() === 'in progress'
            ? 'In Progress'
            : result.order.status?.toLowerCase() === 'pending'
            ? 'Pending'
            : result.order.status || 'Pending'
      } : order));
    } catch (err) {
      // Optionally show error to user
      alert('Failed to update order status.');
    }
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
                <h3>{order.id}</h3>
                <select
                  className={`status ${getStatusClass(order.status)}`}
                  value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value as 'For Pick-Up' | 'Completed' | 'Quality Check' |'In Progress' | 'Pending')}
                  style={{ fontWeight: 600, textTransform: 'uppercase' }}
                >
                  <option value="For Pick-Up">FOR PICK-UP</option>
                  <option value="Completed">COMPLETED</option>
                  <option value="Quality Check">QUALITY CHECK</option>
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
              <p><strong>Order ID:</strong> {modalOrder.id}</p>
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