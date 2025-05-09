import { Home, BarChart, LineChart, Users, Settings, List, Database, Activity, Globe, Sun, Upload, Bot, Sparkles, BrainCircuit, CreditCard } from "lucide-react";
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
  
  // Handle hover state with a small delay for better UX
  const handleMouseEnter = () => {
    if (isCompact) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCompact) {
      setIsHovering(false);
    }
  };
  
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
      className={`fixed md:relative bg-white ${isCompact && !isHovering ? "p-1" : "p-2"} shadow-lg flex flex-col h-screen border-r transform transition-all duration-300 ease-in-out z-50 ${
        isOpen 
          ? "translate-x-0 w-full sm:w-64 md:w-56 top-0 left-0 md:relative md:top-auto md:left-auto" 
          : "-translate-x-full md:translate-x-0 md:w-auto"
      } ${
        isCompact && !isHovering ? "md:w-[60px]" : "md:w-56 lg:w-64"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`flex justify-between items-center ${isCompact && !isHovering ? "mb-2" : "mb-4"} ${isCompact && !isHovering ? "py-1" : "py-2"} ${!showExpanded ? "justify-center" : ""}`}>
        {showExpanded ? (
        <h2 className="text-sm font-bold flex items-center gap-3 ml-1">
          <img 
            src="../../logo192.png" 
            alt="Cryptique logo" 
            className="w-10 h-10 rounded-full shadow-lg"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold">Cryptique</span>
            <span className="text-sm text-gray-500">Analytics</span>
          </div>
        </h2>
)
 : (
        <img 
          src="../../logo192.png" 
          alt="Cryptique logo" 
          className="w-11 h-11 rounded-full shadow-lg mx-auto transition-all duration-200"
        />
      )}
      {showExpanded && <button className="md:hidden text-gray-500 hover:text-gray-700 p-2" onClick={() => { onClose(); hideMarketing && hideMarketing(); }}>✖</button>}
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <ul className={`${!showExpanded ? "space-y-3 px-0 mt-2" : "space-y-1"} text-xs font-medium`}>
          <Link
            to={`/dashboard`}
            className={`${isActive("dashboard") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("dashboard")}
          >
            <Home size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Dashboard</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/offchain`}
            className={`${isActive("offchain") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("offchain")}
          >
            <BarChart size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Off-chain analytics</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/onchain`}
            className={`${isActive("onchain") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("onchain")}
          >
            <LineChart size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">On-chain explorer</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/cq-intelligence`}
            className={`${isActive("cq-intelligence") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("cq-intelligence")}
          >
            <BrainCircuit size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">CQ Intelligence</span>}
          </Link>
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">ACTIONS</p>}
          <Link 
            to={`/${selectedTeam}/campaigns`}
            className={`${isActive("campaigns") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("campaigns")}
          >
            <Activity size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Campaigns</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/conversion-events`}
            className={`${isActive("conversion-events") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("conversion-events")}
          >
            <List size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Conversion events</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/advertise`}
            className={`${isActive("advertise") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("advertise")}
          >
            <Globe size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Advertise</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/history`}
            className={`${isActive("history") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("history")}
          >
            <Database size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">History</span>}
          </Link>
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">OTHER</p>}
          <Link 
            to={`/${selectedTeam}/importusers`}
            className={`${isActive("importusers") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("importusers")}
          >
            <Upload size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Import users</span>}
          </Link>
          <Link 
            to={`/${selectedTeam}/managewebsites`}
            className={`${isActive("managewebsites") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("managewebsites")}
          >
            <Globe size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Manage websites</span>}
          </Link>
          <Link
            to={`/${selectedTeam}/settings`}
            className={`${isActive("settings") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("settings")}
          >
            <Settings size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Settings</span>}
          </Link>
          <Link
            to="/settings/billing"
            className={`${path.includes("/settings/billing") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${isCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("billing")}
          >
            <CreditCard size={isCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Billing</span>}
          </Link>
        </ul>
      </nav>
      {showExpanded && (
        <div className="border-t pt-2 mt-2">
          <button className="text-gray-500 flex items-center gap-2 justify-center hover:bg-gray-200 p-2 rounded-lg cursor-pointer w-full text-xs transition-all duration-200">
            <Sun size={isCompact && !isHovering ? 16 : 14} /> <span className="transition-opacity duration-200">Light Mode</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;