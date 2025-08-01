import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

interface FeedbackModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ show, onHide, onSubmit }) => {
  const [rating, setRating] = useState(0);

  const handleRatingSubmit = () => {
    onSubmit(); // Call the submit function passed from the parent
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
        <Modal.Title>Feedback</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <p className="mb-4">How was your experience in using PrintEase and our System?</p>
        <div>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              style={{
                cursor: 'pointer',
                fontSize: '2rem',
                color: rating >= star ? '#FFD700' : '#ddd',
                margin: '0 5px',
                transition: 'color 0.2s'
              }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setRating(star)}
            >
              ★
            </span>
          ))}
        </div>
        <p className="mt-3">
          {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Please Rate Us!!'}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          style={{ backgroundColor: '#1e3a8a', borderColor: '#1e3a8a', color: 'white' }} 
          onClick={handleRatingSubmit}
          disabled={rating === 0}
        >
          Submit
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FeedbackModal;
