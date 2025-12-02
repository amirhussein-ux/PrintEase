import React from 'react';
import { motion } from 'framer-motion';
import EmblaCarousel from "./Embla Carousel/EmblaCarousel";

export default function About() {
  const stats = [
    { number: '50+', label: 'Partner Print Shops' },
    { number: '10,000+', label: 'Happy Customers' },
    { number: '25,000+', label: 'Orders Processed' },
    { number: '99%', label: 'Satisfaction Rate' }
  ];

  const values = [
    {
      icon: '🚀',
      title: 'Innovation',
      description: 'Continuously evolving to bring the latest technology to the printing industry'
    },
    {
      icon: '🤝',
      title: 'Partnership',
      description: 'Building strong relationships with local businesses and communities'
    },
    {
      icon: '🔒',
      title: 'Trust',
      description: 'Ensuring secure transactions and reliable service for all users'
    },
    {
      icon: '🌱',
      title: 'Growth',
      description: 'Empowering local print shops to thrive in the digital age'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <div id="about" className="relative isolate overflow-hidden bg-gradient-to-br from-blue-50 to-white py-24 sm:py-32">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row gap-16 items-center"
        >
          {/* Left: Text Section */}
          <motion.div 
            variants={itemVariants}
            className="flex-1 max-w-2xl lg:mx-0"
          >
            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl"
            >
              Connecting{' '}
              <span className="text-blue-600">Communities</span>{' '}
              Through Print
            </motion.h2>
            
            <motion.p 
              variants={itemVariants}
              className="mt-8 text-lg md:text-xl text-gray-600 leading-relaxed text-justify"
            >
              PrintEase is the Philippines' first centralized platform revolutionizing the printing industry. 
              We bridge the gap between customers needing quick, reliable printing services and local shops 
              seeking digital transformation and business growth.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="mt-10 space-y-8"
            >
              {/* For Customers */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">For Customers</h3>
                  <p className="text-gray-600">
                    Experience unparalleled convenience, speed, and transparency. Find local shops, 
                    track orders in real-time, and enjoy contactless pickup with our QR code system.
                  </p>
                </div>
              </div>

              {/* For Shops */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏪</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">For Shop Owners</h3>
                  <p className="text-gray-600">
                    Boost your operational efficiency and digital visibility. Access new customers, 
                    streamline order management, and grow your business with our comprehensive platform.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stats Section */}
            <motion.div
              variants={containerVariants}
              className="mt-12 grid grid-cols-2 gap-8"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-blue-600">{stat.number}</div>
                  <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Carousel Section */}
          <motion.div 
            variants={itemVariants}
            className="flex-1 w-full max-w-xl"
          >
            <div className="relative">
              <EmblaCarousel />
              
              {/* Floating Value Cards */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                viewport={{ once: true }}
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 max-w-xs"
              >
                <h4 className="font-semibold text-gray-900 mb-3">Our Values</h4>
                <div className="space-y-3">
                  {values.slice(0, 2).map((value, index) => (
                    <div key={value.title} className="flex items-center gap-3">
                      <span className="text-2xl">{value.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{value.title}</div>
                        <div className="text-xs text-gray-500">{value.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                viewport={{ once: true }}
                className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 max-w-xs"
              >
                <h4 className="font-semibold text-gray-900 mb-3">Our Mission</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  To transform the printing industry by creating a connected ecosystem where 
                  local businesses thrive and customers enjoy seamless printing experiences.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Full Values Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center group hover:shadow-xl transition-all duration-300"
            >
              <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {value.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Join the Printing Revolution
            </h3>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Whether you're a customer looking for convenient printing or a shop owner ready to grow, 
              PrintEase is your partner in success.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Start Printing Today
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Partner With Us
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}