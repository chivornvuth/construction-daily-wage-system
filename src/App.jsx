import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';

// Components
import LoginScreen from './components/auth/LoginScreen';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import EmployeeManager from './components/employees/EmployeeManager';
import AttendanceSystem from './components/attendance/AttendanceSystem';
import Reports from './components/reports/Reports';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        // Diagnostic check for Firestore connectivity/permissions
        // This can be removed once the security rules are fully applied in Firebase Console
        setDoc(doc(db, '_diagnostics', u.uid), { 
          lastAccess: new Date().toISOString(),
          type: 'write_test'
        }).then(() => {
          console.log("✅ Firestore: Connection and write permissions are functional");
        }).catch(err => {
          if (err.code === 'permission-denied') {
            console.warn("⚠️ Firestore: Permission denied. Please check your Security Rules in Firebase Console.");
          } else {
            console.error("❌ Firestore Diagnostic Error:", err.message);
          }
        });
      }
      setUser(u);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 font-sans">
        កំពុងដំណើរការ...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      onNavClick={setCurrentView}
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
    >
      {currentView === 'dashboard' && <Dashboard user={user} />}
      {currentView === 'employees' && <EmployeeManager user={user} />}
      {currentView === 'attendance' && <AttendanceSystem user={user} />}
      {currentView === 'reports' && <Reports user={user} />}
    </Layout>
  );
}