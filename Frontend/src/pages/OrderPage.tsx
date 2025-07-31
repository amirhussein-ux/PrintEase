import React, { useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useOrderContext } from '../contexts/OrdersContext'; // Import your OrdersContext

// Import your modals here
import StickerOrderModal from './modals/StickerOrderModal';
import TShirtOrderModal from './modals/TShirtOrderModal';
import MotorplateOrderModal from './modals/MotorPlateOrderModal';
import NotepadOrderModal from './modals/NotepadOrderModal';
import PVCIDOrderModal from './modals/PVCIDModal';
import RefMagnetOrderModal from './modals/RefMagnetOrderModal';
import CardsOrderModal from './modals/CardsOrderModal';
import TarpaulinOrderModal from './modals/TarpaulinOrderModal';
import MousepadOrderModal from './modals/CustomizedMousePadOrderModal';
import MugOrderModal from './modals/MugOrderModal';
import LTFRBStickerOrderModal from './modals/LTFRBStickerOrderModal';

import './OrderPage.css';

const services = [
  { title: 'Stickers', description: 'Waterproof custom sticker printing', image: '/src/assets/sticker.png' },
  { title: 'T-Shirt', description: 'Customized high-quality shirt printing', image: '/src/assets/shirt.png' },
  { title: 'Motorplate', description: 'Custom designed motorplate for vehicles', image: '/src/assets/motorplate.png' },
  { title: 'Customized Notepads', description: 'Custom printed notepads with your logo', image: '/src/assets/notepad.png' },
  { title: 'PVC ID', description: 'High-quality ID cards for schools, offices, and more', image: '/src/assets/pvcid.png' },
  { title: 'Customized Ref Magnet', description: 'Promotional ref magnets with your branding', image: '/src/assets/refmagnet.png' },
  { title: 'Calling Cards / Loyalty / Membership Cards', description: 'Professional business and loyalty cards', image: '/src/assets/cards.png' },
  { title: 'Tarpaulin', description: 'Large format tarpaulin printing for any event', image: '/src/assets/tarpaulin.png' },
  { title: 'Customized Mousepad', description: 'Mousepads with personalized design', image: '/src/assets/mousepad.png' },
  { title: 'Mugs', description: 'Custom printed mugs for personal or corporate use', image: '/src/assets/mug.png' },
  { title: 'LTFRB Sticker', description: 'Authorized LTFRB-compliant sticker printing', image: '/src/assets/ltfrbsticker.png' },
];

const OrderPage: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { addOrder } = useOrderContext(); // Get the addOrder function from context

  const handleCardClick = (title: string) => {
    setSelectedService(title);
  };

  const closeModal = () => {
    setSelectedService(null);
  };

  const handlePlaceOrder = (orderData: any) => {
    console.log('Order placed:', orderData);
    addOrder(orderData); // Add the order to the context
    closeModal();
  };

  const renderRows = () => {
    const rows = [
      services.slice(0, 4),
      services.slice(4, 8),
      services.slice(8, 11),
    ];

    return rows.map((rowItems, rowIndex) => (
      <Row
        key={rowIndex}
        className={`justify-content-${rowItems.length < 4 ? 'center' : 'start'} mb-4`}
      >
        {rowItems.map((service, index) => (
          <Col key={index} xs={12} sm={6} md={3} className="mb-4">
            <Card
              className="h-100 d-flex flex-column service-card"
              onClick={() => handleCardClick(service.title)}
            >
              <Card.Img
                variant="top"
                src={service.image}
                alt={service.title}
                className="service-image"
              />
              <Card.Body className="d-flex flex-column">
                <Card.Title>{service.title}</Card.Title>
                <Card.Text>{service.description}</Card.Text>
                <div className="mt-auto">
                  <Button className="order-now-button w-100" onClick={() => handleCardClick(service.title)}>
                    <strong>Order Now</strong>
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    ));
  };

  return (
    <Container className="order-page-container my-5">
      <h2 className="text-center mb-4">Place Your Order</h2>
      {renderRows()}

      {/* Conditional modals */}
      {selectedService === 'Stickers' && <StickerOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'T-Shirt' && <TShirtOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'Motorplate' && <MotorplateOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'Customized Notepads' && <NotepadOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'PVC ID' && <PVCIDOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'Customized Ref Magnet' && <RefMagnetOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'Calling Cards / Loyalty / Membership Cards' && <CardsOrderModal show onHide={closeModal} onSubmit={handlePlaceOrder} />}
      {selectedService === 'Tarpaulin' && <TarpaulinOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'Customized Mousepad' && <MousepadOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'Mugs' && <MugOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
      {selectedService === 'LTFRB Sticker' && <LTFRBStickerOrderModal show onHide={closeModal} onPlaceOrder={handlePlaceOrder} />}
    </Container>
  );
};

export default OrderPage;
