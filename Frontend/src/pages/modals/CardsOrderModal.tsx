import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';

interface CardsOrderModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (order: any) => void; // Ensure onSubmit is a function
}

const CardsOrderModal: React.FC<CardsOrderModalProps> = ({ show, onHide, onSubmit }) => {
  const { showToast } = useGlobalToast();
  const [purpose, setPurpose] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [additionalNotes, setAdditionalNotes] = useState(''); // State for additional notes

  const pricePerPiece = {
    'Ordinary Front Only': 250, // ₱250 per piece
    'Back to Back': 300,         // ₱300 per piece
    'Front Laminated': 285,      // ₱285 per piece
    'Back to Back Laminated': 350,// ₱350 per piece
    'Transparent': 400           // ₱400 per piece
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
    if (!purpose) {
      showToast('Please select a card purpose', 'danger');
      return;
    }
    if (!type) {
      showToast('Please select a card type', 'danger');
      return;
    }
    if (!file) {
      showToast('Please upload your design file', 'danger');
      return;
    }
    if (quantity < 1) {
      showToast('Quantity must be at least 1', 'danger');
      return;
    }

    const cardType = type.split('-')[0].trim();
    const total = quantity * (pricePerPiece[cardType] || 0);

    const order = {
      orderId: `CARD-${Date.now()}`,
      product: `${purpose} Card`,
      type: cardType,
      quantity,
      fileName: file.name,
      paymentMethod,
      total: `₱${total.toFixed(2)}`,
      status: 'Pending',
      additionalNotes, // Include additional notes in the order
      timeline: {
        'Pending': new Date().toLocaleString()
      }
    };

    onSubmit(order); // Call the onSubmit function passed from the parent
    showToast('Order placed successfully!', 'success'); // Show success toast
    onHide(); // Close the modal after submission
  };

  const calculateTotal = () => {
    const cardType = type.split('-')[0].trim();
    return quantity * (pricePerPiece[cardType] || 0);
  };

  const isFormValid = () => {
    return purpose && type && file && quantity >= 1;
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order: Cards (Calling/Loyalty/Membership)</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
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
  );
};

export default CardsOrderModal;
