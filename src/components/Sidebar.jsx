import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BarChart3, Package, ShoppingCart, TrendingUp, LogOut } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ active }) {
  const { user, account, signOut } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();

  const menuItems = [
    { name: 'Tableau de Bord', path: '/dashboard', icon: BarChart3 },
    { name: 'Stock', path: '/stock', icon: Package },
    { name: 'Ventes', path: '/sales', icon: ShoppingCart },
    { name: 'Finances', path: '/finances', icon: TrendingUp },
  ];

  async function handleLogout() {
    closeSidebar();
    await signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${active === item.path ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-account">
                <span className="account-name">{account?.account_name || 'Mon Compte'}</span>
                <span className="account-email">{user?.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout-sidebar">
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
    </>
  );
}
