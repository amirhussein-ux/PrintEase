import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component
import { QRCode } from 'react-qr-code'; // Import QRCode for displaying QR codes

interface NotepadOrderModalProps {
  show: boolean;
  onHide: () => void;
}

const NotepadOrderModal: React.FC<NotepadOrderModalProps> = ({ show, onHide }) => {
  const { showToast } = useGlobalToast();
  const { addOrder } = useOrderContext(); // Use the context

  const [size, setSize] = useState('3x3"');
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [file, setFile] = useState<File | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('Completed'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const priceMap: Record<string, number> = {
    '3x3"': 40,
    '2x4"': 45,
    '4x5"': 65,
  };

  const totalPrice = quantity * (priceMap[size] || 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleOrder = () => {
    if (!file) {
      showToast('Please upload your design file.', 'danger');
      return;
    }

    const orderId = `NOTEPAD-${Date.now()}`; // Add orderId
    const orderData = {
      orderId,
      product: 'Customized Notepad',
      size,
      quantity,
      fileName: file.name,
      paymentMethod,
      remarks,
      total: `₱${totalPrice.toFixed(2)}`, // Format total price
      status, // Add status
      timeline: {
        'Order Placed': new Date().toLocaleString(),
        'Processing': 'Pending',
        'Completed': 'Pending',
      },
    };

    addOrder(orderData); // Use the context to add the order
    showToast('Order placed successfully!', 'success');
    setCurrentOrderId(orderId); // Set the current order ID for QR code
    onHide();

    // Reset states
    setSize('3x3"');
    setQuantity(1);
    setFile(null);
    setPaymentMethod('Cash on Pickup');
    setRemarks('');
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>ORDER: Customized Notepads</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Notepads" readOnly />
            </Form.Group>

            <Form.Group className="mb-3 mt-3">
              <Form.Label><strong>Upload Design</strong></Form.Label>
              <div
                onClick={() => document.getElementById('notepad-file-upload')?.click()}
                style={{
                  border: '2px dashed #6c757d',
                  padding: '20px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d',
                }}
              >
                {file ? (
                  <div className="text-success"><strong>File selected:</strong> {file.name}</div>
                ) : (
                  <div>Drag and drop files here or <u>Click to upload</u></div>
                )}
              </div>
              <input
                id="notepad-file-upload"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".jpg,.jpeg,.png,.pdf"
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Size</strong></Form.Label>
              <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
                <option>3x3"</option>
                <option>2x4"</option>
                <option>4x5"</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Quantity (Pads)</strong></Form.Label>
              <Form.Control
                type="number"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Number(e.target.value))}
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
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional instructions..."
                maxLength={300}
              />
            </Form.Group>

            <p className="mt-3 text-end fw-bold">
              Total: ₱{totalPrice.toFixed(2)}
            </p>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'flex-end' }}>
          <Button variant="danger" onClick={onHide}>
            Cancel
          </Button>
          <Button
            style={{ backgroundColor: '#1e3a8a', borderColor: '#1e3a8a', color: 'white' }}
            onClick={handleOrder}
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
              product: 'Customized Notepad',
              size,
              quantity,
              paymentMethod,
              total: `₱${totalPrice.toFixed(2)}`,
              remarks,
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

export default NotepadOrderModal;
