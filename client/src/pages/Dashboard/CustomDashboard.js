import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

const CustomDashboard = ({ onMenuClick, onClose }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile menu toggle button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`h-screen flex-shrink-0 md:block ${sidebarOpen ? 'block fixed z-40' : 'hidden'}`}>
        <Sidebar currentPage="custom-dashboard" />
      </div>

      {/* Main content area */}
      <div className="flex flex-col w-full h-screen">
        {/* Header */}
        <Header className="w-full flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Custom Dashboard</h1>
            
            {/* Placeholder for custom dashboard content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Custom Widget 1</h2>
                <p className="text-gray-600">Add your custom widgets here</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Custom Widget 2</h2>
                <p className="text-gray-600">Add your custom widgets here</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Custom Widget 3</h2>
                <p className="text-gray-600">Add your custom widgets here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile navigation */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CustomDashboard; 