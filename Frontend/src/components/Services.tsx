import React from 'react';
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

const Services: React.FC = () => {
  const services = [
    {
      icon: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=100&h=100&fit=crop",
      title: "QR Code Pickup",
      description: "Streamline business transactions with our QR code system. Customers can easily track and pick up their orders by scanning QR codes, ensuring a smooth and efficient pickup process."
    },
    {
      icon: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop",
      title: "Advanced Queue Management",
      description: "Optimize your workflow with our intelligent queue management system. Prioritize jobs, track progress, and ensure timely delivery with our advanced scheduling algorithms."
    },
    {
      icon: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&h=100&fit=crop",
      title: "Document Cloud Integration",
      description: "Seamlessly integrate with popular cloud services like Google Drive, Dropbox, and OneDrive. Access, print, and manage documents directly from your preferred cloud storage platform."
    },
    {
      icon: "/pmug.png",
      title: "Mug Designs",
      description: "Design personalized mugs with your own photos, names, or messages. Create unique, memorable gifts or branded merchandise with high-quality, full-color prints on durable ceramic mugs."
    },
    {
      icon: "/pen.png",
      title: "Pen Designs",
      description: "Design personalized pens with your own names, logos, or messages. Ideal for promotional giveaways or professional branding, these high-quality pens combine functionality with a personal touch."
    },
    {
      icon: "/ecobag.png",
      title: "Ecobag Designs",
      description: "Design personalized eco bags with custom text, logos, or artwork. Perfect for gifts, promotions, or everyday use, these reusable bags offer an eco-friendly way to showcase your brand or personal style."
    },
    {
      icon: "/shirt.png",
      title: "Shirt Designs",
      description: "Create personalized shirts with your own designs, logos, or messages. Ideal for events, teams, or everyday wear, these high-quality shirts combine comfort, style, and self-expression."
    },
    {
    icon: "/tarpaulin.png",
    title: "Tarpaulin Designs",
    description: "Design personalized tarpaulins for events, business promotions, or personal use. High-quality prints available in various sizes, perfect for impactful and durable visual displays."
    }
  ];

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
