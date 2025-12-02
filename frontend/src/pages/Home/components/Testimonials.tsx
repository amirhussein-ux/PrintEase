"use client";
import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TestimonialType = {
  text: string;
  author: string;
  role: string;
  image: string;
  rating: number;
  type: 'customer' | 'shop';
};

const testimonials: TestimonialType[] = [
  {
    text: "PrintEase completely transformed how I handle printing needs. Finding local shops with real-time availability and tracking my orders has never been easier!",
    author: "Maria Santos",
    role: "Small Business Owner",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    rating: 5,
    type: 'customer'
  },
  {
    text: "Since joining PrintEase, our shop has seen a 40% increase in customers. The digital order management system saves us hours every day!",
    author: "Juan Dela Cruz",
    role: "Print Shop Owner",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    rating: 5,
    type: 'shop'
  },
  {
    text: "The QR code pickup system is genius! No more waiting in line. I can track my order and just scan to pick up. Absolutely love this platform!",
    author: "Sarah Chen",
    role: "College Student",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    rating: 5,
    type: 'customer'
  },
  {
    text: "As a printing shop owner, PrintEase gave us the digital presence we needed. The analytics help us understand customer trends and grow strategically.",
    author: "Roberto Lim",
    role: "Printing Business Owner",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    rating: 5,
    type: 'shop'
  },
  {
    text: "I used to drive across town for printing. Now with PrintEase, I discovered an amazing shop just 5 minutes away! The platform is a game-changer.",
    author: "Andrea Torres",
    role: "Freelance Designer",
    image: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    rating: 5,
    type: 'customer'
  },
  {
    text: "The customer management features helped us build lasting relationships with our clients. PrintEase isn't just a platform, it's a growth partner.",
    author: "Michael Tan",
    role: "Print Shop Manager",
    image: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    rating: 5,
    type: 'shop'
  }
];

/** Hook: true on screens <= 640px */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile("matches" in e ? e.matches : (e as MediaQueryList).matches);

    setIsMobile(mql.matches);
    // Support old + new listeners
    // @ts-ignore
    mql.addEventListener ? mql.addEventListener("change", onChange) : mql.addListener(onChange);
    return () => {
      // @ts-ignore
      mql.removeEventListener ? mql.removeEventListener("change", onChange) : mql.removeListener(onChange);
    };
  }, [breakpoint]);
  return isMobile;
}

