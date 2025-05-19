import { Home, BarChart2, Database, LineChart, Users, Settings, List, Activity, Globe, Sun, Upload, Bot, Sparkles, BrainCircuit, CreditCard, Lock } from "lucide-react";
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
  const { isActive: hasActiveSubscription, plan } = useSubscription();
  
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
  
  // Define free pages (that don't need subscription)
  const freePages = ['dashboard', 'settings'];
  
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

  // Helper function to render navigation item with premium indicator if needed
  const renderNavItem = (to, pageName, icon, label, isPremium = true) => {
    // Check if this feature requires subscription
    const requiresSubscription = isPremium && !freePages.includes(pageName);
    const isActiveItem = isActive(pageName);
    
    // Define classes based on active state and subscription status
    let itemClasses = isActiveItem 
      ? "text-blue-600 bg-blue-50" 
      : "text-gray-700";
    
    // Add opacity for locked items
    if (requiresSubscription && !hasActiveSubscription) {
      itemClasses += " opacity-70 hover:opacity-100";
    }
    
    return (
      <Link 
        to={to}
        className={`${itemClasses} flex items-center gap-2 hover:bg-gray-200 ${effectiveIsCompact && !isHovering ? "p-1" : "p-2"} rounded-lg cursor-pointer ${!showExpanded ? "justify-center" : ""} transition-all duration-200`}
        onClick={() => onNavigate && onNavigate(pageName)}
      >
        {icon}
        {showExpanded && (
          <div className="flex items-center justify-between w-full">
            <span className="transition-opacity duration-200">{label}</span>
            {requiresSubscription && !hasActiveSubscription && (
              <Lock size={12} className="text-gray-500 ml-1" />
            )}
          </div>
        )}
        {!showExpanded && requiresSubscription && !hasActiveSubscription && (
          <div className="absolute -right-1 -top-1">
            <Lock size={10} className="text-gray-500" />
          </div>
        )}
      </Link>
    );
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
      
      {/* Subscription indicator */}
      {showExpanded && (
        <div className={`px-2 py-1 mb-2 text-xs rounded-md ${hasActiveSubscription ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} flex items-center justify-between`}>
          <span>{hasActiveSubscription ? 'Premium Plan' : 'Free Plan'}</span>
          {!hasActiveSubscription && (
            <Link to={`/${selectedTeam}/settings/billing`} className="text-blue-600 hover:underline flex items-center">
              <CreditCard size={12} className="mr-1" />
              Upgrade
            </Link>
          )}
        </div>
      )}
      
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <ul className={`${!showExpanded ? "space-y-3 px-0 mt-2" : "space-y-1"} text-xs font-medium`}>
          {/* Dashboard - always accessible */}
          {renderNavItem(`/dashboard`, "dashboard", 
            <Home size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Dashboard", false)}
          
          {/* Premium features */}
          {renderNavItem(`/${selectedTeam}/offchain`, "offchain", 
            <BarChart2 size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Off-chain analytics")}
            
          {renderNavItem(`/${selectedTeam}/onchain`, "onchain", 
            <Database size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "On-chain explorer")}
            
          {renderNavItem(`/${selectedTeam}/cq-intelligence`, "cq-intelligence", 
            <LineChart size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "CQ Intelligence")}
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">ACTIONS</p>}
          
          {renderNavItem(`/${selectedTeam}/campaigns`, "campaigns", 
            <Activity size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Campaigns")}
            
          {renderNavItem(`/${selectedTeam}/conversion-events`, "conversion-events", 
            <List size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Conversion events")}
            
          {renderNavItem(`/${selectedTeam}/advertise`, "advertise", 
            <Globe size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Advertise")}
            
          {renderNavItem(`/${selectedTeam}/history`, "history", 
            <Database size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "History")}
          
          {showExpanded && <hr className="my-2 border-gray-300" />}
          {showExpanded && <p className="text-gray-600 text-[10px] font-semibold px-2">OTHER</p>}
          
          {renderNavItem(`/${selectedTeam}/importusers`, "importusers", 
            <Upload size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Import users")}
            
          {renderNavItem(`/${selectedTeam}/managewebsites`, "managewebsites", 
            <Globe size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Manage websites")}
          
          {/* Settings - always accessible */}
          {renderNavItem(`/${selectedTeam}/settings`, "settings", 
            <Settings size={effectiveIsCompact && !isHovering ? 16 : 14} />, 
            "Settings", false)}
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