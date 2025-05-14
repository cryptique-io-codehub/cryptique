import React, { useState,useEffect } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Interface from './pages/Onboarding/LoginForm.js'
import Dashboard from './pages/Dashboard/Dashboard.js'
import LandingPage from './pages/LandingPage/LandingPage.js'
import Settings from './pages/Setting/Settings.js'
import Billing from './pages/Setting/Billing/Billing.js'
import TeamsSection from './pages/Setting/TeamsSection.js'
import { useTeam, TeamProvider } from "./context/teamContext.js";
import { SubscriptionProvider } from "./context/subscriptionContext.js";
import  {Navigate} from "react-router-dom";
import OffchainAnalytics from "./pages/Dashboard/OffchainAnalytics.js";
import OnchainExplorer from "./pages/Dashboard/OnchainExplorer.js";
import ManageWebsites from "./pages/Dashboard/ManageWebsites.js";
import ImportUsers from "./pages/Dashboard/ImportUsers.js";
import History from "./pages/Dashboard/History.js";
import ConversionEvents from "./pages/Dashboard/ConversionEvents.js";
import Campaigns from "./pages/Dashboard/Campaigns.js";
import Advertise from "./pages/Dashboard/Advertise.js";
import { useLocation } from "react-router-dom";
import TestAnalytics from './pages/TestAnalytics';
import { ContractDataProvider } from './contexts/ContractDataContext.js';
import axios from 'axios';

// Title updater component - this doesn't need access to Team context
const TitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean); // removes empty strings
    const lastSegment = pathSegments[pathSegments.length - 1] || 'login';

    const titleMap = {
      dashboard: 'Dashboard',
      settings: 'Settings',
      billing: 'Billing',
      teamsSection: 'Teams',
      offchain: 'Offchain Analytics',
      onchain: 'Onchain Explorer',
      campaigns: 'Campaigns',
      'conversion-events': 'Conversion Events',
      advertise: 'Advertise',
      history: 'History',
      importusers: 'Import Users',
      managewebsites: 'Manage Websites',
      'cq-intelligence': 'CQ Intelligence',
      login: 'Login',
      signup: 'Sign Up',
    };

    const pageTitle = titleMap[lastSegment.toLowerCase()] || 'MyApp';
    document.title = `${pageTitle}`;
  }, [location]);

  return null;
};

// Team data refresher - needs to be within the TeamProvider
const TeamDataRefresher = () => {
  const location = useLocation();
  const { selectedTeam, setSelectedTeam } = useTeam();
  
  // Refresh team subscription data on navigation
  useEffect(() => {
    const refreshTeamData = async () => {
      if (selectedTeam && selectedTeam._id) {
        try {
          console.log('Refreshing team data on route change for team:', selectedTeam._id);
          const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
          const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
          
          // Fetch fresh team data including subscription information
          const response = await axios.get(`${API_URL}/api/team/${selectedTeam._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data && response.data._id) {
            console.log('Refreshed team data:', response.data);
            
            // Update the team data in both state and localStorage
            setSelectedTeam(response.data);
          }
        } catch (error) {
          console.error('Error refreshing team data:', error);
        }
      }
    };
    
    refreshTeamData();
  }, [location.pathname, selectedTeam?._id, setSelectedTeam]);

  return null; // this component doesn't render anything
};

function App() {
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  
  return (
    <TeamProvider>
      <SubscriptionProvider>
        <ContractDataProvider>
          <BrowserRouter>
            <TitleUpdater />
            <TeamDataRefresher />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Interface />} />
              <Route path="/signup" element={<Interface />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/:team/offchain" element={<Dashboard />} />
              <Route path="/:team/onchain" element={<Dashboard />} />
              <Route path="/:team/campaigns" element={<Dashboard />} />
              <Route path="/:team/conversion-events" element={<Dashboard />} />
              <Route path="/:team/advertise" element={<Dashboard />} />
              <Route path="/:team/history" element={<Dashboard />} />
              <Route path="/:team/importusers" element={<Dashboard />} />
              <Route path="/:team/managewebsites" element={<Dashboard />} />
              <Route path="/:team/cq-intelligence" element={<Dashboard />} />
              
              {/* Route settings pages through Dashboard component for consistent sidebar behavior */}
              <Route path="/:team/settings" element={<Dashboard />} />
              <Route path="/:team/settings/billing" element={<Dashboard />} />
              <Route path="/:team/settings/teamsSection" element={<Dashboard />} />
              <Route path="/:team/settings/pricing" element={<Dashboard />} />
              
              <Route path="/test-analytics" element={<TestAnalytics />} />
            </Routes>
          </BrowserRouter>
        </ContractDataProvider>
      </SubscriptionProvider>
    </TeamProvider>
  )
}

export default App
