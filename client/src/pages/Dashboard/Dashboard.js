import React from "react";
import { useState } from "react";
import Sidebar from "./components/Sidebar.js";
import Header from "./components/Header.js";
import Tabs from "./components/Tabs.js";
import {FeatureCards} from "./components/FeatureCards.js";
import MarketingSection from "./components/MarketingSection.js";
import { Home, BarChart, LineChart, Users, Settings, List, Database, Activity, Globe, Sun, Upload, FileText, Bell, User, Menu } from "lucide-react";

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
      
      {/* Fixed Sidebar */}
      <div className="h-screen sticky top-0 flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Scrollable Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />
        <main className="p-4 flex flex-col gap-6">
          <MarketingSection />
          <Tabs/>
          <FeatureCards />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