export default function Testimonials() {
  const [index, setIndex] = useState<number>(0);
  const [filter, setFilter] = useState<'all' | 'customer' | 'shop'>('all');
  const isMobile = useIsMobile();

  const filteredTestimonials = testimonials.filter(
    testimonial => filter === 'all' || testimonial.type === filter
  );

  const getPosition = (i: number) => {
    const currentIndex = filteredTestimonials.indexOf(testimonials[i]);
    if (currentIndex === -1) return "hidden";
    if (currentIndex === index) return "center";
    if (currentIndex === (index + 1) % filteredTestimonials.length) return "next";
    if (currentIndex === (index - 1 + filteredTestimonials.length) % filteredTestimonials.length) return "prev";
    return "hidden";
  };

  // Auto-advance testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % filteredTestimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [filteredTestimonials.length]);

  // Offsets
  const DESKTOP_X = 300;
  const MOBILE_Y = 70;
  const SIDE_SCALE = 0.92;
  const SIDE_OPACITY = 0.55;

  // Fast transition durations
  const FAST_TRANSITION = {
    duration: 0.3,
    ease: [0.42, 0, 0.58, 1] as [number, number, number, number]
  };

  return (
    <section className="w-full py-20 bg-gradient-to-b from-white via-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={FAST_TRANSITION}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h3 className="text-blue-600 font-semibold text-lg mb-3">Testimonials</h3>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Loved by Customers & Shop Owners
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover how PrintEase is transforming the printing experience for everyone in the community
          </p>
        </motion.div>

        {/* Filter Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }} // Faster
          viewport={{ once: true }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100 inline-flex">
            {[
              { key: 'all', label: 'All Reviews' },
              { key: 'customer', label: 'Customers' },
              { key: 'shop', label: 'Shop Owners' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setFilter(key as any);
                  setIndex(0);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Testimonials Stage */}
        <div className="relative flex justify-center items-center w-full overflow-visible px-4">
          <div className="relative w-full max-w-4xl h-[28rem] sm:h-96">
            <AnimatePresence mode="sync"> {/* Changed from "wait" to "sync" */}
              {testimonials.map((t, i) => {
                const pos = getPosition(i);
                if (pos === "hidden") return null;

                const x = isMobile
                  ? 0
                  : pos === "center"
                  ? 0
                  : pos === "prev"
                  ? -DESKTOP_X
                  : DESKTOP_X;

                const y = isMobile
                  ? pos === "center"
                    ? 0
                    : pos === "prev"
                    ? -MOBILE_Y
                    : MOBILE_Y
                  : 0;

                const scale = pos === "center" ? 1 : SIDE_SCALE;
                const opacity = pos === "center" ? 1 : SIDE_OPACITY;
                const zIndex = pos === "center" ? 30 : pos === "prev" ? 20 : 10;

                return (
                  <motion.div
                    key={`${t.author}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9, x: isMobile ? 0 : 100 }}
                    animate={{ 
                      x, 
                      y, 
                      scale, 
                      opacity, 
                      zIndex,
                      transition: {
                        type: "tween",
                        duration: 0.3,
                        ease: [0.42, 0, 0.58, 1] as [number, number, number, number]
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.9,
                      x: isMobile ? 0 : -100,
                      transition: {
                        duration: 0.2,
                        ease: [0.42, 0, 1, 1] as [number, number, number, number]
                      }
                    }}
                    onClick={() => setIndex(filteredTestimonials.indexOf(t))}
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full rounded-2xl p-8 shadow-2xl cursor-pointer border transition-colors ${
                      pos === "center" 
                        ? t.type === 'customer' 
                          ? "bg-blue-900 text-white border-blue-700" 
                          : "bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-blue-700"
                        : "bg-white text-gray-800 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {/* Quote Icon */}
                    <div className={`mb-4 ${
                      pos === "center" ? "text-blue-300" : "text-gray-400"
                    }`}>
                      <Quote size={24} className="opacity-50" />
                    </div>

                    {/* Stars */}
                    <div className="flex space-x-1 mb-4">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            pos === "center" 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "fill-yellow-400 text-yellow-400"
                          }`}
                          fill="currentColor"
                        />
                      ))}
                    </div>

                    {/* Text */}
                    <blockquote className="text-lg font-medium leading-relaxed mb-6">
                      "{t.text}"
                    </blockquote>

                    {/* Author */}
                    <div className="flex items-center space-x-4">
                      <img 
                        src={t.image} 
                        alt={t.author} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" 
                      />
                      <div>
                        <p className="font-semibold">{t.author}</p>
                        <p className={`text-sm ${
                          pos === "center" ? "text-blue-200" : "text-gray-500"
                        }`}>
                          {t.role}
                        </p>
                        <div className={`inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          t.type === 'customer'
                            ? pos === "center" 
                              ? "bg-blue-700 text-blue-100" 
                              : "bg-blue-100 text-blue-700"
                            : pos === "center"
                              ? "bg-indigo-700 text-indigo-100"
                              : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {t.type === 'customer' ? '👤 Customer' : '🏪 Shop Owner'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Dots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }} // Faster
          viewport={{ once: true }}
          className="flex justify-center mt-8 space-x-3"
        >
          {filteredTestimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === index 
                  ? filter === 'customer' 
                    ? 'bg-blue-600' 
                    : filter === 'shop'
                    ? 'bg-indigo-600'
                    : 'bg-blue-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={FAST_TRANSITION}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
            <div className="text-3xl font-bold text-blue-600 mb-2">4.9/5</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
            <div className="text-3xl font-bold text-green-600 mb-2">95%</div>
            <div className="text-gray-600">Would Recommend</div>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
            <div className="text-3xl font-bold text-purple-600 mb-2">2min</div>
            <div className="text-gray-600">Average Pickup Time</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}