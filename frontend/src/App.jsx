import { useState } from 'react'
import Interface from './Interface.jsx'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './dashboard.jsx';
import './App.css';
function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/"  element={<Interface/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
      </Routes>
    </Router>
  )
}

export default App
