import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext'; // ✅ Correct import
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component
import { QRCode } from 'react-qr-code'; // Import QRCode for displaying QR codes

interface MugOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const MugOrderModal: React.FC<MugOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const { showToast } = useGlobalToast(); // ✅ Destructure from context

  const [selectedMug, setSelectedMug] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [notes, setNotes] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('For Pick-up'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const mugOptions = {
    'White Mug': 120.00,
    'Inner Color Mug': 150.00,
    'Magic Mug': 170.00,
    'Silver/Gold Mug': 170.00,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setDesignFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      setDesignFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!designFile) {
      showToast('Please upload your design file.', 'danger');
      return;
    }

    if (!selectedMug) {
      showToast('Please select a mug type.', 'danger');
      return;
    }

    const total = (mugOptions[selectedMug] * quantity).toFixed(2);
    const orderId = `MUG-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const order = {
      orderId,
      date: new Date().toISOString().split('T')[0],
      product: 'Mug Printing',
      quantity,
      total,
      status, // Use the status state directly
      paymentMethod,
      notes,
      designFile,
      timeline: {
        'Order Placed': new Date().toLocaleDateString(),
        'Processing': 'Pending',
        'Printing': 'Pending',
        'Quality Check': 'Pending',
        'For Pick-up': 'Pending',
        'Completed': 'Pending',
      },
    };

    setCurrentOrderId(orderId);
    onPlaceOrder(order);
    showToast('Order placed successfully!', 'success');
    onHide();
  };

  const activeButtonStyle = {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    color: 'white',
  };

  // Calculate total, default to 0.00 if no mug is selected
  const total = selectedMug ? (mugOptions[selectedMug] * quantity).toFixed(2) : '0.00';

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>ORDER: Mug</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Mugs" readOnly />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Upload Design File:</strong></Form.Label>
              <div
                onClick={() => document.getElementById('design-upload')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
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
                {designFile ? (
                  <div className="text-success"><strong>File selected:</strong> {designFile.name}</div>
                ) : (
                  <div>Drag and drop files here or <u>Click to upload</u></div>
                )}
              </div>
              <input
                id="design-upload"
                type="file"
                accept=".jpg,.png,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Selection Type Mug:</strong></Form.Label>
              <Form.Select value={selectedMug} onChange={(e) => setSelectedMug(e.target.value)}>
                <option value="">Select Mug Type</option>
                {Object.entries(mugOptions).map(([mugType, price]) => (
                  <option key={mugType} value={mugType}>
                    {mugType} - ₱{price.toFixed(2)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Quantity:</strong></Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Payment Method:</strong></Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash on Pickup">Cash on Pickup</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Paypal">Paypal</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Additional Notes:</strong></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Any extra instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Group>

            <div className="text-end fw-bold mt-3">
              Total: ₱{total}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'flex-end' }}>
          <Button variant="danger" onClick={onHide}>
            Cancel
          </Button>
          <Button style={activeButtonStyle} onClick={handleSubmit}>
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
              product: 'Mug Printing',
              quantity,
              paymentMethod,
              total,
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

export default MugOrderModal;
