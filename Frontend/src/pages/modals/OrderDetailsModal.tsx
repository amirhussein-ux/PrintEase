import React from 'react';
import { Modal, Table } from 'react-bootstrap';

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
  'Ready for Pick-up',
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
        <p><strong>Delivery Method:</strong> {order.deliveryMethod}</p>
        {order.deliveryMethod === 'Delivery' && (
          <p><strong>Delivery Address:</strong> {order.deliveryAddress || 'N/A'}</p>
        )}
        <p><strong>Payment Method:</strong> {order.paymentMethod}</p>

        <h5 className="mt-4 mb-2"><strong>Order Status</strong></h5>
        <Table bordered responsive>
          <thead>
            <tr>
              {TRACKING_STAGES.map((stage) => (
                <th key={stage}>{stage}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {TRACKING_STAGES.map((stage) => (
                <td key={stage}>{timelineData[stage]}</td>
              ))}
            </tr>
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
};

export default OrderDetailsModal;
