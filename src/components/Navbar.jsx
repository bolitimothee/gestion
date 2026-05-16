import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useIOSLayout } from '../hooks/useIOSLayout';
import './Navbar.css';

export default function Navbar() {
  const { signOut } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { isIOS, isStandalone, deviceType } = useIOSLayout();

  async function handleLogout() {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, quand même rediriger vers login
      window.location.href = '/login';
    }
  }

  return (
    <nav className={`navbar ${isIOS && isStandalone ? 'ios-pwa' : ''} ${deviceType}`}>
      <div className="navbar-safe-top" />
      <div className="navbar-container">
        <button className="navbar-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="navbar-brand">
          <h1>Gestion Commerce</h1>
        </div>

        <div className="navbar-user-desktop">
          <button onClick={handleLogout} className="btn-logout-desktop">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
