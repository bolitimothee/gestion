import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BarChart3, Package, ShoppingCart, TrendingUp, LogOut } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const location = useLocation();

  const menuItems = [
    { name: 'Tableau de Bord', path: '/dashboard', icon: BarChart3 },
    { name: 'Stock', path: '/stock', icon: Package },
    { name: 'Ventes', path: '/sales', icon: ShoppingCart },
    { name: 'Finances', path: '/finances', icon: TrendingUp },
  ];

  // Fonction pour vérifier si le chemin est actif (avec gestion des slashes)
  const isActive = (path) => {
    const currentPath = location.pathname;
    // Normaliser les chemins (enlever les slashes multiples)
    const normalizedCurrent = currentPath.replace(/\/+$/, '') || '/';
    const normalizedPath = path.replace(/\/+$/, '') || '/';
    return normalizedCurrent === normalizedPath;
  };

  async function handleLogout() {
    closeSidebar();
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      window.location.href = '/login';
    }
  }

  return (
    <>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <nav className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-email">
              {user?.email}
            </div>
            <button onClick={handleLogout} className="btn-logout-sidebar">
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />
    </>
  );
}