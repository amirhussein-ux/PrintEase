import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import Header from './Header';
import Hero from './Hero';
import About from './About';
import Services from './Services';
import Feedback from './Feedback';
import Contact from './Contact';
import ChatWidget from './ChatWidget';

const LandingWrapper: React.FC = () => {
  const [showLogoutToast, setShowLogoutToast] = useState(false);

  useEffect(() => {
    const logoutFlag = localStorage.getItem('logoutToast');
    if (logoutFlag === 'true') {
      setShowLogoutToast(true);
      localStorage.removeItem('logoutToast');
    }
  }, []);

  return (
    <>
      {/* Landing Page Components */}
      <Header />
      <Hero />
      <About />
      <Services />
      <Feedback />
      <Contact />
      <ChatWidget />

      {/* Toast */}
      <ToastContainer position="bottom-start" className="p-3">
        <Toast
          bg="success"
          show={showLogoutToast}
          onClose={() => setShowLogoutToast(false)}
          delay={3000}
          autohide
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto text-white">Logged Out</strong>
          </Toast.Header>
          <Toast.Body className="text-white fw-bold">
            Successfully logged out.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default LandingWrapper;