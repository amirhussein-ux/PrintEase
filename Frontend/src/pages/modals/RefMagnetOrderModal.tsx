import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component
import { QRCode } from 'react-qr-code'; // Import QRCode for displaying QR codes

interface RefMagnetOrderModalProps {
  show: boolean;
  onHide: () => void;
}

const RefMagnetOrderModal: React.FC<RefMagnetOrderModalProps> = ({ show, onHide }) => {
  const { showToast } = useGlobalToast();
  const { addOrder } = useOrderContext();

  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(30);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('Printing'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const priceList: Record<string, number> = {
    '2x3.5': 28,
    '3x4': 30,
    '4x5': 35,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file) {
      showToast('Please upload your design file', 'danger');
      return;
    }
    if (!size) {
      showToast('Please select a size', 'danger');
      return;
    }
    if (quantity < 30) {
      showToast('Minimum order is 30 pieces', 'danger');
      return;
    }

    const total = priceList[size] * quantity;

    const order = {
      orderId: `MAGNET-${Date.now()}`,
      product: 'Refrigerator Magnet',
      size,
      quantity,
      fileName: file.name,
      paymentMethod,
      notes,
      total: `₱${total}.00`,
      status, // Add status
      timeline: {
        'Order Placed': new Date().toLocaleString(),
        'Processing': 'Pending',
        'Completed': 'Pending',
      }
    };

    addOrder(order);
    showToast('Order placed successfully!', 'success');
    setCurrentOrderId(order.orderId); // Set the current order ID for QR code
    onHide();
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>ORDER: Refrigerator Magnets</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Refrigerator Magnets" readOnly />
            </Form.Group>
            
            <Form.Group className="mb-3 mt-3">
              <Form.Label><strong>Upload Design</strong></Form.Label>
              <div
                onClick={() => document.getElementById('magnet-file-upload')?.click()}
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
                id="magnet-file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Size</strong></Form.Label>
              <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Select size</option>
                <option value="2x3.5">2"×3.5" (₱28.00 each)</option>
                <option value="3x4">3"×4" (₱30.00 each)</option>
                <option value="4x5">4"×5" (₱35.00 each)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Quantity (minimum 30 pieces)</strong></Form.Label>
              <Form.Control
                type="number"
                min={30}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(30, parseInt(e.target.value) || 30))}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                maxLength={300}
              />
            </Form.Group>

            <div className="text-end fw-bold mt-3">
              Total: ₱{(priceList[size] || 0) * quantity}.00
            </div>
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

      {/* QR Code and Feedback Section */}
      {currentOrderId && (
        <div className="mt-4 text-center">
          <h5>Order Details</h5>
          <QRCode
            value={JSON.stringify({
              orderId: currentOrderId,
              product: 'Refrigerator Magnet',
              size,
              quantity,
              paymentMethod,
              total: `₱${(priceList[size] || 0) * quantity}.00`,
              notes,
              status,
            })}
            size={128}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
          <p className="mt-2 text-muted">
            Present this QR code when picking up your order
          </p>
          {!feedbackSubmitted && (
            <Button 
              variant="success" 
              onClick={() => setShowFeedbackModal(true)}
              style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
            >
              Feedback
            </Button>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        show={showFeedbackModal} 
        onHide={() => setShowFeedbackModal(false)} 
        onSubmit={() => {
          showToast('Thank you for your feedback!', 'success');
          setFeedbackSubmitted(true);
          setShowFeedbackModal(false);
        }} 
      />
    </>
  );
};

export default RefMagnetOrderModal;
