import React, { useState,useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Interface from './pages/Onboarding/LoginForm.js'
import Dashboard from './pages/Dashboard/Dashboard.js'
import LandingPage from './pages/LandingPage/LandingPage.js'
import Settings from './pages/Setting/Settings.js'
import Billing from './pages/Setting/Billing/Billing.js'
import MembersSection from './pages/Setting/MembersSection.js'
import PersonalInfoSection from './pages/Setting/PersonalInfoSection.js'
import TeamsSection from './pages/Setting/TeamsSection.js'
import { useTeam } from "./context/teamContext.js";
import  {Navigate as ReactNavigate} from "react-router-dom";
import OffchainAnalytics from "./pages/Dashboard/OffchainAnalytics.js";
import OnchainExplorer from "./pages/Dashboard/OnchainExplorer.js";
import KOLIntelligence from "./pages/Dashboard/KOLIntelligence.js";
import ManageWebsites from "./pages/Dashboard/ManageWebsites.js";
import ImportUsers from "./pages/Dashboard/ImportUsers.js";
import History from "./pages/Dashboard/History.js";
import ConversionEvents from "./pages/Dashboard/ConversionEvents.js";
import Campaigns from "./pages/Dashboard/Campaigns.js";
import Advertise from "./pages/Dashboard/Advertise.js";
import CustomDashboard from "./pages/Dashboard/CustomDashboard.js";
import { useLocation } from "react-router-dom";
import TestAnalytics from './pages/TestAnalytics';
import CQIntelligence from './pages/CQIntelligence/CQIntelligence';
import { AuthProvider, useAuth } from './context/AuthContext';

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
      kol: 'KOL Intelligence',
      campaigns: 'Campaigns',
      'conversion-events': 'Conversion Events',
      advertise: 'Advertise',
      history: 'History',
      importusers: 'Import Users',
      managewebsites: 'Manage Websites',
      login: 'Login',
      signup: 'Sign Up',
    };

    const pageTitle = titleMap[lastSegment.toLowerCase()] || 'MyApp';
    document.title = `${pageTitle}`;
  }, [location]);

  return null; // this component doesn't render anything
};

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  // const Navigate = useNavigate();
  



  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <RouteListener />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Interface />} />
            <Route path="/signup" element={<Interface />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="custom-dashboard" element={<CustomDashboard />} />
              <Route path="cq-intelligence" element={<CQIntelligence />} />
            </Route>
            <Route path="/:team/offchain" element={<OffchainAnalytics />} />
            <Route path="/:team/onchain" element={<OnchainExplorer />} />
            <Route path="/:team/kol" element={<KOLIntelligence/>} />
            <Route path="/:team/campaigns" element={<Campaigns/>} />
            <Route path="/:team/conversion-events" element={<ConversionEvents/>} />
            <Route path="/:team/advertise" element={<Advertise/>} />
            <Route path="/:team/history" element={<History/>} />
            <Route path="/:team/importusers" element={<ImportUsers/>} />
            <Route path="/:team/managewebsites" element={<ManageWebsites/>} />
            
            {/* Parent Route for Settings */}
            <Route path="/:team/settings" element={<Settings />}>
              {/* Child Route for Billing */}
              <Route path="/:team/settings/billing"  element={<Billing />} />
              <Route path="/:team/settings/members" element={<MembersSection />} />
              <Route path="/:team/settings/personal" element={<PersonalInfoSection/>} />
              <Route path="/:team/settings/teamsSection" element={<TeamsSection/>} />
              
            </Route>

            <Route path="/test-analytics" element={<TestAnalytics />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
