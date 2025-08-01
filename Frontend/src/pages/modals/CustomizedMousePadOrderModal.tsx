import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component

interface CustomizedMousePadOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const CustomizedMousePadOrderModal: React.FC<CustomizedMousePadOrderModalProps> = ({
  show,
  onHide,
  onPlaceOrder,
}) => {
  const { showToast } = useGlobalToast();

  const [designFile, setDesignFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [total] = useState(80.00); // Fixed price for the mouse pad
  const [status, setStatus] = useState('For Pick-up'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0); // State for rating
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

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

    const currentDate = new Date().toLocaleString();

    const order = {
      orderId: `MPAD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: currentDate,
      product: 'Mouse Pad',
      quantity: 1,
      size: '8.5" x 7"',
      total: `₱${total.toFixed(2)}`,
      status: status, // Use the status state directly
      deliveryAddress: deliveryAddress || 'Pickup',
      paymentMethod,
      notes,
      designFile: designFile.name,
      timeline: {
        'Order Placed': currentDate,
        'Processing': 'Pending',
        'Printing': 'Pending',
        'Quality Check': 'Pending',
        'For Pick-up': 'Pending',
        'Completed': 'Pending',
      },
    };

    onPlaceOrder(order);
    showToast('Order placed successfully!', 'success');
    onHide();
  };

  const activeButtonStyle = {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    color: 'white',
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>ORDER: Customized Mouse Pad</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Mouse Pads" readOnly />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Upload Design File:</strong></Form.Label>
              <div
                onClick={() => document.getElementById('mousepad-upload')?.click()}
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
                id="mousepad-upload"
                type="file"
                accept=".jpg,.png,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Size:</strong></Form.Label>
              <Form.Control type="text" value='8.5" x 7"' readOnly />
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
              Total: ₱{total.toFixed(2)}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'flex-end' }}>
          <Button variant="danger" onClick={onHide}>
            Cancel
          </Button>
          <Button
            style={activeButtonStyle}
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
        onSubmit={() => {
          showToast('Thank you for your feedback!', 'success');
          setFeedbackSubmitted(true);
          setRating(0);
          onHide();
        }} 
      />
    </>
  );
};

export default CustomizedMousePadOrderModal;
