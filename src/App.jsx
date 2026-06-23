import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Logo from './components/Logo';

export function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Monitor session state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    // Unsubscribe from the observer on unmount
    return () => unsubscribe();
  }, []);

  // Premium loading screen while resolving authentication status
  if (initializing) {
    return (
      <div className="full-screen-loader">
        <Logo size={120} showText={true} light={false} className="animate-pulse" />
        <div 
          className="spinner mt-4" 
          style={{ 
            borderTopColor: 'var(--gold-dark)', 
            width: '28px', 
            height: '28px', 
            borderWidth: '3px' 
          }} 
        />
        <p 
          className="text-xs uppercase tracking-widest mt-2 font-medium" 
          style={{ color: 'var(--primary-light)', letterSpacing: '0.2em' }}
        >
          Cargando Sistema...
        </p>
      </div>
    );
  }

  // Session-based routing
  return user ? <Dashboard /> : <Login />;
}

export default App;
