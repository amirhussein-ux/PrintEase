import { motion } from 'framer-motion';
import { 
  MdLocationOn, 
  MdUploadFile, 
  MdQrCode,
  MdTrackChanges 
} from "react-icons/md";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      title: "Locate Nearby Shops",
      description: "Find registered print shops in your area using our smart location services. View ratings, services offered, and real-time availability.",
      icon: <MdLocationOn className="w-8 h-8" />,
      color: "from-blue-500 to-cyan-500",
      image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    },
    {
      number: "02",
      title: "Upload & Customize",
      description: "Easily upload your files from Google Drive, Dropbox, or your device. Use our 3D customizer for personalized items like mugs and shirts.",
      icon: <MdUploadFile className="w-8 h-8" />,
      color: "from-purple-500 to-pink-500",
      image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    },
    {
      number: "03",
      title: "Track Your Order",
      description: "Monitor your print job status in real-time from 'Pending' to 'Ready for Pickup'. Get instant notifications on progress updates.",
      icon: <MdTrackChanges className="w-8 h-8" />,
      color: "from-green-500 to-emerald-500",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    },
    {
      number: "04",
      title: "QR Code Pickup",
      description: "Receive a unique QR code when your order is ready. Simply scan at the shop for quick, contactless pickup and payment.",
      icon: <MdQrCode className="w-8 h-8" />,
      color: "from-orange-500 to-red-500",
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
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
    <section id="how-it-works" className="relative py-24 bg-gradient-to-br from-blue-50 to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-20"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-200 rounded-full translate-x-1/3 translate-y-1/3 opacity-20"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How <span className="text-blue-600">PrintEase</span> Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Experience the future of printing with our seamless four-step process. 
            From finding local shops to quick QR code pickup, we've made printing simple and efficient.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Steps Section */}
          <div className="space-y-12">
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="flex gap-6 group cursor-pointer"
              >
                {/* Number and Icon Container */}
                <div className="flex-shrink-0">
                  <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-r ${step.color} shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110`}>
                    {/* Step Number */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-sm font-bold text-gray-800">{step.number}</span>
                    </div>
                    
                    {/* Icon */}
                    <div className="w-full h-full flex items-center justify-center text-white">
                      {step.icon}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visual Demo Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Main Demo Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="PrintEase Platform Demo"
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              {/* Floating Elements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-6 left-6 right-6 text-white"
              >
                <h4 className="text-xl font-semibold mb-2">Smart Printing Platform</h4>
                <p className="text-blue-100">Connecting customers with local print shops</p>
              </motion.div>
            </div>

            {/* Floating QR Code Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute -top-4 -left-4 bg-white rounded-2xl p-4 shadow-2xl border border-gray-100"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <MdQrCode className="w-12 h-12 text-white" />
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold text-gray-600">Scan to Pickup</span>
              </div>
            </motion.div>

            {/* Floating Map Pin */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="absolute -top-4 -right-4 bg-white rounded-2xl p-3 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <MdLocationOn className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">5 shops</span>
                  <span className="text-xs text-gray-500 block">near you</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Experience Easy Printing?
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of customers and shop owners who are already using PrintEase to transform their printing experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-500 transition-colors"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Find Local Shops
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Register Your Shop
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;