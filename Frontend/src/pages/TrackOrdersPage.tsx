import React, { useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import OrderDetailsModal from './modals/OrderDetailsModal';
import { useOrderContext } from '../contexts/OrdersContext';
import './TrackOrdersPage.css';

// Optional: Define a type if you want better type safety
interface Order {
  orderId: string;
  date: string;
  product: string;
  quantity: number;
  total: string;
  status: string;
  deliveryMethod: string;
  deliveryAddress: string;
  paymentMethod: string;
  notes: string;
  timeline: Record<string, string>;
}

const TrackOrdersPage: React.FC = () => {
  const { orders } = useOrderContext();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div className="track-orders-page">
      <h1 className="track-orders-title">📦 Track Your Orders</h1>

      {orders.length === 0 ? (
        <div className="no-orders-message">
          <p className="text-center text-muted mt-5">You haven’t placed any orders yet.</p>
        </div>
      ) : (
        <Table striped bordered hover responsive className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId}>
                <td>{order.orderId}</td>
                <td>{order.date}</td>
                <td>{order.product}</td>
                <td>{order.quantity}</td>
                <td>{order.total}</td>
                <td>{order.status}</td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          show={!!selectedOrder}
          onHide={() => setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}
    </div>
  );
};

export default TrackOrdersPage;
