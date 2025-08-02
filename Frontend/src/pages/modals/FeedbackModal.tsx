import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface FeedbackModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ show, onHide, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Here you would normally send the feedback to your backend
    console.log({
      rating,
      feedback: feedback || 'No additional feedback',
      timestamp: new Date().toISOString()
    });

    // Reset form
    setRating(0);
    setHoveredRating(0);
    setFeedback('');
    setIsSubmitting(false);
    
    onSubmit();
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setFeedback('');
    onHide();
  };

  const getRatingMessage = (stars: number) => {
    switch(stars) {
      case 1: return "Poor - We'll do better next time";
      case 2: return "Fair - Room for improvement";
      case 3: return "Good - Thanks for your feedback";
      case 4: return "Great - We're glad you're satisfied";
      case 5: return "Excellent - Thank you for choosing PrintEase!";
      default: return "Please Rate Your Experience";
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header 
        closeButton 
        style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: 'white',
          border: 'none'
        }}
      >
        <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}></span>
          Share Your Experience
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '2rem' }}>
        {/* Header Message */}
        <div className="text-center mb-4">
          <h5 style={{ color: '#1e3a8a', marginBottom: '0.5rem' }}>
            How was your experience with PrintEase?
          </h5>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            Your feedback helps us improve our services for everyone
          </p>
        </div>

        {/* Star Rating */}
        <div className="text-center mb-4">
          <div style={{ marginBottom: '1rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                style={{
                  cursor: 'pointer',
                  fontSize: '2.5rem',
                  color: star <= (hoveredRating || rating) ? '#FFD700' : '#ddd',
                  margin: '0 8px',
                  transition: 'all 0.2s ease',
                  textShadow: star <= (hoveredRating || rating) ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
                  transform: star <= (hoveredRating || rating) ? 'scale(1.1)' : 'scale(1)'
                }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
              >
                ★
              </span>
            ))}
          </div>
          <p style={{ 
            color: rating > 0 ? '#1e3a8a' : '#6b7280',
            fontWeight: rating > 0 ? 'bold' : 'normal',
            fontSize: '1rem',
            minHeight: '24px'
          }}>
            {getRatingMessage(rating)}
          </p>
        </div>

        {/* Feedback Text */}
        <Form.Group className="mb-4">
          <Form.Label style={{ color: '#374151', fontWeight: '500' }}>
            💭 Additional Feedback (Optional)
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Tell us about your experience, suggestions for improvement, or anything else you'd like to share..."
            value={feedback}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
            style={{
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '0.95rem',
              resize: 'none'
            }}
          />
        </Form.Group>

        {/* Thank You Message */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd',
          borderRadius: '10px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{ 
            margin: 0, 
            color: '#0369a1',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Thank you for choosing PrintEase! Your feedback is valuable to us. 🙏 
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ 
        padding: '1.5rem 2rem',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb'
      }}>
        <Button 
          variant="outline-secondary" 
          onClick={handleClose}
          disabled={isSubmitting}
          style={{
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: '500'
          }}
        >
          Cancel
        </Button>
        <Button 
          variant="primary"
          onClick={handleRatingSubmit}
          disabled={rating === 0 || isSubmitting}
          style={{ 
            background: rating === 0 ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isSubmitting ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Sending...
            </>
          ) : (
            <>
              Submit Feedback
            </>
          )}
        </Button>
      </Modal.Footer>

      {/* Add CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
};

export default FeedbackModal;
