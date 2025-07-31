import React, { useState } from 'react';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="header">
      <nav className="nav">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <img src="/src/assets/logo.png" alt="PrintEase" />
            </div>
            <ul className={`nav-menu ${isMenuOpen ? 'nav-menu-open' : ''}`}>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#feedback">Feedback</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <button 
              className="menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;