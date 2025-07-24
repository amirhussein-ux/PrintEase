import React from 'react';
import './About';

const About: React.FC = () => {
  return (
    <section id="about" className="about section-padding">
      <div className="container">
        <div className="about-content">
          <div className="about-image">
            <img src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=600&fit=crop" alt="About PrintEase" />
          </div>
          <div className="about-text">
            <h2>About PrintEase</h2>
            <p>
              PrintEase is an innovative web solution designed to optimize 
              the operational control and cloud-based data analysis in the 
              Philippines. By providing a seamless digital platform for 
              monitoring print projects, PrintEase enables end-to-end 
              management of printing operations from order placement to 
              delivery tracking. Our comprehensive system streamlines every 
              step. The system integrates advanced features including AI-
              driven layout management, cloud storage, and enhanced 
              security protocols to ensure data integrity and operational 
              efficiency. PrintEase is committed to transforming the printing 
              industry by enhancing transparency, improving customer 
              experience, and optimizing productivity through innovative 
              technology solutions.
            </p>
          </div>
        </div>
        <div className="upgrade-section">
          <h2>Upgrade Your Print Management</h2>
          <p>Intuitive and efficient tools for a better printing experience.</p>
        </div>
      </div>
    </section>
  );
};

export default About;
