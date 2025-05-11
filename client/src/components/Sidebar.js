import { Home, BarChart, LineChart, Users, Settings, List, Database, Activity, Globe, Sun, Upload, Bot, Sparkles, BrainCircuit, CreditCard, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useSubscription } from "../context/subscriptionContext";

const Sidebar = ({ isOpen, onClose, onNavigate, hideMarketing, isCompact, currentPage }) => {
  const [isHovering, setIsHovering] = useState(false);
  const params = useParams();
  const location = useLocation();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || 'defaultTeam');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { hasAccess, plan } = useSubscription();
  
  // Apply compact mode consistently
  const effectiveIsCompact = isCompact;
  
  // Control sidebar expansion state
  const showExpanded = !effectiveIsCompact || (effectiveIsCompact && isHovering);
  
  // Force sidebar to be visible on desktop for settings page
  const forceVisible = currentPage === "settings" && windowWidth >= 768;
  
  // Extract the current page from the URL path
  const path = location.pathname;
  const pathSegments = path.split('/').filter(segment => segment);
  const pathCurrentPage = pathSegments.length > 1 ? pathSegments[1] : pathSegments[0] || 'dashboard';
  
  // Handle hover state with improved logic for better UX
  const handleMouseEnter = () => {
    if (effectiveIsCompact) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (effectiveIsCompact) {
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
    return pathCurrentPage === page;
  };
  
  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Helper function to create menu item with proper styling based on access
  const NavItem = ({ path, feature, icon, label }) => {
    const featureAccess = hasAccess(feature);
    
    if (featureAccess) {
      return (
        <Link 
          to={path}
          className={`${isActive(feature.split("Analytics")[0]) ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
          onClick={() => onNavigate && onNavigate(feature)}
        >
          {icon} {showExpanded && <span className="transition-opacity duration-200">{label}</span>}
        </Link>
      );
    } else {
      return (
        <div 
          className={`text-gray-400 flex items-center gap-2 ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-not-allowed ${!showExpanded ? "justify-center" : ""}`}
          title={`Upgrade plan to access ${label}`}
        >
          <div className="relative">
            {icon}
            {showExpanded && <Lock size={10} className="absolute -top-1 -right-1 text-gray-500" />}
          </div> 
          {showExpanded && (
            <div className="flex justify-between items-center w-full">
              <span className="transition-opacity duration-200">{label}</span>
              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Premium</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <aside
      style={{ boxSizing: 'border-box', paddingRight: 0, marginRight: 0, borderRightWidth: '1px' }}
      className={`fixed md:relative bg-white ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} shadow-lg flex flex-col h-screen border-r border-gray-200 transform transition-all duration-300 ease-in-out ${currentPage === "settings" ? "z-10" : "z-50"} ${
        isOpen || forceVisible
          ? "translate-x-0 w-full sm:w-64 md:w-56 top-0 left-0 md:relative md:top-auto md:left-auto" 
          : "-translate-x-full md:translate-x-0 md:w-auto"
      } ${
        effectiveIsCompact && !isHovering ? "md:w-[60px] pr-0" : "md:w-56 lg:w-64"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`flex justify-between items-center ${effectiveIsCompact && !isHovering ? "mb-2" : "mb-4"} ${effectiveIsCompact && !isHovering ? "py-1" : "py-2"} ${!showExpanded ? "justify-center" : ""}`}>
        {showExpanded ? (
        <h2 className="text-sm font-bold flex items-center gap-3 ml-1">
          <img 
            src="../../logo192.png" 
            alt="Cryptique logo" 
            className="w-10 h-10 rounded-full shadow-lg"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold">Cryptique</span>
            <span className="text-sm text-gray-500">{plan ? plan.toUpperCase() : 'FREE'}</span>
          </div>
        </h2>
        ) : (
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
          {/* Dashboard is always accessible */}
          <Link
            to={`/dashboard`}
            className={`${isActive("dashboard") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("dashboard")}
          >
            <Home size={effectiveIsCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Dashboard</span>}
          </Link>
          
          {/* Off-chain analytics requires access */}
          <NavItem 
            path={`/${selectedTeam}/offchain`} 
            feature="offchainAnalytics" 
            icon={<BarChart size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="Off-chain analytics" 
          />
          
          {/* On-chain explorer requires access */}
          <NavItem 
            path={`/${selectedTeam}/onchain`} 
            feature="onchainExplorer" 
            icon={<LineChart size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="On-chain explorer" 
          />
          
          {/* CQ Intelligence requires access */}
          <NavItem 
            path={`/${selectedTeam}/cq-intelligence`} 
            feature="cqIntelligence" 
            icon={<BrainCircuit size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="CQ Intelligence" 
          />
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">ACTIONS</p>}
          
          {/* Campaigns requires access */}
          <NavItem 
            path={`/${selectedTeam}/campaigns`} 
            feature="campaigns" 
            icon={<Activity size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="Campaigns" 
          />
          
          {/* Conversion events requires access */}
          <NavItem 
            path={`/${selectedTeam}/conversion-events`} 
            feature="conversionEvents" 
            icon={<List size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="Conversion events" 
          />
          
          {/* Advertise requires access */}
          <NavItem 
            path={`/${selectedTeam}/advertise`} 
            feature="advertise" 
            icon={<Globe size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="Advertise" 
          />
          
          {/* History requires access */}
          <NavItem 
            path={`/${selectedTeam}/history`} 
            feature="history" 
            icon={<Database size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="History" 
          />
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">OTHER</p>}
          
          {/* Import users requires access */}
          <NavItem 
            path={`/${selectedTeam}/importusers`} 
            feature="importUsers" 
            icon={<Upload size={effectiveIsCompact && !isHovering ? 16 : 14} />} 
            label="Import users" 
          />
          
          {/* Manage websites is always accessible */}
          <Link 
            to={`/${selectedTeam}/managewebsites`}
            className={`${isActive("managewebsites") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("managewebsites")}
          >
            <Globe size={effectiveIsCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Manage websites</span>}
          </Link>
          
          {/* Settings is always accessible */}
          <Link
            to={`/${selectedTeam}/settings`}
            className={`${isActive("settings") ? "text-blue-600 bg-blue-50" : "text-gray-700"} flex items-center gap-2 hover:bg-gray-200 ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
            onClick={() => onNavigate && onNavigate("settings")}
          >
            <Settings size={effectiveIsCompact && !isHovering ? 16 : 14} /> {showExpanded && <span className="transition-opacity duration-200">Settings</span>}
          </Link>
        </ul>
      </nav>
      {showExpanded && (
        <div className="border-t pt-2 mt-2">
          <button className="text-gray-500 flex items-center gap-2 justify-center hover:bg-gray-200 p-2 rounded-lg cursor-pointer w-full text-xs transition-all duration-200">
            <Sun size={effectiveIsCompact && !isHovering ? 16 : 14} /> <span className="transition-opacity duration-200">Light Mode</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;