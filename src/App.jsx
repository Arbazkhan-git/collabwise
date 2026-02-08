import React from 'react';
import './App.css';
import Dashboard from './Pages/Dashboard';
import Loginuser from './Pages/Login';
import { Route, Routes, Navigate } from 'react-router-dom';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/loginuser" />} />
        <Route path="/loginuser" element={<Loginuser />} />
        <Route path="/home" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}

export default App;
