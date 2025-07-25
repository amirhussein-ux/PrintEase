import React from 'react';
import { useAppContext } from '../../context/AppContext';
import './Services.css';

interface ServiceProps {
  icon: string;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceProps> = ({ icon, title, description }) => (
  <div className="service-card">
    <div className="service-icon">
      <img src={icon} alt={title} />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);


// This page is non-editable and only displays the list of services from context.
const Services: React.FC = () => {
  const { services } = useAppContext();

  return (
    <section id="services" className="services section-padding">
      <div className="container">
        <div className="services-header">
          <h2>SERVICES</h2>
        </div>
        <div className="services-grid">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
