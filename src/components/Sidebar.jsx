import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BarChart3, Package, ShoppingCart, TrendingUp, LogOut } from 'lucide-react';
import { useIOSLayout } from '../hooks/useIOSLayout';
import './Sidebar.css';

export default function Sidebar({ active }) {
  const { user, signOut } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { isIOS, isStandalone, deviceType } = useIOSLayout();

  const menuItems = [
    { name: 'Tableau de Bord', path: '/dashboard', icon: BarChart3 },
    { name: 'Stock', path: '/stock', icon: Package },
    { name: 'Ventes', path: '/sales', icon: ShoppingCart },
    { name: 'Finances', path: '/finances', icon: TrendingUp },
  ];

  async function handleLogout() {
    closeSidebar();
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
    <>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isIOS && isStandalone ? 'ios-pwa' : ''} ${deviceType}`}>
        <div className="sidebar-safe-top" />
        <div className="sidebar-content">
          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${active === item.path ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-email">
              {user?.email}
            </div>
            <button onClick={handleLogout} className="btn-logout-sidebar">
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
        <div className="sidebar-safe-bottom" />
      </aside>

      {isSidebarOpen && <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />}
    </>
  );
}
