import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext'; // ✅ import global toast
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component
import { QRCode } from 'react-qr-code'; // Import QRCode for displaying QR codes

interface TarpaulinOrderModalProps {
  show: boolean;
  onHide: () => void;
}

const TarpaulinOrderModal: React.FC<TarpaulinOrderModalProps> = ({ show, onHide }) => {
  const { showToast } = useGlobalToast(); // ✅ use the global toast context
  const { addOrder } = useOrderContext(); // Use the context

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [size, setSize] = useState('');
  const [total, setTotal] = useState(0);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('Quality Check'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const sizeOptions = {
    '2x3': 110.00,
    '2x5': 180.00,
    '3x4': 220.00,
    '3x3': 165.00,
    '4x4': 290.00,
    '3x5': 270.00,
    '3x6': 325.00,
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

  const handleSizeChange = (selectedSize: string) => {
    setSize(selectedSize);
    const pricePerUnit = sizeOptions[selectedSize] || 0;
    setTotal(pricePerUnit * quantity);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = Number(e.target.value);
    setQuantity(qty);
    const pricePerUnit = sizeOptions[size] || 0;
    setTotal(pricePerUnit * qty);
  };

  const handleSubmit = () => {
    if (!designFile) {
      showToast('Please upload your design file.', 'danger');
      return;
    }

    if (!size) {
      showToast('Please select a tarpaulin size.', 'danger');
      return;
    }

    const order = {
      orderId: `TARP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      product: `Tarpaulin (${size})`,
      quantity,
      total: total.toFixed(2), // Use the calculated total
      status, // Add status
      paymentMethod,
      notes,
      designFile,
      timeline: {
        'Order Placed': new Date().toLocaleDateString(),
        'Processing': 'Pending',
        'Printing': 'Pending',
        'Quality Check': 'Pending',
        'Shipped': 'Pending',
        'Delivered': 'Pending',
      },
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
          <Modal.Title><strong>ORDER: Tarpaulin</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Tarpaulins" readOnly />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Upload Design File:</strong></Form.Label>
              <div
                onClick={() => document.getElementById('tarp-upload')?.click()}
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
                id="tarp-upload"
                type="file"
                accept=".jpg,.png,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Select Size:</strong></Form.Label>
              <Form.Select value={size} onChange={(e) => handleSizeChange(e.target.value)}>
                <option value="">Select Size</option>
                {Object.entries(sizeOptions).map(([sizeLabel, price]) => (
                  <option key={sizeLabel} value={sizeLabel}>{sizeLabel}: ₱{price.toFixed(2)}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Quantity:</strong></Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={quantity}
                onChange={handleQuantityChange}
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
              Total: ₱{total.toFixed(2)}
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
              product: `Tarpaulin (${size})`,
              quantity,
              paymentMethod,
              total: total.toFixed(2),
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

export default TarpaulinOrderModal;
