import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BsQrCode, 
  BsShop, 
  BsGeoAlt,
  BsGraphUp,
  BsShieldCheck,
  BsClock
} from 'react-icons/bs'
import { 
  MdOutlineManageSearch, 
  MdLocationOn,
  MdCloudUpload,
  MdPeople
} from 'react-icons/md'
import { GrDocumentCloud } from 'react-icons/gr'
import { FiUsers } from 'react-icons/fi'
import { IoStatsChart, IoCard } from 'react-icons/io5'

const platformFeatures = [
  {
    category: 'For Customers',
    features: [
      {
        name: 'Location-Based Shop Finder',
        description: 'Discover registered print shops in your area with real-time availability, ratings, and service offerings. Find the perfect shop just around the corner.',
        icon: <MdLocationOn size={28} />,
        color: 'from-blue-500 to-cyan-500',
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      },
      {
        name: 'QR Code Pickup System',
        description: 'Streamline your pickup experience with contactless QR code scanning. No more waiting in lines - scan and go!',
        icon: <BsQrCode size={28} />,
        color: 'from-green-500 to-emerald-500',
        image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      },
      {
        name: 'Real-Time Order Tracking',
        description: 'Monitor your print job progress from confirmation to ready for pickup. Get instant notifications at every stage.',
        icon: <BsClock size={28} />,
        color: 'from-purple-500 to-pink-500',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      }
    ]
  },
  {
    category: 'For Shop Owners',
    features: [
      {
        name: 'Digital Order Dashboard',
        description: 'Complete command center to manage orders, customers, and shop operations. Everything you need in one place.',
        icon: <IoStatsChart size={28} />,
        color: 'from-orange-500 to-red-500',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      },
      {
        name: 'Business Analytics',
        description: 'Track your shop performance, customer trends, and revenue growth with detailed analytics and insights.',
        icon: <BsGraphUp size={28} />,
        color: 'from-indigo-500 to-blue-500',
        image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      },
      {
        name: 'Customer Management',
        description: 'Build your customer base with profiles, order history, and loyalty tracking to grow your business.',
        icon: <MdPeople size={28} />,
        color: 'from-teal-500 to-cyan-500',
        image: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      }
    ]
  },
  {
    category: 'Platform Features',
    features: [
      {
        name: 'Cloud File Integration',
        description: 'Seamlessly upload files from Google Drive, Dropbox, and OneDrive. Secure transfer directly to your chosen shop.',
        icon: <MdCloudUpload size={28} />,
        color: 'from-yellow-500 to-orange-500',
        image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      },
      {
        name: 'Secure Payment System',
        description: 'Multiple payment options with bank-level security. Fast, reliable, and completely secure transactions.',
        icon: <IoCard size={28} />,
        color: 'from-red-500 to-pink-500',
        image: 'https://images.unsplash.com/photo-1550565118-3a14e8d0386f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      },
      {
        name: 'Smart Queue Management',
        description: 'Advanced scheduling and queue optimization to ensure timely delivery and efficient shop operations.',
        icon: <MdOutlineManageSearch size={28} />,
        color: 'from-gray-600 to-gray-800',
        image: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
      }
    ]
  }
]

export default function Services() {
  const [activeCategory, setActiveCategory] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(Array(9).fill(false))
  const servicesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleShowServices = () => {
      if (servicesRef.current) {
        const header = document.querySelector('header')
        const headerHeight = header?.getBoundingClientRect().height || 0
        const sectionTop = servicesRef.current.getBoundingClientRect().top + window.scrollY
        window.scrollTo({
          top: sectionTop - headerHeight,
          behavior: 'smooth'
        })
      }
    }

    window.addEventListener('showServices', handleShowServices)
    return () => {
      window.removeEventListener('showServices', handleShowServices)
    }
  }, [])

  const handleImgLoad = (idx: number) => {
    setImgLoaded((prev) => {
      const updated = [...prev]
      updated[idx] = true
      return updated
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  return (
    <div id="services" ref={servicesRef} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Platform <span className="text-blue-600">Features</span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            PrintEase provides comprehensive solutions for both customers and shop owners. 
            Discover how our platform makes printing easier for everyone.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {platformFeatures.map((category, index) => (
            <button
              key={category.category}
              onClick={() => setActiveCategory(index)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeCategory === index
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.category}
            </button>
          ))}
        </motion.div>

        {/* Features Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {platformFeatures[activeCategory].features.map((feature, idx) => (
              <motion.div
                key={feature.name}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 h-full">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    {!imgLoaded[idx] && (
                      <div className="w-full h-full animate-pulse bg-gray-300 absolute inset-0 z-10" />
                    )}
                    <img
                      src={feature.image}
                      alt={feature.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      style={{ opacity: imgLoaded[idx] ? 1 : 0 }}
                      onLoad={() => handleImgLoad(idx)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                    {/* Icon Badge */}
                    <div className={`absolute top-4 right-4 w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white shadow-lg`}>
                      {feature.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {feature.name}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          <div className="p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">50+</div>
            <div className="text-gray-600">Partner Shops</div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">10K+</div>
            <div className="text-gray-600">Happy Customers</div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">25K+</div>
            <div className="text-gray-600">Orders Processed</div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">99%</div>
            <div className="text-gray-600">Satisfaction Rate</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}