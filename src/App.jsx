import React from 'react';
import './App.css';
import Home from './Pages/Home';
import Loginuser from './Pages/Login';
import { Route, Routes, Navigate } from 'react-router-dom';
import Taskmanager from './components/Taskmanager';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/loginuser" />} />
      <Route path="/loginuser" element={<Loginuser />} />
      <Route path="/home" element={<Home />} />
      <Route path="/taskmanager/:boardId" element={<Taskmanager />} />
    </Routes>
  );
}

export default App;
