import React from "react";
import marketingImage from "./image 1.png"; // Ensure correct path
import rightCardImage from "./button.png"; // Ensure correct path

const MarketingSection = () => {
  return (
    <section className="p-2 sm:p-4 flex flex-col md:flex-row gap-3 -mt-4 mb-0">
      {/* Main Card */}
      <div className="w-full md:w-2/3 h-auto bg-[#d6b680] text-white shadow-lg rounded-xl p-4 flex flex-col md:flex-row relative overflow-hidden mb-3 md:mb-0">
        
        {/* Left Half - Text */}
        <div className="w-full md:w-1/2 flex flex-col justify-center z-10 p-2 sm:p-4 md:p-6 lg:p-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">One Stop for your Web 3 Marketing</h2>
          <p className="mt-1 text-xs sm:text-sm md:text-base opacity-90">
            Easy onboarding<br />One-min integration<br />No-code insights
          </p>
          <button className="mt-2 md:mt-3 w-full sm:w-auto bg-white text-blue-600 font-semibold py-1 sm:py-2 px-3 sm:px-4 rounded-lg shadow-md hover:bg-gray-100 transition text-xs sm:text-sm md:text-base">
            Integrate your website/app now
          </button>
        </div>
        
        {/* Right Half - Image - Positioned to touch right boundary perfectly */}
        <div className="w-full md:w-1/2 h-40 sm:h-48 md:h-auto md:absolute md:inset-y-0 md:right-0 flex items-center justify-end">
          <img 
            src={marketingImage}  
            alt="Marketing Graphic"
            className="h-full w-auto object-contain md:h-full md:max-w-none"
          />
        </div>
      </div>
      
      {/* Secondary Card */}
      <div className="w-full md:w-1/3 h-auto bg-[#3A1C5A] text-white shadow-lg rounded-xl p-4 flex flex-col relative">
        <div>
          <h3 className="text-md sm:text-lg font-bold mb-1 sm:mb-2 mt-1 sm:mt-2">Get more of Cryptique</h3>
          <p className="text-xs sm:text-sm opacity-90 mb-2">
            Get started with our app docs invite your team, and import your lists.
          </p>
        </div>
        
        {/* App Docs and Invite Team Section */}
        <div className="space-y-2 sm:space-y-3 mt-1">
          <div className="flex justify-between items-center border-b border-white/30 pb-2">
            <span className="text-xs sm:text-sm">App Docs</span>
            <a href="#" className="text-yellow-300 text-xs sm:text-sm">Click here →</a>
          </div>
          <div className="flex justify-between items-center border-b border-white/30 pb-2">
            <span className="text-xs sm:text-sm">Invite team</span>
            <a href="#" className="text-yellow-300 text-xs sm:text-sm">Click here →</a>
          </div>
        </div>
        
        {/* Image Positioned in the Bottom */}
        <div className="absolute bottom-2 right-4 sm:right-6 md:right-4 lg:right-6">
          <img 
            src={rightCardImage}  
            alt="Button Graphic"
            className="w-[60px] sm:w-[80px] md:w-[100px] lg:w-[120px] h-auto"
          />
        </div>
      </div>
    </section>
  );
};

export default MarketingSection;