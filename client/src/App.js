import React, { useState,useEffect } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Interface from './pages/Onboarding/LoginForm.js'
import Dashboard from './pages/Dashboard/Dashboard.js'
import LandingPage from './pages/LandingPage/LandingPage.js'
import Settings from './pages/Setting/Settings.js'
import Billing from './pages/Setting/Billing/Billing.js'
import MembersSection from './pages/Setting/MembersSection.js'
import PersonalInfoSection from './pages/Setting/PersonalInfoSection.js'
import TeamsSection from './pages/Setting/TeamsSection.js'
import SubscriptionConfirmation from './pages/Setting/Billing/Confirmation.js'
import { useTeam } from "./context/teamContext.js";
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

const RouteListener = () => {
  const location = useLocation();

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean); // removes empty strings
    const lastSegment = pathSegments[pathSegments.length - 1] || 'login';

    const titleMap = {
      dashboard: 'Dashboard',
      settings: 'Settings',
      billing: 'Billing',
      members: 'Members',
      personal: 'Personal Info',
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

  return null; // this component doesn't render anything
};
function App() {
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  
  return (
    <ContractDataProvider>
      <BrowserRouter>
        <RouteListener />
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
          
          {/* Parent Route for Settings */}
          <Route path="/:team/settings" element={<Settings />}>
            {/* Child Route for Billing */}
            <Route path="/:team/settings/billing"  element={<Billing />} />
            <Route path="/:team/settings/billing/confirmation" element={<SubscriptionConfirmation />} />
            <Route path="/:team/settings/members" element={<MembersSection />} />
            <Route path="/:team/settings/personal" element={<PersonalInfoSection/>} />
            <Route path="/:team/settings/teamsSection" element={<TeamsSection/>} />
            
          </Route>
  
          <Route path="/test-analytics" element={<TestAnalytics />} />
  
        </Routes>
      </BrowserRouter>
    </ContractDataProvider>
  )
}

export default App
