import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Toast, ToastContainer } from 'react-bootstrap';

interface TarpaulinOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const TarpaulinOrderModal: React.FC<TarpaulinOrderModalProps> = ({ show, onHide, onPlaceOrder }) => {
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [paymentMethod, setPaymentMethod] = useState('Gcash');
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const tarpSizes = {
    Small: ['5′ x 7′', '6′ x 8′', '8′ x 10′'],
    Medium: ['10′ x 12′', '12′ x 16′', '14′ x 20′'],
    Large: ['16′ x 20′', '20′ x 30′', '30′ x 40′'],
    'Extra Large': ['40′ x 60′', '50′ x 100′', '100′ x 100′'],
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
      setErrorMessage('Please upload your design file.');
      setShowError(true);
      return;
    }

    if (!size) {
      setErrorMessage('Please select a tarpaulin size.');
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
      product: `Tarpaulin Printing (${size})`,
      quantity,
      total: (quantity * 20).toFixed(2),
      status: 'Pending',
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'Delivery' ? deliveryAddress : 'Pickup',
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

    onPlaceOrder(order);
    onHide();
  };

  const darkBlueStyle = {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
    color: 'white',
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>Place Your Tarpaulin Order</strong></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label><strong>Selected Service:</strong></Form.Label>
              <Form.Control type="text" value="Tarpaulin Printing" readOnly />
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
              {Object.entries(tarpSizes).map(([category, sizes]) => (
                <div key={category} className="mb-2">
                  <strong>{category} Tarps:</strong>{' '}
                  {sizes.map((s) => (
                    <Button
                      key={s}
                      style={size === s ? darkBlueStyle : {}}
                      variant={size === s ? 'primary' : 'outline-primary'}
                      onClick={() => setSize(s)}
                      className="me-2 mb-2"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              ))}
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

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg="danger" show={showError} onClose={() => setShowError(false)} delay={3000} autohide>
          <Toast.Header><strong className="me-auto">Order Warning</strong></Toast.Header>
          <Toast.Body className="text-white">{errorMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default TarpaulinOrderModal;
