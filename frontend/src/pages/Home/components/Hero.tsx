import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { motion } from "framer-motion";
import { MdPerson } from "react-icons/md";
import { BsShop, BsQrCode, BsCloudUpload, BsClock } from "react-icons/bs";

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const { continueAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0, 0, 0.58, 1] as [number, number, number, number] }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const floatingIcons = [
    { icon: <BsQrCode className="w-6 h-6" />, top: "20%", left: "10%", delay: 0 },
    { icon: <BsCloudUpload className="w-6 h-6" />, top: "30%", right: "15%", delay: 0.3 },
    { icon: <BsClock className="w-6 h-6" />, top: "70%", left: "15%", delay: 0.6 },
    { icon: <BsShop className="w-6 h-6" />, top: "60%", right: "10%", delay: 0.9 }
  ];

  return (
    <section id="home" className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 w-full h-full z-0">
        {/* Skeleton loader */}
        {!imgLoaded && (
          <div className="w-full h-full animate-pulse bg-gray-300" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
        )}
        <img
          src="https://www.ricoh.com.ph/blogs/-/media/rph/images/discover/news/2020/ricoh-the-future-of-the-printing-industry.jpg"
          alt="PrintEase Hero Background"
          className="w-full h-full object-cover"
          style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 0.5s" }}
          onLoad={() => setImgLoaded(true)}
        />
        {/* Enhanced dark overlay for better text contrast - DARKENED */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-purple-900/50" />
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-cyan-600/20 animate-pulse" />
      </div>

      {/* Floating Icons */}
      {floatingIcons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute hidden lg:block"
          style={{ top: item.top, left: item.left, right: item.right }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ delay: item.delay, duration: 0.8 }}
        >
          <motion.div
            className="w-14 h-14 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 flex items-center justify-center text-white/60"
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {item.icon}
          </motion.div>
        </motion.div>
      ))}
      
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <motion.div 
          className="max-w-7xl px-4 py-8 mx-auto w-full text-center flex flex-col items-center justify-center"
          variants={staggerChildren}
          initial="initial"
          animate="animate"
          style={{ minHeight: "80vh" }}
        >
          <motion.div 
            className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center"
            variants={fadeInUp}
          >
            {/* Split Text Layout */}
            <div className="mb-6">
              <motion.h1 
                className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-white text-center mb-4"
                variants={fadeInUp}
              >
                Your Local Printing Services
              </motion.h1>
              <motion.h1 
                className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-center"
                variants={fadeInUp}
              >
                <span className="text-white drop-shadow-lg">
                  Now Online
                </span>
              </motion.h1>
            </div>
            
            <motion.p 
              className="max-w-3xl mb-12 text-lg md:text-xl lg:text-2xl text-blue-100 font-light leading-relaxed text-center"
              variants={fadeInUp}
            >
              PrintEase connects you with trusted local print shops for seamless ordering, 
              tracking, and pickup—all from the comfort of your home.
            </motion.p>

            {/* REMOVED LOGIN BUTTON - Only two main CTAs now */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-2xl"
              variants={fadeInUp}
            >
              {/* Primary CTA - Guest Access for Customers */}
              <button
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-2xl hover:shadow-3xl transition-all duration-200 w-full sm:w-auto min-w-[220px] group transform hover:scale-105 active:scale-95"
                onClick={async () => {
                  if (guestLoading) return;
                  setGuestLoading(true);
                  try {
                    await continueAsGuest();
                    navigate("/customer/select-shop");
                  } catch (error) {
                    console.error("Guest login failed:", error);
                  } finally {
                    setGuestLoading(false);
                  }
                }}
              >
                {guestLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Finding Local Shops...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-200">
                        <MdPerson className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Continue as Guest</div>
                        <div className="text-sm font-normal opacity-90">Find & Browse Shops</div>
                      </div>
                    </div>
                  </>
                )}
              </button>

              {/* Secondary CTA - For Shop Owners */}
              <button
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/80 rounded-2xl bg-white/10 backdrop-blur-sm hover:bg-white/20 shadow-2xl hover:shadow-3xl transition-all duration-200 w-full sm:w-auto min-w-[220px] group transform hover:scale-105 active:scale-95"
                onClick={() => navigate("/signup")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-200">
                    <BsShop className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Register Your Shop</div>
                    <div className="text-sm font-normal opacity-90">Grow Your Business</div>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Enhanced Trust indicators */}
            <motion.div 
              className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-blue-100 max-w-3xl"
              variants={fadeInUp}
            >
              <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors duration-200">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <div className="text-center">
                  <div className="font-semibold">Real-time Tracking</div>
                  <div className="text-sm opacity-80">Monitor order progress</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors duration-200">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                <div className="text-center">
                  <div className="font-semibold">Secure Cloud Upload</div>
                  <div className="text-sm opacity-80">Google Drive & Dropbox</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors duration-200">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
                <div className="text-center">
                  <div className="font-semibold">QR Code Pickup</div>
                  <div className="text-sm opacity-80">Contactless & Fast</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <div className="flex flex-col items-center gap-3 text-white/70 hover:scale-110 transition-transform duration-200">
          <span className="text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            Discover PrintEase
          </span>
          <div className="w-8 h-12 border-2 border-white/50 rounded-full flex justify-center p-1 bg-white/5 backdrop-blur-sm">
            <motion.div
              className="w-1.5 h-3 bg-cyan-400 rounded-full mt-1 shadow-lg"
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: [0.42, 0, 0.58, 1] as [number, number, number, number] }}
            />
          </div>
        </div>
      </motion.div>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-4 h-4 bg-cyan-400 rounded-full blur-sm"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="absolute top-1/3 right-1/3 w-3 h-3 bg-blue-400 rounded-full blur-sm"
          animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-purple-400 rounded-full blur-sm"
          animate={{ scale: [1, 2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 2 }}
        />
      </div>
    </section>
  );
};

export default Hero;