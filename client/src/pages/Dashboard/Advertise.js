import React from "react";

const Advertise = ({ onMenuClick, onClose, screenSize }) => {
  return (
    <div className="flex h-screen">
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
          <h1 className="text-4xl font-bold text-blue-800 mb-4">
            Welcome to Advertise
          </h1>
          <p className="text-blue-600 text-lg">
            Explore detailed insights and analytics for your offchain data
          </p>
        </div>
      </div>
    </div>
  );
};

export default Advertise;