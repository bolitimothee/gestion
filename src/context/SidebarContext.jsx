import React, { useState, useEffect } from 'react';
import { SidebarContext } from './SidebarContextBase';

export function SidebarProvider({ children }) {
  // Détecter la taille de l'écran au chargement
  const getInitialState = () => {
    if (typeof window !== 'undefined') {
      // Sur desktop (>1024px), la sidebar doit être visible par défaut et immobile
      if (window.innerWidth > 1024) {
        return true;
      }
      // Sur tablette et mobile (<1024px), la sidebar doit être cachée par défaut
      return false;
    }
    return false;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialState);

  // Mettre à jour l'état si la taille de l'écran change
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1024) {
        // Sur desktop, garder la sidebar ouverte et immobile
        setIsSidebarOpen(true);
      } else {
        // Sur tablette et mobile, fermer la sidebar
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
