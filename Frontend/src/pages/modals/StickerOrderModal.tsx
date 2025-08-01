import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useOrderContext } from '../../contexts/OrdersContext';
import { useGlobalToast } from '../../contexts/NotificationContext';
import FeedbackModal from './FeedbackModal'; // Import the FeedbackModal component
import { QRCode } from 'react-qr-code'; // Import QRCode for displaying QR codes

interface StickerOrderModalProps {
  show: boolean;
  onHide: () => void;
}

const StickerOrderModal: React.FC<StickerOrderModalProps> = ({ show, onHide }) => {
  const { addOrder } = useOrderContext();
  const { showToast } = useGlobalToast();

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<string>('Ordinary Matte');
  const [size, setSize] = useState<string>('1x1"');
  const [quantity, setQuantity] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash on Pickup');
  const [notes, setNotes] = useState<string>('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState('Pending'); // Set initial status
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Track if feedback is submitted

  const pcsPerSheet: Record<string, number> = {
    '1x1"': 60,
    '1.5x1.5"': 24,
    '1.5x2"': 18,
    '1.5x2.5"': 16,
    '2x2"': 15,
    '2.5x2.5"': 9,
    '2x2.5"': 12,
    '2x3"': 10,
    '3x3"': 6,
    '3.5x3.5"': 5,
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    setFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleSubmit = () => {
    if (!file || quantity < 5) {
      showToast('Please upload your design file and ensure quantity is at least 5.', 'danger');
      return;
    }

    const pricePerSheet = 8;
    const total = quantity * pricePerSheet;
    const totalPieces = pcsPerSheet[size] * quantity;

    const stickerOrder = {
      orderId: `STKR-${Date.now()}`,
      product: 'Sticker',
      type,
      size,
      file,
      quantity: totalPieces,
      sheets: quantity,
      paymentMethod,
      notes,
      total: `₱${total.toFixed(2)}`,
      deliveryMethod: 'Pickup',
      deliveryAddress: '',
      status, // Add status
      timeline: {
        Pending: new Date().toLocaleString(),
      },
    };

    addOrder(stickerOrder);
    showToast('Sticker order placed successfully!', 'success');
    setCurrentOrderId(stickerOrder.orderId); // Set the current order ID for QR code
    onHide();
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
          <Modal.Title><strong>ORDER: Stickers</strong></Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: '20px 30px' }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><strong>Selected Service</strong></Form.Label>
              <Form.Control type="text" value="Sticker" readOnly />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Type of Sticker</strong></Form.Label>
              <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
                <option>Ordinary Matte</option>
                <option>Ordinary Glossy</option>
                <option>Waterproof (Matte/Glossy) - Best as Motor Sticker</option>
                <option>Waterproof Transparent Sticker</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Sticker Size</strong></Form.Label>
              <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
                {Object.keys(pcsPerSheet).map((s) => (
                  <option key={s} value={s}>
                    {s} ({pcsPerSheet[s]} pcs/sheet)
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-1">
              <Form.Label><strong>Number of Sheets</strong></Form.Label>
              <Form.Control
                type="number"
                min={5}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(5, parseInt(e.target.value)))}
              />
              <Form.Text className="text-muted">
                You’ll get approximately <strong>{pcsPerSheet[size] * quantity}</strong> stickers.
              </Form.Text>
              <div style={{ fontSize: '0.85rem', color: 'red', marginTop: '4px' }}>
                Minimum of 5 Sheets
              </div>
            </Form.Group>

            <Form.Group className="mt-3 mb-3">
              <Form.Label><strong>Upload Your Design</strong></Form.Label>
              <div
                onClick={() => document.getElementById('sticker-design-upload')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed #6c757d',
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {file ? file.name : 'Click or drag file to upload your design'}
              </div>
              <Form.Control
                type="file"
                id="sticker-design-upload"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Payment Method</strong></Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash on Pickup">Cash on Pickup</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Paypal">Paypal</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><strong>Notes</strong></Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional instructions..."
                maxLength={300}
              />
            </Form.Group>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '10px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                Total: ₱{(quantity * 8).toFixed(2)} 
              </div>
              <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#6c757d', marginTop: '4px' }}>
                IF BULK ORDER LIKE 1000PCS UP — PRICE WILL NOW DEPEND ON THE SIZE
              </div>
            </div>
          </Form>
        </Modal.Body>

        <Modal.Footer style={{ justifyContent: 'flex-end', padding: '15px 30px' }}>
          <Button variant="danger" onClick={onHide}>
            Cancel
          </Button>
          <Button
            style={{ backgroundColor: '#1e3a8a', borderColor: '#1e3a8a', fontWeight: 'bold' }}
            onClick={handleSubmit}
          >
            Place Order
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code and Feedback Section */}
      {currentOrderId && (
        <div className="mt-4 text-center">
          <h5>Order Details</h5>
          <QRCode
            value={JSON.stringify({
              orderId: currentOrderId,
              product: 'Sticker',
              type,
              size,
              quantity,
              paymentMethod,
              total: `₱${(quantity * 8).toFixed(2)}`,
              notes,
              status,
            })}
            size={128}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
          <p className="mt-2 text-muted">
            Present this QR code when picking up your order
          </p>
          {!feedbackSubmitted && (
            <Button 
              variant="success" 
              onClick={() => setShowFeedbackModal(true)}
              style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
            >
              Feedback
            </Button>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        show={showFeedbackModal} 
        onHide={() => setShowFeedbackModal(false)} 
        onSubmit={() => {
          showToast('Thank you for your feedback!', 'success');
          setFeedbackSubmitted(true);
          setShowFeedbackModal(false);
        }} 
      />
    </>
  );
};

export default StickerOrderModal;
