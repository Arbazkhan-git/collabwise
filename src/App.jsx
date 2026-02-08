import React, { useEffect } from 'react';
import './App.css';
import Dashboard from './Pages/Dashboard';
import Loginuser from './Pages/Login';
import { Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Sync current user to Firestore "users" so they can be found by email (invites).
// Runs on every auth state change so both new and existing Firebase Auth users get a document.
function useSyncUserToFirestore() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      try {
        const email = (currentUser.email || '').trim().toLowerCase();
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            uid: currentUser.uid,
            email,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to sync user to Firestore:', err);
      }
    });
    return () => unsubscribe();
  }, []);
}

function App() {
  useSyncUserToFirestore();

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
