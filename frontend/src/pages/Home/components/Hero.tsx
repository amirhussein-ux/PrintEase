import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";


const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const { continueAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
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
        {/* Gradient fade at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-10 w-full h-full flex items-center justify-center bg-white/70">
        <div className="max-w-screen-xl px-4 py-8 mx-auto w-full">
          <div className="mr-auto place-self-center lg:w-2/3 text-center sm:text-left">
            <h1 className="max-w-2xl mb-4 text-6xl font-bold leading-tight text-black mx-auto sm:mx-0">
              Streamline Your Printing Operations
            </h1>
            <p className="max-w-2xl mb-8 text-lg sm:text-2xl lg:text-3xl text-[#333] font-normal mx-auto sm:mx-0">
              Efficient solutions for modern print shop needs.
            </p>
            <div className="flex flex-row space-x-4 items-center justify-center sm:items-start sm:justify-start w-full">
              <button
                type="button"
                className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-center text-white rounded-lg bg-blue-900 hover:bg-blue-800 "
                onClick={() => navigate("/login")}
              >
                Log in
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center px-5 py-3 text-base font-bold text-center text-blue-900 border-2 border-blue-900 rounded-lg bg-white hover:bg-blue-50"
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
                {guestLoading ? 'Continuing...' : 'Continue as Guest'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
