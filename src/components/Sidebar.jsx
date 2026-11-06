import React, { useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { BarChart3, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const location = useLocation();

  const menuItems = [
    { name: 'Accueil', path: '/dashboard', icon: BarChart3 },
    { name: 'Commandes', path: '/orders', icon: Package, badge: 0 },
    { name: 'Mes Ventes', path: '/sales', icon: ShoppingCart, badge: 0 },
    { name: 'Stock', path: '/stock', icon: Package, badge: 0 },
    { name: 'Mon Argent', path: '/finances', icon: TrendingUp, badge: 0 },
    { name: 'Clients', path: '/clients', icon: Package, badge: 0 },
  ];

  // Fonction pour vérifier si le chemin est actif (avec gestion des slashes)
  const isActive = (path) => {
    const currentPath = location.pathname;
    // Normaliser les chemins (enlever les slashes multiples)
    const normalizedCurrent = currentPath.replace(/\/+$/, '') || '/';
    const normalizedPath = path.replace(/\/+$/, '') || '/';
    return normalizedCurrent === normalizedPath;
  };

  // Fermer la sidebar quand on clique en dehors (utile pour tablettes portrait)
  const sidebarRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!isSidebarOpen) return;
      const el = sidebarRef.current;
      if (!el) return;
      if (!el.contains(e.target)) {
        closeSidebar();
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSidebarOpen, closeSidebar]);

  return (
    <>
      <aside ref={sidebarRef} className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-brand-mobile">
            <img src="/icons/icon-192.png?v=2" alt="ViewY" className="sidebar-logo" />
          </div>
          <nav className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={`${item.path}-${item.name}`}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={closeSidebar}
                title={item.name}
                aria-label={item.name}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />
    </>
  );
}