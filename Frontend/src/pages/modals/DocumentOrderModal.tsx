import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext'; // ✅ global toast import

interface DocumentOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const DocumentOrderModal: React.FC<DocumentOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const { showToast } = useGlobalToast(); // ✅ use global toast

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
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (deliveryMethod === 'Delivery') {
      const saved = localStorage.getItem('accountData');
      if (saved) {
        const data = JSON.parse(saved);
        const fullAddress = `${data.houseNo || ''} ${data.street || ''}, ${data.barangay || ''}, ${data.city || ''}, ${data.region || ''}, ${data.zip || ''}`.trim();
        if (fullAddress.replace(/[\s,]/g, '').length > 0) {
          setDeliveryAddress(fullAddress);
        } else {
          setDeliveryAddress('');
          showToast('Please complete your account address before selecting Delivery.', 'danger');
        }
      } else {
        setDeliveryAddress('');
        showToast('Please complete your account address before selecting Delivery.', 'danger');
      }
    } else {
      setDeliveryAddress('');
    }
  }, [deliveryMethod, showToast]);

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
      showToast('Please upload your document.', 'danger');
      return;
    }

    if (deliveryMethod === 'Delivery' && deliveryAddress.trim() === '') {
      showToast('Please complete your account address before selecting Delivery.', 'danger');
      return;
    }

    const order = {
      orderId: `ORD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      product: `Document Printing (${paperSize}, ${colorMode}, ${printType}${doubleSided ? ', Double-Sided' : ''})`,
      quantity,
      total: (5 * quantity).toFixed(2),
      status: 'Pending',
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'Delivery' ? deliveryAddress : 'Pickup',
      paymentMethod,
      notes,
      file,
      pageRange,
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
    showToast('Order placed successfully!', 'success');
    onHide();
  };

  const darkBlueStyle = {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    color: 'white',
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
            <div
              onClick={() => document.getElementById('doc-upload')?.click()}
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
              {file ? (
                <div className="text-success"><strong>File selected:</strong> {file.name}</div>
              ) : (
                <div>Drag and drop files here or <u>Click to upload</u></div>
              )}
            </div>
            <input
              id="doc-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Form.Text muted className="d-block mt-2">Accepted: PDF, DOC, DOCX</Form.Text>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Number of Copies:</strong></Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
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
              style={printType === 'Text' ? darkBlueStyle : {}}
              variant={printType === 'Text' ? 'primary' : 'outline-primary'}
              onClick={() => setPrintType('Text')}
              className="me-2"
            >
              Text
            </Button>
            <Button
              style={printType === 'Photo' ? darkBlueStyle : {}}
              variant={printType === 'Photo' ? 'primary' : 'outline-primary'}
              onClick={() => setPrintType('Photo')}
            >
              Photo
            </Button>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Page Range:</strong></Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. 1-5, 7, 9-10"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Delivery Method:</strong></Form.Label><br />
            <Button
              style={deliveryMethod === 'Pickup' ? darkBlueStyle : {}}
              variant={deliveryMethod === 'Pickup' ? 'primary' : 'outline-primary'}
              onClick={() => setDeliveryMethod('Pickup')}
              className="me-2"
            >
              Pickup
            </Button>
            <Button
              style={deliveryMethod === 'Delivery' ? darkBlueStyle : {}}
              variant={deliveryMethod === 'Delivery' ? 'primary' : 'outline-primary'}
              onClick={() => setDeliveryMethod('Delivery')}
            >
              Delivery
            </Button>
          </Form.Group>

          {deliveryMethod === 'Delivery' && (
            <Form.Group className="mt-3">
              <Form.Label><strong>Delivery Address:</strong></Form.Label>
              <Form.Control type="text" value={deliveryAddress} readOnly />
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
        <Button style={{ backgroundColor: 'red', borderColor: 'red' }} onClick={onHide}>Cancel</Button>
        <Button style={darkBlueStyle} onClick={handleSubmit}>Place Order</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentOrderModal;
