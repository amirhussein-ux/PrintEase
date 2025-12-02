import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactMethods = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Phone Support',
      details: '+63 (2) 1234-5678',
      description: 'Mon-Fri from 8am to 6pm',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Us',
      details: 'support@printease.com',
      description: 'We reply within 24 hours',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Visit Office',
      details: 'Manila, Philippines',
      description: 'Come say hello at our office',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Response Time',
      details: 'Within 24 hours',
      description: 'For all customer inquiries',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const faqs = [
    {
      question: 'How do I register my print shop?',
      answer: 'Click "Register Your Shop" in the header, fill out the business details, and our team will verify and onboard you within 24 hours.'
    },
    {
      question: 'Is there a fee for customers to use PrintEase?',
      answer: 'No, PrintEase is completely free for customers. You only pay for the printing services from the shops you choose.'
    },
    {
      question: 'How do I track my order?',
      answer: 'After placing an order, you can track its status in real-time through your dashboard. You\'ll also receive notifications at each stage.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept GCash, Maya, credit/debit cards, and cash on pickup. Payment options may vary by shop.'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
    
    // Show success message
    alert('Thank you for your message! We\'ll get back to you soon.');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

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
        ease: [0, 0, 0.58, 1] as [number, number, number, number]
      }
    }
  };

  return (
    <section id="contact" className="relative py-24 bg-gradient-to-br from-blue-900 to-gray-900 text-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-600 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Header - Centered like Hero section */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="mb-6">
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white text-center mb-4"
                variants={itemVariants}
              >
                Get In Touch With
              </motion.h2>
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-center"
                variants={itemVariants}
              >
                <span className="text-cyan-300 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  PrintEase
                </span>
              </motion.h2>
            </div>
            <motion.p 
              className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              Have questions? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Methods */}
            <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
              {contactMethods.map((method) => (
                <motion.div
                  key={method.title}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${method.color} flex items-center justify-center text-white shadow-md`}>
                      {method.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{method.title}</h3>
                      <p className="text-cyan-100 font-medium">{method.details}</p>
                      <p className="text-blue-200 text-sm">{method.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* FAQ Preview */}
              <motion.div
                variants={itemVariants}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">Quick Answers</h3>
                </div>
                <div className="space-y-3">
                  {faqs.slice(0, 2).map((faq, index) => (
                    <div key={index} className="border-l-2 border-cyan-400 pl-3">
                      <p className="text-cyan-100 font-medium text-sm">{faq.question}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                  View all FAQs →
                </button>
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Send us a Message</h3>
                <p className="text-gray-600 mb-8">Fill out the form below and we'll get back to you soon.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="What is this regarding?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Send Message
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>

          {/* Office Location Section */}
          <motion.div
            variants={itemVariants}
            className="mt-20 bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20"
          >
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-4">Visit Our Office</h3>
                <p className="text-blue-100 mb-6 leading-relaxed">
                  Located in the heart of Manila, our team is ready to welcome you. 
                  Come discuss your printing needs or learn more about partnering with PrintEase.
                </p>
                <div className="space-y-3 text-blue-100">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-cyan-400" />
                    <span>223 Ortega, San Juan City, Metro Manila</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <span>Monday - Saturday: 8:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <span>printease@business.com</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 h-64 lg:h-80 rounded-2xl overflow-hidden border border-white/20">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.082682132707!2d121.03758937587432!3d14.594364277227719!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c82e63228c75%3A0xf48b60882ff9710a!2sPolytechnic%20University%20of%20the%20Philippines%20-%20San%20Juan!5e0!3m2!1sen!2sph!4v1764523138755!5m2!1sen!2sph"
                  width="100%" 
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;