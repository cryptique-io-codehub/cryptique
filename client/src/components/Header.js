import React from "react";
import { Bell, ChevronDown, User } from "lucide-react";
const TeamSelector = () => {
  return (
    <div className="">
      <div className="flex items-center flex-wrap">
        <span className="text-sm font-medium text-gray-700 mr-2">Team:</span>
        <div className="relative">
          <button className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded shadow-sm text-sm">
            <span>Cryptique (Growth)</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
const Header = () => {
  return (
    <header className="flex justify-between px-5  items-center   py-1">
      {/* Notification Icon */}
      <TeamSelector />
<div className=" flex justify-center items-center">
      <div className=" cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0">
        <Bell size={20} className="text-gray-600" />
      </div>

      {/* Profile Icon */}
      <div className="cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0">
        <User size={20} className="text-gray-600" />
      </div></div>
    </header>
  );
};

export default Header;
