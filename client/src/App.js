import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Layout from './components/Layout/Layout';
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

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff9d',
    },
    secondary: {
      main: '#8b5cf6',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

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
            
            {/* Protected Routes - No Layout wrapper */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/offchain" 
              element={
                <PrivateRoute>
                  <OffchainAnalytics />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/onchain" 
              element={
                <PrivateRoute>
                  <OnchainExplorer />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/kol" 
              element={
                <PrivateRoute>
                  <KOLIntelligence />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/cq-intelligence" 
              element={
                <PrivateRoute>
                  <CQIntelligence />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/campaigns" 
              element={
                <PrivateRoute>
                  <Campaigns />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/conversion-events" 
              element={
                <PrivateRoute>
                  <ConversionEvents />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/advertise" 
              element={
                <PrivateRoute>
                  <Advertise />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/importusers" 
              element={
                <PrivateRoute>
                  <ImportUsers />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/managewebsites" 
              element={
                <PrivateRoute>
                  <ManageWebsites />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/custom-dashboard" 
              element={
                <PrivateRoute>
                  <CustomDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Settings Routes */}
            <Route 
              path="/settings" 
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/settings/billing" 
              element={
                <PrivateRoute>
                  <Billing />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/settings/members" 
              element={
                <PrivateRoute>
                  <MembersSection />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/settings/personal" 
              element={
                <PrivateRoute>
                  <PersonalInfoSection />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/settings/teams" 
              element={
                <PrivateRoute>
                  <TeamsSection />
                </PrivateRoute>
              } 
            />
            
            <Route path="/test-analytics" element={<TestAnalytics />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
