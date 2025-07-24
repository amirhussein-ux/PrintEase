import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Toast, ToastContainer } from 'react-bootstrap';

interface PenOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const PenOrderModal: React.FC<PenOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const [penColor, setPenColor] = useState('Black');
  const [inkType, setInkType] = useState<'Gel' | 'Ballpoint'>('Ballpoint');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [paymentMethod, setPaymentMethod] = useState('Gcash');
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showError, setShowError] = useState(false);

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
          setShowError(true);
        }
      } else {
        setDeliveryAddress('');
        setShowError(true);
      }
    } else {
      setDeliveryAddress('');
    }
  }, [deliveryMethod]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDesignFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (deliveryMethod === 'Delivery' && deliveryAddress.trim() === '') {
      setShowError(true);
      return;
    }

    const order = {
      orderId: `ORD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      product: `Pen Printing (${penColor} ${inkType})`,
      quantity,
      total: (quantity * 5).toFixed(2),
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
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>Place Your Order</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Pen Printing" readOnly />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Upload Design File:</strong></Form.Label>
              <Form.Control type="file" accept=".jpg,.png,.pdf" onChange={handleFileChange} />
              <Form.Text muted>Accepted formats: JPG, PNG, PDF</Form.Text>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Pen Color:</strong></Form.Label><br />
              <Button variant={penColor === 'Black' ? 'dark' : 'outline-dark'} onClick={() => setPenColor('Black')} className="me-2">
                Black
              </Button>
              <Button variant={penColor === 'Blue' ? 'primary' : 'outline-primary'} onClick={() => setPenColor('Blue')}>
                Blue
              </Button>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Ink Type:</strong></Form.Label><br />
              <Button variant={inkType === 'Ballpoint' ? 'success' : 'outline-success'} onClick={() => setInkType('Ballpoint')} className="me-2">
                Ballpoint
              </Button>
              <Button variant={inkType === 'Gel' ? 'success' : 'outline-success'} onClick={() => setInkType('Gel')}>
                Gel
              </Button>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Quantity:</strong></Form.Label>
              <Form.Control type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label><strong>Delivery Method:</strong></Form.Label><br />
              <Button variant={deliveryMethod === 'Pickup' ? 'primary' : 'outline-primary'} onClick={() => setDeliveryMethod('Pickup')} className="me-2">
                Pickup
              </Button>
              <Button variant={deliveryMethod === 'Delivery' ? 'primary' : 'outline-primary'} onClick={() => setDeliveryMethod('Delivery')}>
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
              <Form.Control as="textarea" rows={3} placeholder="Any extra instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="success" onClick={handleSubmit}>Place Order</Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg="danger" show={showError} onClose={() => setShowError(false)} delay={3000} autohide>
          <Toast.Header>
            <strong className="me-auto">Missing Address</strong>
          </Toast.Header>
          <Toast.Body className="text-white">Please complete your account address before selecting Delivery.</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default PenOrderModal;
