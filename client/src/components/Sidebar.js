import { Home, BarChart, LineChart, Users, Settings, List, Database, Activity, Globe, Sun, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useParams } from "react-router-dom";

const Sidebar = ({ isOpen, onClose, onNavigate, hideMarketing, isCompact }) => {
  const [isHovering, setIsHovering] = useState(false);
  const params = useParams();
  const location = useLocation();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || 'defaultTeam');
  const showExpanded = !isCompact || (isCompact && isHovering);
  
  // Extract the current page from the URL path
  const path = location.pathname;
  const pathSegments = path.split('/').filter(segment => segment);
  const currentPage = pathSegments.length > 1 ? pathSegments[1] : pathSegments[0] || 'dashboard';
  
  useEffect(() => {
    // Always use the team from localStorage as the source of truth
    const storedTeam = localStorage.getItem('selectedTeam') || 'team1';
    
    // If URL params don't match stored team, update the URL
    if (params.team && params.team !== storedTeam) {
      // This will trigger a re-render with correct params
      window.history.replaceState(null, '', `/${storedTeam}/settings`);
    }
    
    setSelectedTeam(storedTeam);
  }, [params.team]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && e.target.closest('aside') === null && window.innerWidth < 768) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  // Helper function to determine if a menu item is active
  const isActive = (page) => {
    return currentPage === page;
  };
  
  return (
    <aside
      className={`fixed md:relative bg-white p-2 shadow-lg flex flex-col h-screen border-r transform transition-all duration-300 ease-in-out z-50 ${
        isOpen 
          ? "translate-x-0 w-full sm:w-64 md:w-56 top-0 left-0 md:relative md:top-auto md:left-auto" 
          : "-translate-x-full md:translate-x-0 md:w-auto"
      } ${
        isCompact && !isHovering ? "md:w-16" : "md:w-56 lg:w-64"
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex justify-between items-center mb-4 py-2">
        {showExpanded ? (
        <h2 className="text-sm font-bold flex items-center gap-3 ml-1">
          <img 
            src="../../logo192.png" 
            alt="Cryptique logo" 
            className="w-10 h-10 rounded-full shadow-lg" // Increased from w-8 h-8 to w-10 h-10
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold">Cryptique</span> {/* Increased from text-base to text-lg and added font-bold */}
            <span className="text-sm text-gray-500">Analytics</span> {/* Increased from text-xs to text-sm */}
          </div>
        </h2>
)
 : (
          <span className="bg-gradient-to-r from-yellow-700 to-yellow-500 p-2 rounded-full text-white font-bold text-xs flex items-center justify-center w-8 h-8 shadow-lg mx-auto"> {/* Increased from w-6 h-6 to w-8 h-8 */}
            Q
          </span>
        )}
        {showExpanded && <button className="md:hidden text-gray-500 hover:text-gray-700 p-2" onClick={() => { onClose(); hideMarketing && hideMarketing(); }}>✖</button>}
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <ul className="space-y-1 text-xs font-medium">
          <Link
            to={`/dashboard`}
            className={`${isActive("dashboard") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("dashboard")}
          >
            <Home size={14} /> {showExpanded && "Dashboard"}
          </Link>
          <Link 
            to={`/${selectedTeam}/offchain`}
            className={`${isActive("offchain") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("offchain")}
          >
            <BarChart size={14} /> {showExpanded && "Off-chain analytics"}
          </Link>
          <Link 
            to={`/${selectedTeam}/onchain`}
            className={`${isActive("onchain") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("onchain")}
          >
            <LineChart size={14} /> {showExpanded && "On-chain explorer"}
          </Link>
          
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">ACTIONS</p>}
          <Link 
            to={`/${selectedTeam}/campaigns`}
            className={`${isActive("campaigns") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("campaigns")}
          >
            <Activity size={14} /> {showExpanded && "Campaigns"}
          </Link>
          <Link 
            to={`/${selectedTeam}/conversion-events`}
            className={`${isActive("conversion-events") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("conversion-events")}
          >
            <List size={14} /> {showExpanded && "Conversion events"}
          </Link>
          <Link 
            to={`/${selectedTeam}/advertise`}
            className={`${isActive("advertise") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("advertise")}
          >
            <Globe size={14} /> {showExpanded && "Advertise"}
          </Link>
          <Link 
            to={`/${selectedTeam}/history`}
            className={`${isActive("history") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("history")}
          >
            <Database size={14} /> {showExpanded && "History"}
          </Link>
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">OTHER</p>}
          <Link 
            to={`/${selectedTeam}/importusers`}
            className={`${isActive("importusers") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("importusers")}
          >
            <Upload size={14} /> {showExpanded && "Import users"}
          </Link>
          <Link 
            to={`/${selectedTeam}/managewebsites`}
            className={`${isActive("managewebsites") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("managewebsites")}
          >
            <Globe size={14} /> {showExpanded && "Manage websites"}
          </Link>
          <Link
            to={`/${selectedTeam}/settings`}
            className={`${isActive("settings") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("settings")}
          >
            <Settings size={14} /> {showExpanded && "Settings"}
          </Link>
        </ul>
      </nav>
      {showExpanded && (
        <div className="border-t pt-2 mt-2">
          <button className="text-gray-500 flex items-center gap-2 justify-center hover:bg-gray-200 p-2 rounded-lg cursor-pointer w-full text-xs">
            <Sun size={14} /> Light Mode
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;