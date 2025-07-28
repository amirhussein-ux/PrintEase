import React, { useState } from 'react';
import './Feedback.css';

interface TestimonialProps {
  name: string;
  role: string;
  image: string;
  rating: number;
  text: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ name, role, image, rating, text }) => (
  <div className="testimonial">
    <div className="testimonial-header">
      <img src={image} alt={name} className="testimonial-image" />
      <div className="testimonial-info">
        <h4>{name}</h4>
        <p>{role}</p>
        <div className="rating">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={i < rating ? 'star filled' : 'star'}>★</span>
          ))}
        </div>
      </div>
    </div>
    <p className="testimonial-text">{text}</p>
  </div>
);

const Feedback: React.FC = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  const testimonials = [
    {
      name: "Maria Santos",
      role: "Small Business Owner",
      image: "image: https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80&q=80",
      rating: 5,
      text: "PrintEase has revolutionized how we manage our print shop. It saves us much time!"
    },
    {
      name: "John Rodriguez",
      role: "Print Shop Manager",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
      rating: 5,
      text: "The queue management system is incredible. Our customers love the efficiency!"
    },
    {
      name: "Sarah Chen",
      role: "Office Administrator",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
      rating: 4,
      text: "Cloud integration makes document printing so much easier. Highly recommended!"
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
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
          <Testimonial {...testimonials[currentTestimonial]} />
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
