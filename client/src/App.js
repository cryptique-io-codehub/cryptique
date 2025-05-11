import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Interface from './pages/Onboarding/LoginForm.js'
import Dashboard from './pages/Dashboard/Dashboard.js'
import LandingPage from './pages/LandingPage/LandingPage.js'
import Settings from './pages/Setting/Settings.js'
import Billing from './pages/Setting/Billing/Billing.js'
import TeamsSection from './pages/Setting/TeamsSection.js'
import { useTeam, TeamProvider } from "./context/teamContext.js";
import { SubscriptionProvider } from "./context/subscriptionContext.js";
import SubscriptionGuard from "./components/SubscriptionGuard.js";
import { Navigate } from "react-router-dom";
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

// Enhanced Dashboard route component with subscription protection
const ProtectedDashboardRoute = ({ feature, path }) => (
  <Route 
    path={path} 
    element={
      <SubscriptionGuard feature={feature}>
        <Dashboard />
      </SubscriptionGuard>
    } 
  />
);

function App() {
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  
  return (
    <TeamProvider>
      <SubscriptionProvider>
        <ContractDataProvider>
          <BrowserRouter>
            <RouteListener />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Interface />} />
              <Route path="/signup" element={<Interface />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Protected feature routes */}
              <ProtectedDashboardRoute path="/:team/offchain" feature="offchainAnalytics" />
              <ProtectedDashboardRoute path="/:team/onchain" feature="onchainExplorer" />
              <ProtectedDashboardRoute path="/:team/campaigns" feature="campaigns" />
              <ProtectedDashboardRoute path="/:team/conversion-events" feature="conversionEvents" />
              <ProtectedDashboardRoute path="/:team/advertise" feature="advertise" />
              <ProtectedDashboardRoute path="/:team/history" feature="history" />
              <ProtectedDashboardRoute path="/:team/importusers" feature="importUsers" />
              <ProtectedDashboardRoute path="/:team/cq-intelligence" feature="cqIntelligence" />
              
              {/* Manage websites is available on all plans */}
              <Route path="/:team/managewebsites" element={<Dashboard />} />
              
              {/* Settings pages are always accessible */}
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
