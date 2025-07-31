import React, { useState } from 'react';
import { Card, Button, Badge, Row, Col, Nav, Dropdown } from 'react-bootstrap';
import { useOrderContext } from '../contexts/OrdersContext';
import OrderDetailsModal from './modals/OrderDetailsModal';
import './TrackOrdersPage.css';

const statusSteps = [
  'Pending',
  'Processing',
  'Printing',
  'Quality Check',
  'Ready for Pick-up',
  'Completed',
];

const productFilters = [
  'All',
  'Sticker',
  'T-Shirt',
  'Motor Plate',
  'Notepad',
  'PVC ID',
  'Refrigerator Magnet',
  'Card',
  'Tarpaulin',
  'Mouse Pad',
  'Mug Printing',
  'LTFRB',
];

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
    case 'Ready for Pick-up':
      return 'secondary';
    case 'Completed':
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

const TrackOrdersPage: React.FC = () => {
  const { orders } = useOrderContext();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedProduct, setSelectedProduct] = useState('All');

  const filteredOrders = orders.filter((order) => {
    const statusMatch = activeTab === 'All' || order.status === activeTab;
    const productMatch =
      selectedProduct === 'All' || order.product?.toLowerCase().includes(selectedProduct.toLowerCase());
    return statusMatch && productMatch;
  });

  return (
    <div className="track-orders-page container py-4">
      <h2 className="text-center fw-bold mb-4" style={{ color: '#1e3a8a' }}>
        Track Your Orders
      </h2>

      <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap mb-4">
        {/* Product Filter Dropdown */}
        <Dropdown className="custom-dropdown">
          <Dropdown.Toggle
            id="dropdown-custom"
            style={{
              backgroundColor: '#1e3a8a',
              borderColor: '#1e3a8a',
              color: 'white',
              borderRadius: '30px',
              padding: '8px 20px',
            }}
          >
            Filter: {selectedProduct}
          </Dropdown.Toggle>

          <Dropdown.Menu style={{ borderRadius: '12px', padding: '8px 0' }}>
            {productFilters.map((product) => (
              <Dropdown.Item
                key={product}
                active={selectedProduct === product}
                onClick={() => setSelectedProduct(product)}
                style={{
                  padding: '8px 20px',
                  color: selectedProduct === product ? '#1e3a8a' : '#333',
                  backgroundColor: selectedProduct === product ? '#e0e7ff' : 'transparent',
                  fontWeight: selectedProduct === product ? 'bold' : 'normal',
                }}
              >
                {product}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* Status Tabs */}
        <Nav
          variant="pills"
          className="track-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || 'Pending')}
        >
          {statusSteps.map((status) => (
            <Nav.Item key={status}>
              <Nav.Link eventKey={status}>{status}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {/* Orders List */}
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
                    <Badge bg={getBadgeVariant(order.status || 'Pending')}>
                      {order.status || 'Pending'}
                    </Badge>
                  </div>

                  <p className="mb-1 mt-2"><strong>🛒 Product:</strong> {order.product}</p>
                  <p className="mb-1"><strong>📅 Date:</strong> {order.date}</p>
                  <p className="mb-1"><strong>🔢 Quantity:</strong> {order.quantity}</p>
                  <p className="mb-1"><strong>💵 Total:</strong> ₱{order.total.replace('₱', '')}</p>

                  <div className="mt-3 d-flex justify-content-center">
                    {getProgressDots(order.status || 'Pending')}
                  </div>

                  <div className="text-end mt-3">
                    <Button
                      size="sm"
                      style={{ backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          show={!!selectedOrder}
          onHide={() => setSelectedOrder(null)}
          order={selectedOrder}
          statusSteps={statusSteps}
        />
      )}
    </div>
  );
};

export default TrackOrdersPage;
