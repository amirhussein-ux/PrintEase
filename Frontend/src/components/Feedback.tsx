import React, { useState } from 'react';
import './Feedback.css';

interface TestimonialProps {
  text: string;
  name: string;
  rating: number;
}

const Testimonial: React.FC<TestimonialProps> = ({ text, name, rating }) => (
  <div className="testimonial">
    <div className="rating">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < rating ? 'star filled' : 'star'}>★</span>
      ))}
    </div>
    <p className="testimonial-text">{text}</p>
    <p className="testimonial-author">- <em>{name}</em></p>
  </div>
);

const Feedback: React.FC = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  const testimonials = [
    {
      name: "Maria Santos",
      rating: 5,
      text: "PrintEase has revolutionized how we manage our print shop. It saves us much time!"
    },
    {
      name: "John Rodriguez",
      rating: 5,
      text: "The queue management system is incredible. Our customers love the efficiency!"
    },
    {
      name: "Sarah Chen",
      rating: 4,
      text: "Cloud integration makes document printing so much easier. Highly recommended!"
    }
  ];

  const nextTestimonial = () => {
    setDirection('left');
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setDirection('right');
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="feedback" className="feedback section-padding">
      <div className="container">
        <div className="feedback-header">
          <h2>FEEDBACK</h2>
        </div>
        <div className="testimonial-slider">
          <button className="slider-btn prev" onClick={prevTestimonial}>‹</button>
          <div className={`testimonial-container slide-${direction}`}>
            <Testimonial {...testimonials[currentTestimonial]} />
          </div>
          <button className="slider-btn next" onClick={nextTestimonial}>›</button>
        </div>
        <div className="testimonial-dots">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentTestimonial ? 'active' : ''}`}
              onClick={() => setCurrentTestimonial(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Feedback;
