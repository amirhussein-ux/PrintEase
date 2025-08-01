import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context

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

    const orderData = {
      orderId: `NOTEPAD-${Date.now()}`, // Add orderId
      product: 'Customized Notepad',
      size,
      quantity,
      fileName: file.name,
      paymentMethod,
      remarks,
      total: `₱${totalPrice.toFixed(2)}`, // Format total price
      status: 'Pending', // Add status
      timeline: {
        'Pending': new Date().toLocaleString(),
        'Processing': 'Pending',
        'Completed': 'Pending',
      },
    };

    addOrder(orderData); // Use the context to add the order
    showToast('Order placed successfully!', 'success');
    onHide();

    // Reset states
    setSize('3x3"');
    setQuantity(1);
    setFile(null);
    setPaymentMethod('Cash on Pickup');
    setRemarks('');
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order Customized Notepads</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
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
            Total Price: ₱{totalPrice.toFixed(2)}
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
  );
};

export default NotepadOrderModal;
