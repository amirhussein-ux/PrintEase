import React, { useState } from 'react';
import { Card, Button, Badge, Row, Col, Nav } from 'react-bootstrap';
import { useOrderContext } from '../contexts/OrdersContext';
import OrderDetailsModal from './modals/OrderDetailsModal';
import './TrackOrdersPage.css';

const statusSteps = [
  'Order Placed',
  'Processing',
  'Printing',
  'Quality Check',
  'Shipped',
  'Delivered',
];

const TrackOrdersPage: React.FC = () => {
  const { orders } = useOrderContext();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('All');

  const filteredOrders =
    activeTab === 'All' ? orders : orders.filter((order) => order.status === activeTab);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Processing':
        return 'info';
      case 'Printing':
        return 'primary';
      case 'Quality Check':
        return 'dark';
      case 'Shipped':
        return 'secondary';
      case 'Delivered':
        return 'success';
      default:
        return 'light';
    }
  };

  const getProgressDots = (status: string) => {
    const currentIndex = statusSteps.indexOf(status);
    return (
      <div className="timeline-container">
        {statusSteps.map((step, index) => (
          <div
            key={step}
            className={`timeline-dot ${index <= currentIndex ? 'active' : ''}`}
            title={step}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="track-orders-page container py-4">
      <h2 className="text-center fw-bold mb-4" style={{ color: '#1e3a8a' }}>Track Your Orders
      </h2>


      {/* Tabs */}
      <Nav
        variant="pills"
        className="justify-content-center mb-4 track-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'All')}
      >
        {['All', 'Pending', 'Processing', 'Printing', 'Quality Check', 'Shipped', 'Delivered'].map((status) => (
          <Nav.Item key={status}>
            <Nav.Link eventKey={status}>{status}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {/* Order Cards */}
      <Row xs={1} md={2} className="g-4">
        {filteredOrders.length === 0 ? (
          <p className="text-center">No orders found.</p>
        ) : (
          filteredOrders.map((order) => (
            <Col key={order.orderId}>
              <Card className="shadow-sm order-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">Order #{order.orderId}</h5>
                    <Badge bg={getBadgeVariant(order.status)}>{order.status}</Badge>
                  </div>

                  <p className="mb-1 mt-2"><strong>🛒 Product:</strong> {order.product}</p>
                  <p className="mb-1"><strong>📅 Date:</strong> {order.date}</p>
                  <p className="mb-1"><strong>🔢 Quantity:</strong> {order.quantity}</p>
                  <p className="mb-1"><strong>💵 Total:</strong> ₱{order.total.replace('₱', '')}</p>

                  {/* Timeline Dots */}
                  <div className="mt-3 d-flex justify-content-center">
                    {getProgressDots(order.status)}
                  </div>

                  <div className="text-end mt-3">
                    <Button size="sm" variant="primary" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

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
