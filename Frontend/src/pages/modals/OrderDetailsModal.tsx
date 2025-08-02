import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { useGlobalToast } from '../../contexts/NotificationContext';
import FeedbackModal from './FeedbackModal';
import './OrderDetailsModal.css';

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
  status?: string;
}

interface OrderDetailsModalProps {
  show: boolean;
  onHide: () => void;
  order: OrderDetails;
}

const TRACKING_STAGES = [
  'Pending',
  'Processing',
  'Printing',
  'Quality Check',
  'For Pick-up',
  'Completed',
];

// Your working Replit app URL
const QR_LANDING_PAGE_URL = 'https://dfab6539-9150-4ff4-8a33-6e1c45fd5e3f-00-2zkubkqmc8ggl.picard.replit.dev';

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ show, onHide, order }) => {
  const { showToast } = useGlobalToast();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const timelineData = TRACKING_STAGES.reduce((acc: OrderTimeline, stage) => {
    acc[stage] = order.timeline?.[stage] || 'Pending';
    return acc;
  }, {});

  const handleFeedbackSubmit = () => {
    showToast('Thank you for your feedback!', 'success');
    setFeedbackSubmitted(true);
    setShowFeedbackModal(false);
    onHide();
  };

  const getCompletedStages = (status: string) => {
    const completedStages = [];
    for (const stage of TRACKING_STAGES) {
      completedStages.push(stage);
      if (stage === status) break;
    }
    return completedStages;
  };

  // Generate QR code URL that redirects to your landing page
  const generateQRCodeURL = () => {
    const orderData = {
      orderId: order.orderId,
      product: order.product,
      status: order.status,
      quantity: order.quantity,
      total: order.total,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      date: order.date
    };
    
    return `${QR_LANDING_PAGE_URL}/?qr=${encodeURIComponent(JSON.stringify(orderData))}`;
  };

  const completedStages = getCompletedStages(order.status || 'Pending');

  return (
    <>
      {/* Main Order Details Modal */}
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header 
          closeButton 
          style={{ 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
            color: 'white' 
          }}
        >
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
              <div key={stage} className={`step ${completedStages.includes(stage) ? 'completed' : ''}`}>
                <div className="step-number">{index + 1}</div>
                <div className="step-label">{stage}</div>
                {index < TRACKING_STAGES.length - 1 && <div className="step-line" />}
              </div>
            ))}
          </div>

          {/* QR Code (for "For Pick-up" status) */}
          {order.status === 'For Pick-up' && order.orderId && (
            <div className="mt-4 text-center">
              <h5>Pickup QR Code</h5>
              <div className="d-inline-block p-3 bg-white border rounded">
                <QRCodeSVG
                  value={generateQRCodeURL()}
                  size={128}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="mt-2 text-muted">
                Scan this code to view your receipt details
              </p>
              <div className="mt-2">
                <small className="text-muted d-block">
                  Or visit: <a href={generateQRCodeURL()} target="_blank" rel="noopener noreferrer">
                    View Receipt Online
                  </a>
                </small>
              </div>
            </div>
          )}

          {/* Feedback Button (for "Completed" status) */}
          {order.status === 'Completed' && !feedbackSubmitted && (
            <div className="text-center mt-4">
              <Button 
                variant="success" 
                onClick={() => setShowFeedbackModal(true)}
                style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
              >
                Feedback
              </Button>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={onHide}
            style={{
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: '500'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Feedback Modal */}
      <FeedbackModal 
        show={showFeedbackModal} 
        onHide={() => setShowFeedbackModal(false)} 
        onSubmit={handleFeedbackSubmit} 
      />
    </>
  );
};

export default OrderDetailsModal;
