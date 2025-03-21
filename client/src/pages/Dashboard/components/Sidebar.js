import { Home, BarChart, BellRing , LineChart, Users, Settings, List, Database, Activity, Globe, Sun, Upload, Menu, FileText, Shield } from "lucide-react";
const Sidebar = ({ isOpen, onClose }) => (
  <aside className={`fixed md:relative w-48 bg-white p-2 shadow-lg flex flex-col h-screen border-r transform ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <span className="bg-gradient-to-r from-yellow-700 to-yellow-500 p-2 rounded-full text-white font-bold text-xs flex items-center justify-center w-6 h-6 shadow-lg">Q</span>
        <div className="flex flex-col">
          <span>Cryptique</span>
          <span className="text-[10px] text-gray-500">Analytics</span>
        </div>
      </h2>
      <button className="md:hidden" onClick={onClose}>✖</button>
    </div>
    <nav className="flex-1 overflow-hidden">
      <ul className="space-y-2 text-xs font-medium">
        <li className="text-blue-600 flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Home size={14} /> Dashboard
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <BarChart size={14} /> Off-chain analytics
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <LineChart size={14} /> On-chain explorer
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Users size={14} /> KOL Intelligence
        </li>
        <hr className="my-2 border-gray-300" />
        <p className="text-gray-600 text-[10px] font-semibold px-2">ACTIONS</p>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Activity size={14} /> Campaigns
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <List size={14} /> Conversion events
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Globe size={14} /> Advertise
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Database size={14} /> History
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Settings size={14} /> Settings
        </li>
        <hr className="my-2 border-gray-300" />
        <p className="text-gray-600 text-[10px] font-semibold px-2">OTHER</p>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Upload size={14} /> Import users
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Globe size={14} /> Manage websites
        </li>
        <li className="flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer">
          <Settings size={14}/> Settings
        </li>
      </ul>
    </nav>
    <div className="border-t pt-2 mt-2">
      <button className="text-gray-500 flex items-center gap-2 justify-center hover:bg-gray-200 p-2 rounded-lg cursor-pointer w-full text-xs">
        <Sun size={14} /> Light Mode
      </button>
    </div>
  </aside>
);

export default Sidebar;