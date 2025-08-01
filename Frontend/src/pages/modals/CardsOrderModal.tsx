import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { QRCode } from 'react-qr-code';
import { useGlobalToast } from '../../contexts/NotificationContext';
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component

interface CardsOrderModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (order: any) => void;
}

const CardsOrderModal: React.FC<CardsOrderModalProps> = ({ show, onHide, onSubmit }) => {
  const { showToast } = useGlobalToast();
  const [purpose, setPurpose] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('For Pick-up'); // Set status to Completed
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0); // State for rating
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const pricePerPiece = {
    'Ordinary Front Only': 250,
    'Back to Back': 300,
    'Front Laminated': 285,
    'Back to Back Laminated': 350,
    'Transparent': 400
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const cardType = type.split('-')[0].trim();
    const total = quantity * (pricePerPiece[cardType] || 0);
    const currentDate = new Date().toLocaleString();

    const order = {
      orderId: `CARD-${Date.now()}`,
      product: `${purpose} Card`,
      type: cardType,
      quantity,
      fileName: file?.name || '',
      paymentMethod,
      total: `₱${total.toFixed(2)}`,
      status: status, // Use the status state directly
      additionalNotes,
      timeline: {
        'Pending': currentDate,
        'Processing': currentDate,
        'Printing': currentDate,
        'Quality Check': currentDate,
        'For Pick-up': currentDate,
        'Completed': currentDate // Set to current date for testing
      }
    };

    setCurrentOrderId(order.orderId);
    onSubmit(order);
    showToast('Order placed successfully!', 'success');
    onHide(); // Always hide modal after submission for Completed status
  };

  const validateForm = () => {
    if (!purpose) {
      showToast('Please select a card purpose', 'danger');
      return false;
    }
    if (!type) {
      showToast('Please select a card type', 'danger');
      return false;
    }
    if (!file) {
      showToast('Please upload your design file', 'danger');
      return false;
    }
    if (quantity < 1) {
      showToast('Quantity must be at least 1', 'danger');
      return false;
    }
    return true;
  };

  const calculateTotal = () => {
    const cardType = type.split('-')[0].trim();
    return quantity * (pricePerPiece[cardType] || 0);
  };

  const handleFeedbackSubmit = () => {
    showToast('Thank you for your Feedback!', 'success');
    setShowFeedbackModal(false);
    setFeedbackSubmitted(true); // Mark feedback as submitted
    setRating(0); // Reset rating after submission
    onHide(); // Close the main modal as well
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>Order: Cards (Calling/Loyalty/Membership)</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Cards (Calling/Loyalty/Membership)" readOnly />
            </Form.Group>

            <Form.Group className="mb-3 mt-3">
              <Form.Label><strong>Card Purpose</strong></Form.Label>
              <Form.Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="">Select Purpose</option>
                <option value="Calling">Calling Card</option>
                <option value="Loyalty">Loyalty Card</option>
                <option value="Membership">Membership Card</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Upload Design</strong></Form.Label>
              <div
                onClick={() => document.getElementById('card-design-upload')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed #6c757d',
                  padding: '20px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d'
                }}
              >
                {file ? (
                  <div className="text-success"><strong>File selected:</strong> {file.name}</div>
                ) : (
                  <div>Drag and drop files here or <u>Click to upload</u></div>
                )}
              </div>
              <input
                id="card-design-upload"
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
                style={{ display: 'none' }}
              />
              <Form.Text muted className="d-block mt-2">
                Accepted formats: JPG, PNG, PDF
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Card Type</strong></Form.Label>
              <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Select Type</option>
                <option value="Ordinary Front Only - ₱250 per piece">Ordinary Front Only - ₱250 per piece</option>
                <option value="Back to Back - ₱300 per piece">Back to Back - ₱300 per piece</option>
                <option value="Front Laminated - ₱285 per piece">Front Laminated - ₱285 per piece</option>
                <option value="Back to Back Laminated - ₱350 per piece">Back to Back Laminated - ₱350 per piece</option>
                <option value="Transparent - ₱400 per piece">Transparent - ₱400 per piece</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Thickness: 250gsm — Size: ATM Size (21x3.5cm)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Quantity</strong></Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Payment Method</strong></Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash on Pickup">Cash on Pickup</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Paypal">Paypal</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Additional Notes</strong></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Enter any additional notes here..."
              />
            </Form.Group>

            <div className="text-end fw-bold mt-3">
              Total: ₱{calculateTotal().toFixed(2)}
            </div>

            {/* QR Code (for "For Pick-up" status) */}
            {status === 'For Pick-up' && currentOrderId && (
              <div className="mt-4" style={{ textAlign: 'center' }}>
                <h5>For Pick-up</h5>
                <div style={{ 
                  display: 'inline-block',
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #ddd'
                }}>
                  <QRCode 
                    value={JSON.stringify({
                      orderId: currentOrderId,
                      product: `${purpose} Card`,
                      type: type.split('-')[0].trim(),
                      quantity,
                      paymentMethod,
                      total: `₱${calculateTotal().toFixed(2)}`,
                      additionalNotes,
                      status
                    })}
                    size={150}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="mt-2 text-muted">
                  Scan this QR code when picking up your order
                </p>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'flex-end' }}>
          <Button variant="danger" onClick={onHide}>
            Cancel
          </Button>
          <Button
            style={{ backgroundColor: '#1e3a8a', borderColor: '#1e3a8a', color: 'white' }}
            onClick={handleSubmit}
          >
            Place Order
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

export default CardsOrderModal;
