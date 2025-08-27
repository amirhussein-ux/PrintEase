"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

type TestimonialType = {
  text: string;
  author: string;
  role: string;
  image: string;
  rating: number;
};

const testimonials: TestimonialType[] = [
  {
    text: "Qui dolor enim consectetur do et non ex amet culpa sint in ea non dolore.",
    author: "Judith Black",
    role: "CEO of Workcation",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5,
  },
  {
    text: "Amet elit laborum culpa irure incididunt adipisicing culpa amet officia exercitation.",
    author: "Michael Green",
    role: "Founder of Startup Inc.",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5,
  },
  {
    text: "Anim incididunt reprehenderit in exercitation ad ex minim velit aute.",
    author: "Sophia Carter",
    role: "Designer at Pixel Co.",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    rating: 4,
  },
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

export default function Testimonial(): JSX.Element {
  const [index, setIndex] = useState<number>(0);
  const isMobile = useIsMobile();

  const getPosition = (i: number) => {
    if (i === index) return "center";
    if (i === (index + 1) % testimonials.length) return "next";
    if (i === (index - 1 + testimonials.length) % testimonials.length) return "prev";
    return "hidden";
  };

  // Offsets
  const DESKTOP_X = 300;           // left/right spread
  const MOBILE_Y = 70;             // vertical stack offset
  const SIDE_SCALE = 0.92;
  const SIDE_OPACITY = 0.55;

  return (
    <section className="w-full py-16 bg-gradient-to-b from-white via-blue-100 to-white">
      <div className="text-center mb-12">
        <h3 className="text-indigo-600 font-semibold">Testimonials</h3>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">
          We have worked with thousands of amazing people
        </h2>
      </div>

      {/* Stage */}
      <div className="relative flex justify-center items-center w-full overflow-visible px-4">
        {/* Taller on mobile for the vertical stack */}
        <div className="relative w-full max-w-4xl h-[28rem] sm:h-96">
          {testimonials.map((t, i) => {
            const pos = getPosition(i);
            if (pos === "hidden") return null;

            // Decide offsets based on screen size
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
                key={i}
                onClick={() => setIndex(i)}
                layout
                initial={false}
                whileHover={{ scale: pos === "center" ? 1.02 : 0.95 }}
                animate={{ x, y, scale, opacity, zIndex }}
                transition={{ type: "spring", stiffness: 70, damping: 20 }}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full rounded-2xl p-6 shadow-2xl cursor-pointer ${
                  pos === "center" ? "bg-blue-900 text-white" : "bg-white text-gray-800 border"
                }`}
              >
                {/* Stars */}
                <div className="flex space-x-1 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        pos === "center" ? "fill-indigo-400 text-indigo-400" : "fill-yellow-400 text-yellow-400"
                      }`}
                    />
                  ))}
                </div>

                {/* Text */}
                <blockquote className="text-sm sm:text-base font-medium leading-relaxed mb-4">
                  “{t.text}”
                </blockquote>

                {/* Author */}
                <div className="flex items-center space-x-3">
                  <img src={t.image} alt={t.author} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold">{t.author}</p>
                    <p className={`text-xs ${pos === "center" ? "text-gray-300" : "text-gray-500"}`}>{t.role}</p>
                  </div>
                </div>

                {/* Subtle stacked shadow on mobile*/}
                {isMobile && pos !== "center" && (
                  <div className="absolute inset-x-8 -bottom-3 h-3 rounded-full bg-black/10 blur-md" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
