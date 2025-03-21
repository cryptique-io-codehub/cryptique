import React from "react";
import { Bell, User } from "lucide-react";

const Header = () => {
  return (
    <header className="flex justify-end items-center mb-0 h-10">
      {/* Notification Icon */}
      <div className="relative cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0">
        <Bell size={20} className="text-gray-600" />
      </div>

      {/* Profile Icon */}
      <div className="ml-4 cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0">
        <User size={20} className="text-gray-600" />
      </div>
    </header>
  );
};

export default Header;
