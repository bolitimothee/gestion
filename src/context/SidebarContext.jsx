import React, { useState, useEffect } from 'react';
import { SidebarContext } from './SidebarContextBase';

export function SidebarProvider({ children }) {
  // Détecter la taille de l'écran au chargement
  const getInitialState = () => {
    if (typeof window !== 'undefined') {
      // Sur tablette (768px - 1024px), la sidebar devrait être visible par défaut
      if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
        return true;
      }
      // Sur desktop (>1024px), la sidebar devrait être visible par défaut
      if (window.innerWidth > 1024) {
        return true;
      }
      // Sur mobile (<768px), la sidebar devrait être fermée par défaut
      return false;
    }
    return false;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialState);

  // Mettre à jour l'état si la taille de l'écran change
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 768) {
        // Sur tablette et desktop, garder la sidebar ouverte
        setIsSidebarOpen(true);
      } else {
        // Sur mobile, fermer la sidebar
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar, openSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}
