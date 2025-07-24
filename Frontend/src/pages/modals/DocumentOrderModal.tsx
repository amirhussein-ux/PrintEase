import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface DocumentOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const DocumentOrderModal: React.FC<DocumentOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const [paperSize, setPaperSize] = useState('A4');
  const [colorMode, setColorMode] = useState<'Black & White' | 'Colored'>('Black & White');
  const [doubleSided, setDoubleSided] = useState(false);
  const [printType, setPrintType] = useState<'Text' | 'Photo'>('Text');
  const [pageRange, setPageRange] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [paymentMethod, setPaymentMethod] = useState('Gcash');
  const [file, setFile] = useState<File | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    const order = {
      orderId: `ORD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      product: `Document Printing (${paperSize}, ${colorMode}, ${printType}${doubleSided ? ', Double-Sided' : ''})`,
      quantity: 1,
      total: (5).toFixed(2), // sample static price
      status: 'Pending',
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'Delivery' ? deliveryAddress : 'Pickup',
      paymentMethod,
      notes,
      timeline: {
        'Order Placed': new Date().toLocaleDateString(),
        'Processing': 'Pending',
        'Printing': 'Pending',
        'Quality Check': 'Pending',
        'Shipped': 'Pending',
        'Delivered': 'Pending',
      },
    };

    onPlaceOrder(order);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Place Your Document Print Order</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label><strong>Upload Document:</strong></Form.Label>
            <Form.Control type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
            <Form.Text muted>Accepted: PDF, DOC, DOCX</Form.Text>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Paper Size:</strong></Form.Label>
            <Form.Select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Color Mode:</strong></Form.Label><br />
            <Button
              variant={colorMode === 'Black & White' ? 'secondary' : 'outline-secondary'}
              onClick={() => setColorMode('Black & White')}
              className="me-2"
            >
              Black & White
            </Button>
            <Button
              variant={colorMode === 'Colored' ? 'secondary' : 'outline-secondary'}
              onClick={() => setColorMode('Colored')}
            >
              Colored
            </Button>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Double-Sided Printing:</strong></Form.Label><br />
            <Form.Check
              type="checkbox"
              label="Enable double-sided printing"
              checked={doubleSided}
              onChange={() => setDoubleSided(!doubleSided)}
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Print Type:</strong></Form.Label><br />
            <Button
              variant={printType === 'Text' ? 'primary' : 'outline-primary'}
              onClick={() => setPrintType('Text')}
              className="me-2"
            >
              Text
            </Button>
            <Button
              variant={printType === 'Photo' ? 'primary' : 'outline-primary'}
              onClick={() => setPrintType('Photo')}
            >
              Photo
            </Button>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Page Range (e.g. 1-5, 7, 9-10):</strong></Form.Label>
            <Form.Control
              type="text"
              placeholder="Optional"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Delivery Method:</strong></Form.Label><br />
            <Button
              variant={deliveryMethod === 'Pickup' ? 'primary' : 'outline-primary'}
              onClick={() => setDeliveryMethod('Pickup')}
              className="me-2"
            >
              Pickup
            </Button>
            <Button
              variant={deliveryMethod === 'Delivery' ? 'primary' : 'outline-primary'}
              onClick={() => setDeliveryMethod('Delivery')}
            >
              Delivery
            </Button>
          </Form.Group>

          {deliveryMethod === 'Delivery' && (
            <Form.Group className="mt-3">
              <Form.Label><strong>Delivery Address:</strong></Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </Form.Group>
          )}

          <Form.Group className="mt-3">
            <Form.Label><strong>Payment Method:</strong></Form.Label>
            <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Maya">Maya</option>
              <option value="Paypal">Paypal</option>
              <option value="Gcash">Gcash</option>
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
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="success" onClick={handleSubmit}>Place Order</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentOrderModal;
