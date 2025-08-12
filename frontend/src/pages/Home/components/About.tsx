import EmblaCarousel from "./Embla Carousel/EmblaCarousel";

export default function About() {
  return (
    <div className="relative isolate overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: Text Section */}
          <div className="flex-1 max-w-2xl lg:mx-0">
            <h2 className="text-5xl font-semibold tracking-tight text-black sm:text-7xl">About PrintEase</h2>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-800 sm:text-xl/8 text-justify">
              PrintEase is an innovative web solution designed to optimize the operational control and cloud-based data analysis in the Philippines. By providing a seamless digital platform for monitoring print projects, PrintEase enables end-to-end management of printing operations from order placement to delivery tracking. Our comprehensive system streamlines every step. The system integrates advanced features including cloud storage, and enhanced security protocols to ensure data integrity and operational efficiency. PrintEase is committed to transforming the printing industry by enhancing transparency, improving customer experience, and optimizing productivity through innovative technology solutions.
            </p>
          </div>
          {/* Right: Embla Carousel Section */}
          <div className="flex-1 w-full max-w-xl">
            <EmblaCarousel />
          </div>
        </div>
      </div>
    </div>
  );
}
