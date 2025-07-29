import React, { useState } from 'react';
import './AdminDashboard.css';

interface OrderCard {
  id: string;
  status: 'Completed' | 'In Progress' | 'Pending';
  customer: string;
  details: string;
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
  ]);

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
    setOrders((orders) =>
      orders.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order
      )
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Order Management</h1>
        <div className="admin-header-user">
        </div>
      </div>

      <div className="orders-grid">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <h3>{order.id}</h3>
              <select
                className={`status ${getStatusClass(order.status)}`}
                value={order.status}
                onChange={(e) =>
                  handleStatusChange(order.id, e.target.value as 'Completed' | 'In Progress' | 'Pending')
                }
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
            <button
              className="view-details-btn"
              onClick={() => setModalOrder(order)}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOrder && (
        <div className="modal-overlay" onClick={() => setModalOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Order Details</h2>
            <p><strong>ID:</strong> {modalOrder.id}</p>
            <p><strong>Status:</strong> {modalOrder.status}</p>
            <p><strong>{modalOrder.customer}</strong></p>
            <p><strong>Details:</strong> {modalOrder.details}</p>
            <button className="close-btn" onClick={() => setModalOrder(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
