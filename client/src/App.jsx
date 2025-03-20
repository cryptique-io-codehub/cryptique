import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Interface from './pages/Onboarding/Interface.jsx'
import Dashboard from './pages/Dashboard/dashboard.jsx'
import LandingPage from './pages/LandingPage/LandingPage.jsx'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route exact path="/login" element={<Interface />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
