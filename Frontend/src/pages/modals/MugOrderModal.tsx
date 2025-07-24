import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Toast, ToastContainer } from 'react-bootstrap';

interface MugOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}


const getOrCreateGuestToken = () => {
  let token = localStorage.getItem('guestToken');
  if (!token) {
    token = 'guest_' + Math.random().toString(36).substr(2, 16) + Date.now();
    localStorage.setItem('guestToken', token);
  }
  return token;
};

const MugOrderModal: React.FC<MugOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const [color, setColor] = useState('Black');
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [paymentMethod, setPaymentMethod] = useState('Gcash');
  const [quantity, setQuantity] = useState(1);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showError, setShowError] = useState(false);
  const [guestToken] = useState(getOrCreateGuestToken());

  // 🧠 Handle design upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDesignFile(e.target.files[0]);
    }
  };

  // 📌 Autofill address from localStorage when "Delivery" selected
  useEffect(() => {
    if (deliveryMethod === 'Delivery') {
      const saved = localStorage.getItem('accountData');
      if (saved) {
        const data = JSON.parse(saved);
        const fullAddress = `${data.houseNo || ''} ${data.street || ''}, ${data.barangay || ''}, ${data.city || ''}, ${data.region || ''}, ${data.zip || ''}`.trim();
        if (fullAddress.replace(/[\s,]/g, '').length > 0) {
          setDeliveryAddress(fullAddress);
          setShowError(false);
        } else {
          setDeliveryAddress('');
          setShowError(true);
        }
      } else {
        setDeliveryAddress('');
        setShowError(true);
      }
    } else {
      setDeliveryAddress('');
      setShowError(false); // Reset error when switching to Pickup
    }
  }, [deliveryMethod]);

  // 🧾 Place Order
const handleSubmit = async () => {
  if (deliveryMethod === 'Delivery' && deliveryAddress.trim() === '') {
    setShowError(true);
    return;
  }

  // Debug: Log order data before sending
  const orderData = {
    productType: 'mug',
    customerName: 'Guest',
    guestToken,
    quantity,
    details: {
      color,
      deliveryMethod,
      paymentMethod,
      deliveryAddress: deliveryMethod === 'Delivery' ? deliveryAddress : 'Pickup',
      notes,
    },
    status: 'pending',
  };
  console.log('[DEBUG] Submitting Mug order:', orderData);

  const formData = new FormData();
  Object.entries(orderData).forEach(([key, value]) => {
    if (key === 'details') {
      formData.append('details', JSON.stringify(value));
    } else {
      formData.append(key, value as any);
    }
  });
  if (designFile) {
    formData.append('designFile', designFile);
  }

  try {
    const response = await fetch('http://localhost:8000/api/orders', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    console.log('[DEBUG] API response:', result);
    if (response.ok) {
      onPlaceOrder(result);
      onHide();
    } else {
      setShowError(true);
    }
  } catch (err) {
    console.error('[DEBUG] Error submitting order:', err);
    setShowError(true);
  }
};

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>Place Your Order</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Mug Printing" readOnly />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Upload Design File:</strong></Form.Label>
              <Form.Control type="file" accept=".jpg,.png,.pdf" onChange={handleFileChange} />
              <Form.Text muted>Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Color of the Mug:</strong></Form.Label><br />
              <Button
                variant={color === 'Black' ? 'dark' : 'outline-dark'}
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
                  value={deliveryAddress}
                  readOnly
                />
              </Form.Group>
            )}

            <Form.Group className="mt-3">
              <Form.Label><strong>Payment Method:</strong></Form.Label>
              <Form.Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
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

      {/* Error Toast Notification */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg="danger"
          show={showError && deliveryMethod === 'Delivery'}
          onClose={() => setShowError(false)}
          delay={3000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Missing Address</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            Please complete your account address before selecting Delivery.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default MugOrderModal;
