import React, { useState } from 'react';
import MugOrderModal from './modals/MugOrderModal';
import TShirtOrderModal from './modals/TShirtOrderModal';
import EcoBagOrderModal from './modals/EcoBagOrderModal';
import PenOrderModal from './modals/PenOrderModal';
import TarpaulinOrderModal from './modals/TarpaulinOrderModal';
import DocumentOrderModal from './modals/DocumentOrderModal'; // ✅ New modal
import { Toast, ToastContainer } from 'react-bootstrap';
import { useOrderContext } from '../contexts/OrdersContext';
import './OrderPage.css';

const services = [
  {
    title: 'Mug Printing',
    description: 'Custom printed mugs for personal or business use',
    image: '/src/assets/mug.png',
  },
  {
    title: 'T-Shirt Printing',
    description: 'High-quality prints on various shirt styles and sizes',
    image: '/src/assets/shirt.png',
  },
  {
    title: 'Eco Bag Printing',
    description: 'Environmentally friendly custom printed bags',
    image: '/src/assets/ecobag.png',
  },
  {
    title: 'Pen Printing',
    description: 'Customized pens with your logo or message',
    image: '/src/assets/pen.png',
  },
  {
    title: 'Tarpaulin Printing',
    description: 'Custom printed tarpaulins in various styles and sizes',
    image: '/src/assets/tarpaulin.png',
  },
  {
    title: 'Document Printing', // ✅ Added service
    description: 'Print your documents with ease and quality',
    image: '/src/assets/paper.png',
  },
];

const OrderPage: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { addOrder } = useOrderContext();

  const closeModal = () => setSelectedService(null);

const handlePlaceOrder = (order: any) => {
  addOrder(order);
  setToastMessage(`Order has been placed successfully!`);
  setShowToast(true);
};

  return (
    <div className="order-page">
      <h1 className="order-title">Order Printing Services</h1>
      <div className="service-grid">
        {services.map((service, index) => (
          <div
            className="service-card"
            key={index}
            onClick={() => setSelectedService(service.title)}
            style={{ cursor: 'pointer' }}
            tabIndex={0}
            role="button"
            onKeyPress={e => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedService(service.title);
            }}
          >
            <img src={service.image} alt={service.title} className="service-image" />
            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </div>
        ))}
      </div>

      {/* 🔄 Dynamic Modals with handlePlaceOrder passed in */}
      {selectedService === 'Mug Printing' && (
        <MugOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />
      )}
      {selectedService === 'T-Shirt Printing' && (
        <TShirtOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />
      )}
      {selectedService === 'Eco Bag Printing' && (
        <EcoBagOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />
      )}
      {selectedService === 'Pen Printing' && (
        <PenOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />
      )}
      {selectedService === 'Tarpaulin Printing' && (
        <TarpaulinOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />
      )}
      {selectedService === 'Document Printing' && (
        <DocumentOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />
      )}

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={5000}
          autohide
          bg="success"
        >
          <Toast.Header>
            <strong className="me-auto">Order Placed</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default OrderPage;
