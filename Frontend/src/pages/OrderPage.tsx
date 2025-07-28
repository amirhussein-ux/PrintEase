import React, { useState, useEffect } from 'react';
import MugOrderModal from './modals/MugOrderModal';
import TShirtOrderModal from './modals/TShirtOrderModal';
import EcoBagOrderModal from './modals/EcoBagOrderModal';
import PenOrderModal from './modals/PenOrderModal';
import TarpaulinOrderModal from './modals/TarpaulinOrderModal';
import DocumentOrderModal from './modals/DocumentOrderModal';
import { useOrderContext } from '../contexts/OrdersContext';
import { useGlobalToast } from '../contexts/NotificationContext'; // ✅ Import global toast
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
    title: 'Document Printing',
    description: 'Print your documents with ease and quality',
    image: '/src/assets/paper.png',
  },
];

const OrderPage: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { addOrder } = useOrderContext();
  const { showToast } = useGlobalToast(); // ✅ Use global toast

  const closeModal = () => setSelectedService(null);

  const handlePlaceOrder = (order: any) => {
    addOrder(order);
    showToast(`${order.product} order has been placed successfully!`, 'success'); // ✅ Global toast
  };

  useEffect(() => {
    const justLoggedIn = localStorage.getItem('loginSuccess');
    const username = localStorage.getItem('loggedInUsername');
    if (justLoggedIn && username) {
      showToast(`Successfully logged in as, ${username}!`, 'success'); // ✅ Global toast
      localStorage.removeItem('loginSuccess');
    }
  }, [showToast]);

  return (
    <div className="order-page">
      <h1 className="order-title">Order Printing Services</h1>
      <div className="service-grid">
        {services.map((service, index) => (
          <div className="service-card" key={index}>
            <img src={service.image} alt={service.title} className="service-image" />
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <button
              className="select-button"
              onClick={() => setSelectedService(service.title)}
            >
              Select
            </button>
          </div>
        ))}
      </div>

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
    </div>
  );
};

export default OrderPage;
