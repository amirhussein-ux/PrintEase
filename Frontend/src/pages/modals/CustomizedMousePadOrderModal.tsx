import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';

interface CustomizedMousePadOrderModalProps {
  show: boolean;
  onHide: () => void;
  onPlaceOrder: (order: any) => void;
}

const CustomizedMousePadOrderModal: React.FC<CustomizedMousePadOrderModalProps> = ({
  show,
  onHide,
  onPlaceOrder,
}) => {
  const { showToast } = useGlobalToast();

  const [designFile, setDesignFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [total] = useState(80.00); // Fixed price for the mouse pad

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

    const order = {
      orderId: `MPAD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      product: 'Mouse Pad',
      quantity: 1,
      size: '8.5" x 7"',
      total: total.toFixed(2), // Use the fixed total
      status: 'Pending',
      deliveryAddress: deliveryAddress || 'Pickup',
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
        <Modal.Title><strong>Order: Customized Mouse Pad</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label><strong>Selected Service:</strong></Form.Label>
            <Form.Control type="text" value="Customized Mouse Pad" readOnly />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Upload Design File:</strong></Form.Label>
            <div
              onClick={() => document.getElementById('mousepad-upload')?.click()}
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
              id="mousepad-upload"
              type="file"
              accept=".jpg,.png,.pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Size:</strong></Form.Label>
            <Form.Control type="text" value='8.5" x 7"' readOnly />
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
        <Button style={{ backgroundColor: 'red', borderColor: 'red', marginRight: '10px' }} onClick={onHide}>
          Cancel
        </Button>
        <Button style={activeButtonStyle} onClick={handleSubmit}>
          Place Order
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CustomizedMousePadOrderModal;
