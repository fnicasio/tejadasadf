import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Logo from './Logo';
import PersonalManagement from './PersonalManagement';
import ComunidadesManagement from './ComunidadesManagement';
import { 
  LogOut, 
  Building2, 
  Home,
  UserCheck 
} from 'lucide-react';

export function Dashboard() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const user = auth.currentUser;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Dashboard Top Header */}
      <header className="dashboard-header">
        <div className="flex items-center" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
          {/* Small compact logo representation without title text */}
          <Logo size={42} showText={false} light={true} />
          <span 
            className="ml-3 font-serif text-lg md:text-xl font-medium text-white tracking-wide"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            Tejada's Administradores de Fincas
          </span>
        </div>
        
        {/* User identification and logout */}
        <div className="flex items-center gap-4">
          <div className="user-badge hidden md:flex">
            <UserCheck size={16} style={{ color: 'var(--gold-light)' }} />
            <span className="user-email">{user ? user.email : 'Administrador'}</span>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="btn-signout"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <span>Cerrando...</span>
            ) : (
              <>
                <LogOut size={15} />
                <span>Salir</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {currentView === 'home' && (
          <div className="welcome-card">
            <span className="waving-hand" role="img" aria-label="waving hand">👋</span>
            <h1 className="welcome-title">Bienvenido al Panel de Control</h1>
            <p className="welcome-desc">
              Has iniciado sesión correctamente como <strong style={{ color: 'var(--primary-medium)' }}>{user ? user.email : 'administrador'}</strong>.
              Selecciona el módulo de gestión que deseas operar.
            </p>

            {/* Two Cards: Gestión de Personal and Gestión de Comunidades */}
            <div className="info-grid">
              <div 
                className="info-item" 
                style={{ 
                  cursor: 'pointer', 
                  border: '1.5px solid var(--cream-dark)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={() => setCurrentView('personal')}
              >
                <Building2 className="info-item-icon" size={32} />
                <h4 className="info-item-title" style={{ fontSize: '18px', marginTop: '10px' }}>Gestión de Personal</h4>
                <p className="info-item-desc" style={{ fontSize: '14px', marginTop: '8px' }}>
                  Administración de gestores y contables de la oficina, asignación de roles y control de comunidades.
                </p>
              </div>

              <div 
                className="info-item" 
                style={{ 
                  cursor: 'pointer', 
                  border: '1.5px solid var(--cream-dark)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={() => setCurrentView('comunidades')}
              >
                <Home className="info-item-icon" size={32} />
                <h4 className="info-item-title" style={{ fontSize: '18px', marginTop: '10px' }}>Gestión de Comunidades</h4>
                <p className="info-item-desc" style={{ fontSize: '14px', marginTop: '8px' }}>
                  Configuración e información de comunidades de vecinos, presupuestos de bases imponibles y equipamiento.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'personal' && (
          <PersonalManagement onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'comunidades' && (
          <ComunidadesManagement onBack={() => setCurrentView('home')} />
        )}
      </main>

      {/* Corporate Footer */}
      <footer className="dashboard-footer">
        <div>Tejada's Administradores de Fincas S.L. &copy; {new Date().getFullYear()}</div>
        <div style={{ marginTop: '5px', opacity: 0.6 }}>Todos los derechos reservados. Oficina de Administración Digital.</div>
      </footer>
    </div>
  );
}

export default Dashboard;
