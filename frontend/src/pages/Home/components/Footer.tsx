import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear: number = new Date().getFullYear();
  
  const footerLinks = [
    { to: "/terms", label: "Terms & Conditions" },
    { to: "/about", label: "About Us" },
    { to: "/contact", label: "Contact" },
    { to: "/privacy", label: "Privacy Policy" },
  ];

  return (
    <footer className={`bg-gray-900 text-white py-8 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold">PrintEase</h3>
            <p className="text-gray-400 text-sm mt-2">
              Connecting customers with print shops
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to} 
                className="text-gray-300 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} PrintEase. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;