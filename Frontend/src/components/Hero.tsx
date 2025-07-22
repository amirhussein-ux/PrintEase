import React from 'react';
import './Hero.css';

const Hero: React.FC = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-background">
        <img src="/src/assets/homeBackground.jpg" alt="Printing Operations" />
      </div>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <h1 className="hero-title">
          Streamline Your <span className="highlight">Printing</span><br />
          Operations
        </h1>
        <p className="hero-subtitle">
          Efficient solutions for modern print shop needs.
        </p>
        <div className="hero-buttons">
          <a href="#login" className="btn btn-primary">LOGIN</a>
          <a href="#about" className="btn btn-secondary">CONTINUE AS CUSTOMER</a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
