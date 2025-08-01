import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context

interface TShirtOrderModalProps {
  show: boolean;
  onHide: () => void;
}

const TShirtOrderModal: React.FC<TShirtOrderModalProps> = ({ show, onHide }) => {
  const { showToast } = useGlobalToast();
  const { addOrder } = useOrderContext(); // Use the context

  const [size, setSize] = useState('Medium');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [quantity, setQuantity] = useState(1);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [shirtType, setShirtType] = useState('Printable Vinyl Printing');
  const [vinylColor, setVinylColor] = useState('');

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

    if (shirtType === 'Printable Vinyl Printing' && !vinylColor) {
      showToast('Please select a vinyl color.', 'danger');
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const pricePerShirt = shirtType === 'Printable Vinyl Printing' ? 130 : 100;
    const total = (quantity * pricePerShirt).toFixed(2);

    const order = {
      orderId: `TSHIRT-${Date.now()}`, // Add orderId
      product: `T-Shirt (${shirtType})`,
      quantity,
      total,
      status: 'Pending',
      deliveryMethod: 'Pickup',
      deliveryAddress: 'Pickup',
      paymentMethod,
      notes,
      designFile,
      size,
      color: shirtType === 'Printable Vinyl Printing' ? vinylColor : 'White',
      timeline: {
        'Pending': `${formattedDate} - ${formattedTime}`,
        'Processing': 'Pending',
        'Printing': 'Pending',
        'Quality Check': 'Pending',
        'Ready for Pick-up': 'Pending',
        'Completed': 'Pending',
      },
    };

    addOrder(order); // Use the context to add the order
    showToast('Order placed successfully!', 'success');
    onHide();
  };

  const activeButtonStyle = {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    color: 'white',
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order T-Shirt</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label><strong>Selected Service:</strong></Form.Label>
            <Form.Control type="text" value="T-Shirt Printing" readOnly />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Select Type of Shirt Printing:</strong></Form.Label>
            <Form.Select value={shirtType} onChange={(e) => setShirtType(e.target.value)}>
              <option value="Printable Vinyl Printing">Printable Vinyl Printing – ₱130.00 per A4 size</option>
              <option value="Sublimation Printing">Sublimation Printing – ₱100.00 per A4 size (T-Shirt White Only)</option>
            </Form.Select>
            <div className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
              <em>- Price may vary depending on the size</em><br />
              <em>- Max Size: 14x14 inch</em>
            </div>
          </Form.Group>

          {shirtType === 'Printable Vinyl Printing' && (
            <Form.Group className="mt-3">
              <Form.Label><strong>Vinyl Color:</strong></Form.Label>
              <Form.Select value={vinylColor} onChange={(e) => setVinylColor(e.target.value)}>
                <option value="">Select color</option>
                <option value="Black">Black</option>
                <option value="White">White</option>
              </Form.Select>
            </Form.Group>
          )}

          <Form.Group className="mt-3">
            <Form.Label><strong>Upload Design File:</strong></Form.Label>
            <div
              onClick={() => document.getElementById('tshirt-design-upload')?.click()}
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
              id="tshirt-design-upload"
              type="file"
              accept=".jpg,.png,.pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Shirt Size:</strong></Form.Label>
            <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
              <option>Extra Small</option>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
              <option>Extra Large</option>
              <option>2X Large</option>
              <option>3X Large</option>
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
            Total: ₱{(quantity * (shirtType === 'Printable Vinyl Printing' ? 130 : 100)).toFixed(2)}
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ justifyContent: 'flex-end' }}>
        <Button
          className="me-2"
          style={{ backgroundColor: 'red', borderColor: 'white', color: 'white' }}
          onClick={onHide}
        >
          Cancel
        </Button>
        <Button style={activeButtonStyle} onClick={handleSubmit}>
          Place Order
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TShirtOrderModal;
