import React, { createContext, useContext, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

interface ToastContextType {
  showToast: (message: string, variant?: 'success' | 'danger' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useGlobalToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string>('');
  const [variant, setVariant] = useState<'success' | 'danger' | 'info' | 'warning'>('success');
  const [show, setShow] = useState<boolean>(false);

  const showToast = (msg: string, type: 'success' | 'danger' | 'info' | 'warning' = 'success') => {
    setMessage(msg);
    setVariant(type);
    setShow(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* ✅ ToastContainer directly on bottom-start (left) */}
      <ToastContainer
        position="bottom-start"
        className="p-3"
        style={{
          zIndex: 9999,
          position: 'fixed', // Set position to fixed
          bottom: '20px',    // Adjust bottom spacing as needed
          left: '20px',      // Adjust left spacing as needed
        }}
      >
        <Toast
          bg={variant}
          onClose={() => setShow(false)}
          show={show}
          delay={3000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className="text-white fw-bold">{message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </ToastContext.Provider>
  );
};
