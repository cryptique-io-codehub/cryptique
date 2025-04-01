import { Home, BarChart, BellRing, LineChart, Users, Settings, List, Database, Activity, Globe, Sun, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";

const Sidebar = ({ isOpen, onClose, onNavigate, hideMarketing, isCompact, currentPage }) => {
  const [isHovering, setIsHovering] = useState(false);
  const params = useParams();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || 'defaultTeam');
  const showExpanded = !isCompact || (isCompact && isHovering);
  console.log(selectedTeam);
  useEffect(() => {
    // Always use the team from localStorage as the source of truth
    const storedTeam = localStorage.getItem('selectedTeam') || 'team1';
    
    // If URL params don't match stored team, update the URL
    if (params.team && params.team !== storedTeam) {
      // This will trigger a re-render with correct params
      window.history.replaceState(null, '', `/${storedTeam}/settings`);
    }
    
    setSelectedTeam(storedTeam);
    
    console.log("params from sidebar", params.team);
    console.log("selectedTeam from sidebar", storedTeam);
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
          <h2 className="text-sm font-bold flex items-center gap-2 ml-1">
            <span className="bg-gradient-to-r from-yellow-700 to-yellow-500 p-2 rounded-full text-white font-bold text-xs flex items-center justify-center w-6 h-6 shadow-lg">
              Q
            </span>
            <div className="flex flex-col">
              <span>Cryptique</span>
              <span className="text-[10px] text-gray-500">Analytics</span>
            </div>
          </h2>
        ) : (
          <span className="bg-gradient-to-r from-yellow-700 to-yellow-500 p-2 rounded-full text-white font-bold text-xs flex items-center justify-center w-6 h-6 shadow-lg mx-auto">
            Q
          </span>
        )}
        {showExpanded && <button className="md:hidden text-gray-500 hover:text-gray-700 p-2" onClick={() => { onClose(); hideMarketing && hideMarketing(); }}>✖</button>}
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <ul className="space-y-1 text-xs font-medium">
          <Link
            to={`/dashboard`}
            className={`${currentPage === "dashboard" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("dashboard")}
          >
            <Home size={14} /> {showExpanded && "Dashboard"}
          </Link>
          <Link 
          to={`/${selectedTeam}/offchain`}
            className={`${currentPage === "offchain-analytics" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("offchain-analytics")}
          >
            <BarChart size={14} /> {showExpanded && "Off-chain analytics"}
          </Link>
          <Link to={`/${selectedTeam}/onchain`}
            className={`${currentPage === "onchain-explorer" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("onchain-explorer")}
          >
          <LineChart size={14} /> {showExpanded && "On-chain explorer"}
          </Link>
          <Link to={`/${selectedTeam}/kol`}
            className={`${currentPage === "kol-intelligence" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("kol-intelligence")}
          >
          <Users size={14} /> {showExpanded && "KOL Intelligence"}
          </Link>
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">ACTIONS</p>}
          <Link to={`/${selectedTeam}/campaigns`}
            className={`${currentPage === "campaigns" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("campaigns")}
          >
            <Activity size={14} /> {showExpanded && "Campaigns"}
          </Link>
          <Link to={`/${selectedTeam}/conversion-events`}
            className={`${currentPage === "conversion-events" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("conversion-events")}
          >
            <List size={14} /> {showExpanded && "Conversion events"}
          </Link>
          <Link to={`/${selectedTeam}/advertise`}
            className={`${currentPage === "advertise" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("advertise")}
          >
            <Globe size={14} /> {showExpanded && "Advertise"}
          </Link>
          <Link to={`/${selectedTeam}/history`}
            className={`${currentPage === "history" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("history")}
          >
            <Database size={14} /> {showExpanded && "History"}
          </Link>
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">OTHER</p>}
          <Link to={`/${selectedTeam}/importusers`}
            className={`${currentPage === "import-users" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("import-users")}
          >
            <Upload size={14} /> {showExpanded && "Import users"}
          </Link>
          <Link to={`/${selectedTeam}/managewebsites`}
            className={`${currentPage === "manage-websites" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
            onClick={() => onNavigate && onNavigate("manage-websites")}
          >
            <Globe size={14} /> {showExpanded && "Manage websites"}
          </Link>
          <Link
            to={`/${selectedTeam}/settings`}
            className={`${currentPage === "settings" ? "text-blue-600" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 p-2 rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""}`}
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