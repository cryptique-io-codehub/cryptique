import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Tabs from "./components/Tabs";
import { FeatureCards } from "./components/FeatureCards";
import MarketingSection from "./components/MarketingSection";
import { Menu } from "lucide-react";

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-10"
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar toggle button */}
      <button 
        className="md:hidden p-2 fixed top-2 left-2 bg-white shadow-md rounded-full z-50"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Menu size={18} />
      </button>
      
      {/* Sidebar */}
      <div className="h-screen sticky top-0 flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Hide Header on small screens when sidebar is open */}
        <div className={`${isSidebarOpen ? "hidden md:block" : ""}`}>
          <Header />
        </div>

        <main className="p-4 flex flex-col gap-6">
          {/* Hide MarketingSection on small screens when sidebar is open */}
          <div className={`${isSidebarOpen ? "hidden md:block" : ""}`}>
            <MarketingSection />
          </div>

          {/* Hide Tabs on small screens when sidebar is open */}
          <div className={`${isSidebarOpen ? "hidden md:block" : ""}`}>
            <Tabs />
          </div>

          <FeatureCards />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
