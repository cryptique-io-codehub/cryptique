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
import { useTeam } from "./context/teamContext.js";
import  {Navigate} from "react-router-dom";
import OffchainAnalytics from "./pages/Dashboard/OffchainAnalytics.js";
import OnchainExplorer from "./pages/Dashboard/OnchainExplorer.js";
import KOLIntelligence from "./pages/Dashboard/KOLIntelligence.js";
import ManageWebsites from "./pages/Dashboard/ManageWebsites.js";
import ImportUsers from "./pages/Dashboard/ImportUsers.js";
import History from "./pages/Dashboard/History.js";
import ConversionEvents from "./pages/Dashboard/ConversionEvents.js";
import Campaigns from "./pages/Dashboard/Campaigns.js";
import Advertise from "./pages/Dashboard/Advertise.js";
function App() {
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  // const Navigate = useNavigate();
  return (
    
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Interface />} />
        <Route path="/signup" element={<Interface />} />
        <Route path="/:team/dashboard" element={<Dashboard />} />
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

      </Routes>
    </BrowserRouter>
  )
}

export default App
