import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component
import { QRCode } from 'react-qr-code'; // Import QRCode for displaying QR codes

interface PVCIDModalProps {
  show: boolean;
  onHide: () => void;
}

const PVCIDModal: React.FC<PVCIDModalProps> = ({ show, onHide }) => {
  const { showToast } = useGlobalToast();
  const { addOrder } = useOrderContext(); // Use the context

  const [idType, setIdType] = useState('Company ID');
  const [quantity, setQuantity] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [notes, setNotes] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const priceList: Record<string, number> = {
    'Company ID': 80,
    'School ID': 80,
    'QR Pass ID': 65,
  };

  const handleSubmit = () => {
    if (!file) {
      showToast('Please upload your file.', 'danger');
      return;
    }

    const total = priceList[idType] * quantity;
    const orderId = `PVC-${Date.now()}`; // Add orderId

    const orderData = {
      orderId,
      product: 'PVC ID',
      type: idType,
      quantity,
      fileName: file.name,
      paymentMethod,
      notes,
      total: `₱${total}.00`, // Format total price
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
    setIdType('Company ID');
    setQuantity(1);
    setFile(null);
    setPaymentMethod('Cash on Pickup');
    setNotes('');
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>ORDER: PVC ID</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="PVC ID" readOnly />
            </Form.Group>

            <Form.Group className="mb-3 mt-3">
              <Form.Label><strong>Select ID Type</strong></Form.Label>
              <Form.Select value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option>Company ID</option>
                <option>School ID</option>
                <option>QR Pass ID</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Quantity</strong></Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Upload File</strong></Form.Label>
              <div
                onClick={() => document.getElementById('pvcid-file-upload')?.click()}
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
                id="pvcid-file-upload"
                type="file"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                style={{ display: 'none' }}
                accept=".jpg,.jpeg,.png,.pdf"
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
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
                placeholder="Any additional instructions..."
                maxLength={300}
              />
            </Form.Group>

            <div className="text-end fw-bold">
              Total: ₱{priceList[idType] * quantity}.00
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
              product: 'PVC ID',
              type: idType,
              quantity,
              paymentMethod,
              total: `₱${priceList[idType] * quantity}.00`,
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

export default PVCIDModal;
