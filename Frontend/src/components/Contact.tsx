import React, { useState } from 'react';
import './Contact.css';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <section id="contact" className="contact section-padding">
      <div className="container">
        <div className="contact-header">
          <h2>CONTACT</h2>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <div className="map-container">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2295.79836472106!2d121.11117763653667!3d14.595814768810376!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b9c064b02175%3A0x350013eb95669063!2sJCJ%20Designs%20and%20Printing%20Services!5e0!3m2!1sen!2sph!4v1754009012677!5m2!1sen!2sph"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="contact-details">
              <div className="logo-section">
                <img src="/src/assets/logo.png" alt="PrintEase" className="contact-logo" />
              </div>
              <div className="contact-item">
                <strong>Email and Facebook:</strong>
                <p>contact@printease.com</p>
                <p>@jcjdesignsandprints</p>
              </div>
              <div className="contact-item">
                <strong>Phone:</strong>
                <p>0997-992-0038 / 0905-249-5867</p>
              </div>
              <div className="contact-item">
                <strong>Address:</strong>
                <p>BLOCK 30 LOT 4A, VILLAGE EAST EXECUTIVE HOMES, STO. DOMINGO, CAINTA, RIZAL</p>
              </div>
            </div>
          </div>
          <div className="contact-form">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
              <textarea
                name="message"
                placeholder="Message"
                rows={6}
                value={formData.message}
                onChange={handleChange}
                required
              ></textarea>
              <button type="submit" className="btn btn-primary">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;