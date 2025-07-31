import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context

interface MotorPlateOrderModalProps {
  show: boolean;
  onHide: () => void;
}

const MotorPlateOrderModal: React.FC<MotorPlateOrderModalProps> = ({
  show,
  onHide,
}) => {
  const { showToast } = useGlobalToast();
  const { addOrder } = useOrderContext(); // Use the context

  const [designFile, setDesignFile] = useState<File | null>(null);
  const [plateType, setPlateType] = useState<string>('LTO Standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('GCash');
  const [notes, setNotes] = useState<string>(''); // State for additional notes

  const getPrice = () => {
    return plateType === 'LTO Standard' ? 150 : 200;
  };

  const handleSubmit = () => {
    if (!designFile) {
      showToast('Please upload your design file.', 'danger');
      return;
    }

    const totalPrice = getPrice() * quantity;

    const orderDetails = {
      orderId: `MOTOR-${Date.now()}`, // Add orderId
      product: 'Motor Plate',
      type: plateType,
      quantity,
      total: `₱${totalPrice.toFixed(2)}`, // Format total price
      paymentMethod,
      designFile,
      notes, // Include notes in order details
      status: 'Pending', // Add status
      timeline: {
        'Pending': new Date().toLocaleString(),
        'Processing': 'Pending',
        'Printing': 'Pending',
        'Quality Check': 'Pending',
        'Ready for Pick-up': 'Pending',
        'Completed': 'Pending',
      },
    };

    addOrder(orderDetails); // Use the context to add the order
    showToast('Order placed successfully!', 'success');
    onHide();

    // Reset states
    setDesignFile(null);
    setPlateType('LTO Standard');
    setQuantity(1);
    setPaymentMethod('GCash');
    setNotes(''); // Reset notes
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order Motor Plate</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="designFile">
            <Form.Label><strong>Upload Design File</strong></Form.Label>
            <div
              onClick={() => document.getElementById('motorplate-design-upload')?.click()}
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
              id="motorplate-design-upload"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setDesignFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Select Plate Type</strong></Form.Label>
            <div>
              <Form.Check
                type="radio"
                label="LTO Standard (₱150.00)"
                name="plateType"
                checked={plateType === 'LTO Standard'}
                onChange={() => setPlateType('LTO Standard')}
              />
              <Form.Check
                type="radio"
                label="Customized (₱200.00)"
                name="plateType"
                checked={plateType === 'Customized'}
                onChange={() => setPlateType('Customized')}
              />
            </div>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Quantity</strong></Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Payment Method</strong></Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="GCash">GCash</option>
              <option value="Cash on Pickup">Cash on Pickup</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mt-3">
            <Form.Label><strong>Additional Notes</strong></Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional instructions..."
              maxLength={300}
            />
          </Form.Group>
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

export default MotorPlateOrderModal;
