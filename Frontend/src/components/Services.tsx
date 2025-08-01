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
      icon: "/pmug.png",
      title: "Mug Designs",
      description: "Design personalized mugs with your own photos, names, or messages. Create unique, memorable gifts or branded merchandise with high-quality, full-color prints on durable ceramic mugs."
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
    },
    {
      icon: "/cards.png",
      title: "Business Cards",
      description: "Create sleek and professional business cards tailored to your brand. Choose from premium finishes and customizable layouts to make a lasting first impression."
    },
    {
      icon: "/ltfrbsticker.png",
      title: "LTFRB Stickers",
      description: "Order LTFRB-compliant stickers for transport vehicles. Designed for durability and visibility, perfect for legal and official transport use."
    },
    {
      icon: "/motorplate.png",
      title: "Motorcycle Plate",
      description: "Customize motorcycle plates with clear, durable prints. Ideal for display or replacement purposes with designs that follow local standards."
    },
    {
      icon: "/mousepad.png",
      title: "Custom Mousepads",
      description: "Personalize mousepads with your chosen design or logo. Smooth surface and anti-slip backing make them great for workspaces and gaming setups."
    },
    {
      icon: "/notepad.png",
      title: "Custom Notepads",
      description: "Design branded or personalized notepads for everyday use. Great for offices, schools, or promotional giveaways with your own custom design."
    },
    {
      icon: "/pvcid.png",
      title: "PVC ID Cards",
      description: "Print high-quality PVC ID cards for schools, offices, or events. Durable and waterproof with clear photo and text visibility."
    },
    {
      icon: "/refmagnet.png",
      title: "Refrigerator Magnets",
      description: "Create fun or branded ref magnets that stick and stay. Perfect for promotions, reminders, or decorative home use."
    },
    {
      icon: "/sticker.png",
      title: "Custom Stickers",
      description: "Design and print stickers in any shape or size. Great for branding, packaging, or just for fun—water-resistant and long-lasting."
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
