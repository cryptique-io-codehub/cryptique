import React, { useState, useEffect } from "react";
import { CreditCard, Users, Settings as SettingsIcon, Menu, ChevronDown, X, Tag, Shield, BarChart2, AlertTriangle } from "lucide-react";
import Header from "../../components/Header";
import Billing from "./Billing/Billing";
import TeamsSection from "./TeamsSection";
import PricingSection from "./PricingSection";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTeam } from "../../context/teamContext";
import { useSubscription } from "../../context/subscriptionContext";
import axios from "axios";

// Style definitions for futuristic theme
const styles = {
  headingFont: { 
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 600
  },
  bodyFont: { 
    fontFamily: "'Poppins', sans-serif" 
  },
  primaryColor: "#1d0c46", // Deep purple
  accentColor: "#caa968",  // Gold accent
  futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)",
  activeGlow: "0 0 15px rgba(202, 169, 104, 0.6)",
  cardHover: {
    transform: 'translateY(-8px)',
    boxShadow: '0 10px 25px rgba(29, 12, 70, 0.2)',
    transition: 'all 0.3s ease-in-out'
  },
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },
  statusChipColors: {
    active: '#10B981', // Green
    pastdue: '#F59E0B', // Amber
    cancelled: '#EF4444', // Red
    inactive: '#6B7280', // Gray
    coming_soon: '#8B5CF6' // Purple
  }
};

