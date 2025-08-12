import React, { useEffect, useCallback } from "react";
import useEmblaCarousel from 'embla-carousel-react'
import "./embla-carousel.css";
import admin from '../../../../assets/admin-dashboard.png';
import client from '../../../../assets/client-orderpage.png';

const images = [admin, client];

export default function EmblaCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="embla relative">
      {/* Left Arrow */}
      <button
        className="hidden md:flex absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-blue-950 bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100"
        onClick={() => emblaApi && emblaApi.scrollPrev()}
        aria-label="Previous slide"
      >
        <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
      </button>
      {/* Right Arrow */}
      <button
        className="hidden md:flex absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-blue-950 bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100"
        onClick={() => emblaApi && emblaApi.scrollNext()}
        aria-label="Next slide"
      >
        <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container flex">
          {images.map((src, idx) => (
            <div className="embla__slide flex-shrink-0 w-full h-64 flex items-center justify-center" key={idx}>
              <img src={src} alt={`carousel-img-${idx}`} className="object-contain h-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="embla__dots flex justify-center mt-4">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={`embla__dot w-3 h-3 rounded-full mx-1 ${selectedIndex === idx ? "bg-blue-600" : "bg-gray-300"}`}
            onClick={() => emblaApi && emblaApi.scrollTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
