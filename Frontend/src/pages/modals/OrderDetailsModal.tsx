import React from 'react';
import { Modal } from 'react-bootstrap';
import './OrderDetailsModal.css'; // Import your CSS file

interface OrderTimeline {
  [step: string]: string;
}

interface OrderDetails {
  orderId?: string;
  date?: string;
  product: string;
  quantity: number;
  total: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  paymentMethod: string;
  timeline?: OrderTimeline;
}

interface OrderDetailsModalProps {
  show: boolean;
  onHide: () => void;
  order: OrderDetails;
}

// Updated tracking stages
const TRACKING_STAGES = [
  'Pending',
  'Processing',
  'Printing',
  'Quality Check',
  'For Pick-up',
  'Completed',
];

// Format date and time without seconds
const getCurrentDateTime = (): string => {
  return new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).replace(',', ' -');
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ show, onHide, order }) => {
  const timelineData = TRACKING_STAGES.reduce((acc: OrderTimeline, stage) => {
    acc[stage] =
      order.timeline?.[stage] ??
      (stage === 'Pending' ? getCurrentDateTime() : 'Pending');
    return acc;
  }, {});

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order Details</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Order ID:</strong> {order.orderId || 'N/A'}</p>
        <p><strong>Date:</strong> {order.date || 'N/A'}</p>
        <p><strong>Product:</strong> {order.product}</p>
        <p><strong>Quantity:</strong> {order.quantity}</p>
        <p><strong>Total:</strong> ₱{order.total.replace('₱', '')}</p>
        {order.deliveryMethod === 'Delivery' && (
          <p><strong>Delivery Address:</strong> {order.deliveryAddress || 'N/A'}</p>
        )}
        <p><strong>Payment Method:</strong> {order.paymentMethod}</p>

        <h5 className="mt-4 mb-2"><strong>Order Status</strong></h5>
        <div className="step-indicator">
          {TRACKING_STAGES.map((stage, index) => (
            <div key={stage} className={`step ${timelineData[stage] !== 'Pending' ? 'completed' : ''}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{stage}</div>
              {index < TRACKING_STAGES.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default OrderDetailsModal;