const Settings = ({ onMenuClick, screenSize = {}, isSidebarVisible = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useParams();
  const [seteam, setseTeam] = useState(localStorage.getItem("selectedTeam"));
  const [isCompactMode, setIsCompactMode] = useState(true); // Settings sidebar should be compact by default
  const [isHovering, setIsHovering] = useState(false);
  const { selectedTeam, setSelectedTeam } = useTeam();
  const { isActive: hasActiveSubscription, plan, status, loading } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

  // Determine active section based on current path
  const determineActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/teamsSection')) return 'teams';
    if (path.includes('/pricing')) return 'pricing';
    return 'general';
  };

  const [activeSection, setActiveSection] = useState(determineActiveSection);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(true); // Start with settings sidebar open on desktop

  useEffect(() => {
    setseTeam(localStorage.getItem("selectedTeam"));
  }, [team]);

  useEffect(() => {
    // Update active section when route changes
    setActiveSection(determineActiveSection());
  }, [location.pathname]);
  
  // Close sidebar when resizing to larger screens but keep it visible on desktop
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        // On desktop, settings sidebar should be open by default
        setSettingsSidebarOpen(true);
      } else {
        // On mobile, settings sidebar should be closed by default
        setSettingsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toggleSettingsSidebar = () => {
    setSettingsSidebarOpen(!settingsSidebarOpen);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };
  
  const handleSectionChange = (section) => {
    setActiveSection(section);
    // Navigate to the corresponding route
    switch(section) {
      case 'general':
        navigate(`/${seteam}/settings`);
        break;
      case 'billing':
        navigate(`/${seteam}/settings/billing`);
        break;
      case 'teams':
        navigate(`/${seteam}/settings/teamsSection`);
        break;
      case 'pricing':
        navigate(`/${seteam}/settings/pricing`);
        break;
    }

    // On mobile, close the sidebar after selecting a section
    if (window.innerWidth < 1024) {
      setSettingsSidebarOpen(false);
    }
  };

  // Determine if we should show expanded content
  const showExpanded = !isCompactMode || isHovering;
  
  // Initialize a local isMobile variable with fallback
  const isMobile = screenSize && screenSize.isMobile;
  
  // Add function to manually refresh team subscription data
  const refreshSubscriptionData = async () => {
    if (!selectedTeam || !selectedTeam._id) {
      return;
    }
    
    try {
      setRefreshing(true);
      console.log('Manually refreshing team data for team:', selectedTeam._id);
      
      const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      
      // Fetch fresh team data including subscription information
      const response = await axios.get(`${API_URL}/api/team/${selectedTeam._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data._id) {
        console.log('Manually refreshed team data:', response.data);
        
        // Update the team data
        setSelectedTeam(response.data);
        
        // Additional direct check of subscription status
        const subResponse = await axios.get(`${API_URL}/api/stripe/subscription/${selectedTeam._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Direct subscription check:', subResponse.data);
      }
    } catch (error) {
      console.error('Error manually refreshing team data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Header onMenuClick={onMenuClick} screenSize={screenSize} />
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Content area with header and flexible content */}
        <div className="flex flex-col w-full h-screen">
          {/* Content area below header */}
          <div className="flex flex-1 overflow-hidden">
            {/* Settings sidebar - positioned like the second nav in on-chain/off-chain */}
        <div 
              style={{ borderLeft: 0, margin: 0, padding: 0 }}
          className={`${
                settingsSidebarOpen ? 'md:w-48 md:static md:block bg-white shadow-md h-full flex-shrink-0 transition-all duration-300 border-r border-gray-200' : 'hidden lg:hidden'
              }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-xs text-gray-500">Manage your analytics</p>
            </div>
            <button 
              className="lg:hidden" 
              onClick={() => setSettingsSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          
              <nav className="p-4 space-y-2 overflow-y-auto max-h-full">
                {/* General button */}
                <div 
                  onClick={() => handleSectionChange("general")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "general" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                  <SettingsIcon size={16} />
                  <span>General</span>
                  </div>
                </div>
                
                {/* Billing button */}
                <div 
                  onClick={() => handleSectionChange("billing")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "billing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                  <CreditCard size={16} />
                  <span>Billing</span>
                  </div>
                </div>
                
                {/* Pricing button */}
                <div 
                  onClick={() => handleSectionChange("pricing")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "pricing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                  <Tag size={16} />
                  <span>Pricing Plans</span>
                  </div>
                </div>
                
                {/* Teams button */}
                <div 
                  onClick={() => handleSectionChange("teams")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "teams" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>Manage Teams</span>
                  </div>
                </div>
          
                <div className="p-2 border-t mt-4 text-xs text-gray-500">
            Settings for {seteam}
          </div>
              </nav>
        </div>
        
        {/* Button to open sidebar on mobile */}
            <div className="lg:hidden fixed top-4 left-16 z-40 p-2 bg-white rounded-md shadow-md">
          <button 
            onClick={toggleSettingsSidebar}
                className="p-1"
              >
                <Menu size={20} />
              </button>
            </div>
            
            {/* Right content area - scrollable */}
            <div className="flex-grow overflow-y-auto">
              {/* Settings content based on active section */}
              {activeSection === "general" && (
                <div className="p-4 sm:p-6 m-4 rounded-lg"
                  style={{ 
                    background: 'radial-gradient(circle at 50% 50%, rgba(29, 12, 70, 0.03), transparent)',
                    maxWidth: '1100px',
                    margin: '16px auto'
                  }}
                >
                  <div className="max-w-4xl mx-auto">
                    {/* Subscription Status Card */}
                    <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
                      <div className={`p-4 text-white ${hasActiveSubscription ? 'bg-green-600' : 'bg-amber-600'}`}>
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold flex items-center">
                            <Shield className="mr-2" size={20} />
                            Subscription Status
                          </h2>
                          {!hasActiveSubscription && (
                            <button 
                              onClick={() => handleSectionChange("billing")}
                              className="px-4 py-2 bg-white text-amber-600 rounded-md font-medium text-sm hover:bg-gray-100 transition-colors"
                            >
                              Upgrade Now
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-6">
                        {loading || refreshing ? (
                          <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-4">
                              <div>
                                <h3 className="font-medium text-gray-700">Current Plan</h3>
                                <p className="text-lg font-bold capitalize">{plan}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className={`px-3 py-1 rounded-full text-white text-sm ${
                                  status === 'active' ? 'bg-green-500' : 
                                  status === 'past_due' ? 'bg-amber-500' : 
                                  status === 'canceled' ? 'bg-red-500' : 'bg-gray-500'
                                }`}>
                                  {status === 'past_due' ? 'Past Due' : 
                                   status === 'incomplete' ? 'Incomplete' : 
                                   status === 'canceled' ? 'Canceled' : 
                                   status === 'active' ? 'Active' : 
                                   status}
                                </div>
                                <button 
                                  onClick={refreshSubscriptionData}
                                  className="p-1 text-gray-500 hover:text-gray-700"
                                  title="Refresh subscription data"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {!hasActiveSubscription && (
                              <div className="bg-amber-50 p-4 rounded-md border border-amber-200 flex items-start">
                                <AlertTriangle className="text-amber-500 mr-3 flex-shrink-0 mt-1" size={18} />
                                <div>
                                  <h4 className="font-medium text-amber-800">Limited Access</h4>
                                  <p className="text-amber-700 text-sm">
                                    You currently have access to the dashboard and settings only.
                                    Upgrade to unlock all premium features including analytics, smart contracts, and more.
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {hasActiveSubscription && (
                              <div className="bg-green-50 p-4 rounded-md border border-green-200 flex items-start">
                                <BarChart2 className="text-green-500 mr-3 flex-shrink-0 mt-1" size={18} />
                                <div>
                                  <h4 className="font-medium text-green-800">Full Access</h4>
                                  <p className="text-green-700 text-sm">
                                    You have full access to all Cryptique features and analytics.
                                    Thank you for your subscription!
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between pt-2">
                              <button 
                                onClick={() => handleSectionChange("pricing")} 
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View All Plans
                              </button>
                              <button 
                                onClick={() => handleSectionChange("billing")}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Manage Subscription
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      marginBottom: '24px'
                    }}>
                      <h1 style={{ 
                        ...styles.headingFont,
                        background: styles.futuristicGradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '1.875rem',
                        marginBottom: '0.5rem'
                      }}>
                        General Settings
                      </h1>
                      <p style={{
                        ...styles.bodyFont,
                        color: 'rgba(107, 114, 128, 0.8)',
                        fontSize: '0.875rem'
                      }}>
                        Configure your Cryptique analytics experience and manage API access
                      </p>
                    </div>

                    {/* API Keys Section */}
                    <div style={{
                      ...styles.glassmorphism,
                      marginBottom: '24px',
                      padding: '24px',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      ':hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h2 style={{
                            ...styles.headingFont,
                            color: styles.primaryColor,
                            fontSize: '1.25rem',
                            marginBottom: '0.25rem'
                          }}>API Keys</h2>
                          <span style={{
                            display: 'inline-block',
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            color: '#8B5CF6',
                            borderRadius: '9999px',
                            padding: '0.125rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}>Coming Soon</span>
                        </div>
                        <button style={{
                          backgroundColor: 'rgba(29, 12, 70, 0.6)',
                          color: 'white',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          opacity: '0.5',
                          cursor: 'not-allowed',
                          transition: 'background-color 0.2s'
                        }}>
                          Generate New Key
          </button>
                      </div>
                      <p style={{
                        ...styles.bodyFont,
                        color: 'rgba(75, 85, 99, 0.9)',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                      }}>
                        Use API keys to access Cryptique data programmatically. This feature is currently in development and will be available soon.
                      </p>

                      <div style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(209, 213, 219, 0.5)',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        marginBottom: '1rem',
                        opacity: '0.7'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          backgroundColor: 'rgba(243, 244, 246, 0.7)',
                          borderBottom: '1px solid rgba(209, 213, 219, 0.5)'
                        }}>
                          <div>
                            <span style={{
                              fontWeight: '500',
                              fontSize: '0.875rem'
                            }}>Example API Key</span>
                            <span style={{
                              display: 'inline-block',
                              marginLeft: '0.5rem',
                              backgroundColor: 'rgba(209, 213, 219, 0.5)',
                              color: 'rgba(75, 85, 99, 0.9)',
                              padding: '0 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem'
                            }}>Preview</span>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'rgba(107, 114, 128, 0.7)'
                          }}>Coming Soon</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem'
                        }}>
                          <div style={{
                            flex: '1',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            backgroundColor: 'rgba(249, 250, 251, 0.7)',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            marginRight: '1rem',
                            overflow: 'hidden'
                          }}>
                            cq_k••••••••••••••••••••••••
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem'
                          }}>
                            <button style={{
                              padding: '0.25rem 0.5rem',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              opacity: '0.5',
                              cursor: 'not-allowed'
                            }}>Copy</button>
                            <button style={{
                              padding: '0.25rem 0.5rem',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              opacity: '0.5',
                              cursor: 'not-allowed'
                            }}>Revoke</button>
                          </div>
          </div>
        </div>
        
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '0.375rem',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        color: 'rgba(30, 64, 175, 0.9)'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" style={{
                          height: '1.25rem',
                          width: '1.25rem',
                          marginRight: '0.5rem',
                          color: 'rgba(59, 130, 246, 0.8)'
                        }} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>
                          <strong>Coming Soon:</strong> API access will allow integration with your existing tools and custom dashboards. Subscribe to our updates to be notified when this feature launches.
                        </span>
                  </div>
                </div>
                
                    {/* Analytics Preferences */}
                    <div style={{
                      ...styles.glassmorphism,
                      marginBottom: '24px',
                      padding: '24px',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      ':hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}>
                      <h2 style={{
                        ...styles.headingFont,
                        color: styles.primaryColor,
                        fontSize: '1.25rem',
                        marginBottom: '0.5rem'
                      }}>Analytics Preferences</h2>
                      <p style={{
                        ...styles.bodyFont,
                        color: 'rgba(75, 85, 99, 0.9)',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                      }}>
                        Configure how analytics data is collected and displayed across your dashboard.
                      </p>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(249, 250, 251, 0.8)',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(229, 231, 235, 0.8)'
                        }}>
                          <div>
                            <h3 style={{
                              fontWeight: '500',
                              color: 'rgba(17, 24, 39, 0.9)',
                              fontSize: '0.875rem'
                            }}>Default Date Range</h3>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgba(107, 114, 128, 0.8)'
                            }}>Set the default time period for analytics charts</p>
                          </div>
                          <select style={{
                            padding: '0.5rem 0.75rem',
                            border: '1px solid rgba(209, 213, 219, 0.8)',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            backgroundColor: 'white'
                          }}>
                            <option value="7days">Last 7 days</option>
                            <option value="30days" selected>Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                            <option value="year">Last year</option>
                          </select>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(249, 250, 251, 0.8)',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(229, 231, 235, 0.8)'
                        }}>
                          <div>
                            <h3 style={{
                              fontWeight: '500',
                              color: 'rgba(17, 24, 39, 0.9)',
                              fontSize: '0.875rem'
                            }}>Data Granularity</h3>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgba(107, 114, 128, 0.8)'
                            }}>Choose the level of detail in your analytics</p>
                          </div>
                          <select style={{
                            padding: '0.5rem 0.75rem',
                            border: '1px solid rgba(209, 213, 219, 0.8)',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            backgroundColor: 'white'
                          }}>
                            <option value="hourly">Hourly</option>
                            <option value="daily" selected>Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                  </div>
                  
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(249, 250, 251, 0.8)',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(229, 231, 235, 0.8)'
                        }}>
                          <div>
                            <h3 style={{
                              fontWeight: '500',
                              color: 'rgba(17, 24, 39, 0.9)',
                              fontSize: '0.875rem'
                            }}>Real-time Analytics</h3>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgba(107, 114, 128, 0.8)'
                            }}>Enable live updating of dashboard stats</p>
                          </div>
                          <label style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}>
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div style={{
                              width: '2.75rem',
                              height: '1.5rem',
                              backgroundColor: '#3a1d8a',
                              borderRadius: '9999px',
                              position: 'relative',
                              transition: 'background-color 0.2s'
                            }}>
                              <span style={{
                                display: 'block',
                                position: 'absolute',
                                top: '0.125rem',
                                left: '1.5rem',
                                width: '1.25rem',
                                height: '1.25rem',
                                borderRadius: '9999px',
                                backgroundColor: 'white',
                                transition: 'transform 0.2s'
                              }}></span>
                            </div>
                          </label>
                        </div>
                  </div>
                  
                      <button style={{
                        marginTop: '1rem',
                        background: styles.futuristicGradient,
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                      }}>
                        Save Preferences
                      </button>
                    </div>
                    
                    {/* Data Export */}
                    <div style={{
                      ...styles.glassmorphism,
                      marginBottom: '24px',
                      padding: '24px',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      ':hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}>
                      <h2 style={{
                        ...styles.headingFont,
                        color: styles.primaryColor,
                        fontSize: '1.25rem',
                        marginBottom: '0.5rem'
                      }}>Data Export</h2>
                      <p style={{
                        ...styles.bodyFont,
                        color: 'rgba(75, 85, 99, 0.9)',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                      }}>
                        Export your analytics data in various formats for reporting and deeper analysis.
                      </p>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          padding: '1rem',
                          border: '1px solid rgba(209, 213, 219, 0.8)',
                          borderRadius: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.6)',
                          transition: 'border-color 0.2s, background-color 0.2s',
                          ':hover': {
                            borderColor: styles.primaryColor,
                            backgroundColor: 'rgba(58, 29, 138, 0.05)'
                          }
                        }}>
                          <h3 style={{
                            fontWeight: '500',
                            marginBottom: '0.25rem',
                            color: styles.primaryColor
                          }}>User Analytics Export</h3>
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'rgba(107, 114, 128, 0.8)',
                            marginBottom: '0.75rem'
                          }}>Export detailed user behavior and conversion data</p>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem'
                          }}>
                            <button style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'white',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'rgba(249, 250, 251, 0.8)'
                              }
                            }}>CSV</button>
                            <button style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'white',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'rgba(249, 250, 251, 0.8)'
                              }
                            }}>JSON</button>
                            <button style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'white',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'rgba(249, 250, 251, 0.8)'
                              }
                            }}>Excel</button>
                    </div>
                  </div>
                  
                        <div style={{
                          padding: '1rem',
                          border: '1px solid rgba(209, 213, 219, 0.8)',
                          borderRadius: '0.5rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.6)',
                          transition: 'border-color 0.2s, background-color 0.2s',
                          ':hover': {
                            borderColor: styles.primaryColor,
                            backgroundColor: 'rgba(58, 29, 138, 0.05)'
                          }
                        }}>
                          <h3 style={{
                            fontWeight: '500',
                            marginBottom: '0.25rem',
                            color: styles.primaryColor
                          }}>Smart Contract Analytics</h3>
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'rgba(107, 114, 128, 0.8)',
                            marginBottom: '0.75rem'
                          }}>Export on-chain transaction and interaction data</p>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem'
                          }}>
                            <button style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'white',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'rgba(249, 250, 251, 0.8)'
                              }
                            }}>CSV</button>
                            <button style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'white',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'rgba(249, 250, 251, 0.8)'
                              }
                            }}>JSON</button>
                            <button style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'white',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s',
                              ':hover': {
                                backgroundColor: 'rgba(249, 250, 251, 0.8)'
                              }
                            }}>Excel</button>
                          </div>
                        </div>
                  </div>
                  
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '0.375rem',
                        padding: '0.75rem',
                        fontSize: '0.875rem',
                        color: 'rgba(146, 64, 14, 0.9)'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" style={{
                          height: '1.25rem',
                          width: '1.25rem',
                          marginRight: '0.5rem',
                          color: 'rgba(245, 158, 11, 0.8)'
                        }} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Exports may take a few minutes for larger data sets.</span>
                  </div>
                </div>
                
                    {/* Advanced Settings */}
                    <div style={{
                      ...styles.glassmorphism,
                      padding: '24px',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      ':hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}>
                      <h2 style={{
                        ...styles.headingFont,
                        color: styles.primaryColor,
                        fontSize: '1.25rem',
                        marginBottom: '0.5rem'
                      }}>Advanced Settings</h2>
                      <p style={{
                        ...styles.bodyFont,
                        color: 'rgba(75, 85, 99, 0.9)',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                      }}>
                        Configure advanced features for your Cryptique analytics account.
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(249, 250, 251, 0.8)',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(229, 231, 235, 0.8)'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontWeight: '500',
                              color: 'rgba(17, 24, 39, 0.9)',
                              fontSize: '0.875rem'
                            }}>Data Retention</h3>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgba(107, 114, 128, 0.8)',
                              marginBottom: '0.5rem'
                            }}>Control how long your analytics data is stored</p>
                            <select style={{
                              padding: '0.5rem 0.75rem',
                              border: '1px solid rgba(209, 213, 219, 0.8)',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              backgroundColor: 'white'
                            }}>
                              <option value="3months">3 months</option>
                              <option value="6months">6 months</option>
                              <option value="1year" selected>1 year</option>
                              <option value="forever">Indefinitely</option>
                            </select>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(249, 250, 251, 0.8)',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(229, 231, 235, 0.8)'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontWeight: '500',
                              color: 'rgba(17, 24, 39, 0.9)',
                              fontSize: '0.875rem'
                            }}>IP Anonymization</h3>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgba(107, 114, 128, 0.8)',
                              marginBottom: '0.5rem'
                            }}>Mask the last octet of user IP addresses for privacy</p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <label style={{
                                position: 'relative',
                                display: 'inline-flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                marginRight: '1rem'
                              }}>
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div style={{
                                  width: '2.75rem',
                                  height: '1.5rem',
                                  backgroundColor: '#3a1d8a',
                                  borderRadius: '9999px',
                                  position: 'relative',
                                  transition: 'background-color 0.2s'
                                }}>
                                  <span style={{
                                    display: 'block',
                                    position: 'absolute',
                                    top: '0.125rem',
                                    left: '1.5rem',
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    borderRadius: '9999px',
                                    backgroundColor: 'white',
                                    transition: 'transform 0.2s'
                                  }}></span>
                                </div>
                              </label>
                              <span style={{
                                fontSize: '0.875rem',
                                color: 'rgba(75, 85, 99, 0.9)'
                              }}>Enabled</span>
                            </div>
                          </div>
                  </div>
                  
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(249, 250, 251, 0.8)',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(229, 231, 235, 0.8)'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontWeight: '500',
                              color: 'rgba(17, 24, 39, 0.9)',
                              fontSize: '0.875rem'
                            }}>Custom Parameters Tracking</h3>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgba(107, 114, 128, 0.8)',
                              marginBottom: '0.5rem'
                            }}>Track additional custom parameters for deeper insights</p>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}>
                              <input type="text" placeholder="Parameter name (e.g., utm_campaign)" style={{
                                padding: '0.5rem 0.75rem',
                                border: '1px solid rgba(209, 213, 219, 0.8)',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                              }} />
                              <div style={{
                                display: 'flex',
                                gap: '0.5rem'
                              }}>
                                <button style={{
                                  padding: '0.375rem 0.75rem',
                                  backgroundColor: '#3a1d8a',
                                  color: 'white',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  border: 'none',
                                  transition: 'background-color 0.2s',
                                  ':hover': {
                                    backgroundColor: '#1d0c46'
                                  }
                                }}>Add Parameter</button>
                              </div>
                  </div>
                          </div>
                        </div>
                      </div>
                      
                      <button style={{
                        marginTop: '1rem',
                        background: styles.futuristicGradient,
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                      }}>
                        Save Advanced Settings
                      </button>
                </div>
              </div>
            </div>
          )}
          {activeSection === "billing" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
              <Billing />
            </div>
          )}
          {activeSection === "pricing" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
              <PricingSection />
            </div>
          )}
              {activeSection === "teams" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
                  <TeamsSection />
            </div>
          )}
            </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default Settings;