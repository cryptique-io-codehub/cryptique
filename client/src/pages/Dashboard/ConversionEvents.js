import React from "react";
import Sidebar from "../../components/Sidebar";

const ConversionEvents= ({ onMenuClick, onClose }) => {
  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-100">
        <Sidebar 
          currentPage="offchain-analytics" 
          // Add any other necessary props like isOpen, onClose, etc.
        />
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
          <h1 className="text-4xl font-bold text-blue-800 mb-4">
            Welcome to Offchain Analytics
          </h1>
          <p className="text-blue-600 text-lg">
            Explore detailed insights and analytics for your offchain data
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConversionEvents;