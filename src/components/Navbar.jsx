import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { LogOut, Menu, X } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  async function handleLogout() {
    await signOut();
    window.location.href = '/login';
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <button className="navbar-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="navbar-brand">
          <h1>📊 Gestion Commerce</h1>
        </div>

        <div className="navbar-user-desktop">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="btn-logout-desktop">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
