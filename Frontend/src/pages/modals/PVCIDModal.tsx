import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useGlobalToast } from '../../contexts/NotificationContext';
import { useOrderContext } from '../../contexts/OrdersContext'; // Import the context

interface PVCIDModalProps {
  show: boolean;
  onHide: () => void;
}

const PVCIDModal: React.FC<PVCIDModalProps> = ({ show, onHide }) => {
  const { showToast } = useGlobalToast();
  const { addOrder } = useOrderContext(); // Use the context

  const [idType, setIdType] = useState('Company ID');
  const [quantity, setQuantity] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [notes, setNotes] = useState('');

  const priceList: Record<string, number> = {
    'Company ID': 80,
    'School ID': 80,
    'QR Pass ID': 65,
  };

  const handleSubmit = () => {
    if (!file) {
      showToast('Please upload your file.', 'danger');
      return;
    }

    const total = priceList[idType] * quantity;

    const orderData = {
      orderId: `PVC-${Date.now()}`, // Add orderId
      product: 'PVC ID',
      type: idType,
      quantity,
      fileName: file.name,
      paymentMethod,
      notes,
      total: `₱${total}.00`, // Format total price
      status: 'Pending', // Add status
      timeline: {
        'Pending': new Date().toLocaleString(),
        'Processing': 'Pending',
        'Completed': 'Pending',
      },
    };

    addOrder(orderData); // Use the context to add the order
    showToast('Order placed successfully!', 'success');
    onHide();

    // Reset states
    setIdType('Company ID');
    setQuantity(1);
    setFile(null);
    setPaymentMethod('GCash');
    setNotes('');
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title><strong>Order PVC ID</strong></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label><strong>Select ID Type</strong></Form.Label>
            <Form.Select value={idType} onChange={(e) => setIdType(e.target.value)}>
              <option>Company ID</option>
              <option>School ID</option>
              <option>QR Pass ID</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Quantity</strong></Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Upload File</strong></Form.Label>
            <div
              onClick={() => document.getElementById('pvcid-file-upload')?.click()}
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
              id="pvcid-file-upload"
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              style={{ display: 'none' }}
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <Form.Text muted className="d-block mt-2">Accepted formats: JPG, PNG, PDF</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Payment Method</strong></Form.Label>
            <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>GCash</option>
              <option>PayMaya</option>
              <option>Bank Transfer</option>
              <option>Cash on Delivery</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Additional Notes</strong></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional instructions..."
              maxLength={300}
            />
          </Form.Group>

          <div className="text-end fw-bold">
            Total: ₱{priceList[idType] * quantity}.00
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

export default PVCIDModal;
