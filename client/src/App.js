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
function App() {
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  return (
    
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Interface />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
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
