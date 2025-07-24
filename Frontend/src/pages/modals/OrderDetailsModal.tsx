import React from 'react';
import { Modal, Table } from 'react-bootstrap';

interface OrderDetailsModalProps {
  show: boolean;
  onHide: () => void;
  order: {
    orderId: string;
    date: string;
    product: string;
    quantity: number;
    total: string;
    deliveryMethod: string;
    deliveryAddress: string;
    paymentMethod: string;
    timeline: { [step: string]: string };
  };
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ show, onHide, order }) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order Details</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Order ID:</strong> {order.orderId}</p>
        <p><strong>Date:</strong> {order.date}</p>
        <p><strong>Product:</strong> {order.product}</p>
        <p><strong>Quantity:</strong> {order.quantity}</p>
        <p><strong>Total:</strong> ₱{order.total.replace('₱', '')}</p>
        <p><strong>Delivery Method:</strong> {order.deliveryMethod}</p>
        {order.deliveryMethod === 'Delivery' && (
          <p><strong>Delivery Address:</strong> {order.deliveryAddress}</p>
        )}
        <p><strong>Payment Method:</strong> {order.paymentMethod}</p>

        <h5 className="mt-4 mb-2"><strong>Order Status</strong></h5>
        <Table bordered responsive>
          <thead>
            <tr>
              {Object.keys(order.timeline).map((stage, idx) => (
                <th key={idx}>{stage}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Object.values(order.timeline).map((date, idx) => (
                <td key={idx}>{date}</td>
              ))}
            </tr>
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
};

export default OrderDetailsModal;
