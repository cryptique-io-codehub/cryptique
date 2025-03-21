import React from "react";
import marketingImage from "./image 1.png"; // Ensure correct path
import rightCardImage from "./button.png"; // Ensure correct path

const MarketingSection = () => {
  return (
    <section className="p-2 flex flex-col md:flex-row gap-3 -mt-4 mb-0">
      {/* Main Card */}
      <div className="w-full md:w-2/3 h-auto min-h-[300px] bg-[#d6b680] text-white shadow-lg rounded-xl p-4 md:p-6 flex flex-col md:flex-row relative overflow-hidden mb-3 md:mb-0">
        
        {/* Left Half - Text */}
        <div className="w-full md:w-1/2 flex flex-col justify-center z-10 p-4 md:p-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">One Stop for your Web 3 Marketing</h2>
          <p className="mt-1 text-sm md:text-md opacity-90">
            Easy onboarding<br />One-min integration<br />No-code insights
          </p>
          <button className="mt-3 w-full sm:w-auto bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 transition text-sm md:text-base">
            Integrate your website/app now
          </button>
        </div>
        {/* Right Half - Image */}
        <div className="w-full md:w-1/2 mt-4 md:mt-0 md:absolute md:right-[-46px] md:top-0 h-48 md:h-full flex justify-center md:justify-end items-center">
          <img 
            src={marketingImage}  
            alt="Marketing Graphic"
            className="h-full w-auto object-contain"
          />
        </div>
      </div>
      {/* Secondary Card */}
      <div className="w-full md:w-1/3 h-auto min-h-[250px] md:min-h-[300px] bg-[#3A1C5A] text-white shadow-lg rounded-xl p-4 flex flex-col relative">
        <div>
          <h3 className="text-lg font-bold mb-2 mt-2">Get more of Cryptique</h3>
          <p className="text-sm opacity-90 mb-2">
            Get started with our app docs invite your team, and import your lists.
          </p>
        </div>
        
        {/* App Docs and Invite Team Section */}
        <div className="space-y-3 mt-1">
          <div className="flex justify-between border-b border-white/30 pb-2">
            <span>App Docs</span>
            <a href="#" className="text-yellow-300">Click here →</a>
          </div>
          <div className="flex justify-between border-b border-white/30 pb-2">
            <span>Invite team</span>
            <a href="#" className="text-yellow-300">Click here →</a>
          </div>
        </div>
        {/* Image Positioned in the Bottom - Moved More to the Left */}
        <div className="absolute bottom-2 right-8 md:right-6">
          <img 
            src={rightCardImage}  
            alt="Button Graphic"
            className="w-[80px] md:w-[120px] h-auto"
          />
        </div>
      </div>
    </section>
  );
};

export default MarketingSection;