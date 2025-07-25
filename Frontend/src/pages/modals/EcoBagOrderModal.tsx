import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Toast, ToastContainer } from 'react-bootstrap';

interface EcoBagOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const EcoBagOrderModal: React.FC<EcoBagOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const [material, setMaterial] = useState('Canvas');
  const [color, setColor] = useState('Black');
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [paymentMethod, setPaymentMethod] = useState('Gcash');
  const [quantity, setQuantity] = useState(1);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
          setErrorMessage('Please complete your account address before selecting Delivery.');
          setShowError(true);
        }
      } else {
        setDeliveryAddress('');
        setErrorMessage('Please complete your account address before selecting Delivery.');
        setShowError(true);
      }
    } else {
      setDeliveryAddress('');
    }
  }, [deliveryMethod]);

  const handleSubmit = () => {
    if (!designFile) {
      setErrorMessage('Please upload your design file.');
      setShowError(true);
      return;
    }

    if (deliveryMethod === 'Delivery' && deliveryAddress.trim() === '') {
      setErrorMessage('Please complete your account address before selecting Delivery.');
      setShowError(true);
      return;
    }

    const order = {
      orderId: `ORD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      product: 'Eco Bag Printing',
      quantity,
      total: (quantity * 8).toFixed(2),
      status: 'Pending',
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'Delivery' ? deliveryAddress : 'Pickup',
      paymentMethod,
      notes,
      designFile,
      material,
      color,
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

  const activeButtonStyle = {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    color: 'white',
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>Place Your Eco Bag Order</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Eco Bag Printing" readOnly />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Upload Design File:</strong></Form.Label>
              <div
                onClick={() => document.getElementById('eco-upload')?.click()}
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
                id="eco-upload"
                type="file"
                accept=".jpg,.png,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Material:</strong></Form.Label>
              <Form.Select value={material} onChange={(e) => setMaterial(e.target.value)}>
                <option value="Canvas">Canvas</option>
                <option value="Cotton">Cotton</option>
                <option value="Non-Woven">Non-Woven</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Bag Color:</strong></Form.Label><br />
              <Button
                variant={color === 'Black' ? 'secondary' : 'outline-secondary'}
                onClick={() => setColor('Black')}
                className="me-2"
              >
                Black
              </Button>
              <Button
                variant={color === 'White' ? 'light' : 'outline-secondary'}
                onClick={() => setColor('White')}
              >
                White
              </Button>
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
              <Form.Label><strong>Delivery Method:</strong></Form.Label><br />
              <Button
                style={deliveryMethod === 'Pickup' ? activeButtonStyle : {}}
                variant={deliveryMethod === 'Pickup' ? 'primary' : 'outline-primary'}
                onClick={() => setDeliveryMethod('Pickup')}
                className="me-2"
              >
                Pickup
              </Button>
              <Button
                style={deliveryMethod === 'Delivery' ? activeButtonStyle : {}}
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
          <Button style={{ backgroundColor: 'red', borderColor: 'red' }} onClick={onHide}>
            Cancel
          </Button>
          <Button style={activeButtonStyle} onClick={handleSubmit}>
            Place Order
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg="danger"
          show={showError}
          onClose={() => setShowError(false)}
          delay={3000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Order Warning</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{errorMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default EcoBagOrderModal;
