import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useIOSLayout } from '../hooks/useIOSLayout';
import './Navbar.css';

export default function Navbar() {
  const { signOut } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { isIOS, isStandalone, deviceType } = useIOSLayout();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const isAndroidDevice = (typeof navigator !== 'undefined') ? /Android/i.test(window.navigator?.userAgent || '') : false;

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallAvailable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallAvailable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallPWA() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      logger.debug('PWA installation accepted');
    } else {
      logger.debug('PWA installation dismissed');
    }

    setDeferredPrompt(null);
    setIsInstallAvailable(false);
  }

  async function handleLogout() {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
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
          <img src="/icons/icon-192.png?v=2" alt="ViewY" className="navbar-logo" />
        </div>

        <div className="navbar-actions">
          {isInstallAvailable && (
            <button onClick={handleInstallPWA} className="btn-install-pwa">
              {isAndroidDevice ? 'Télécharger l’application' : 'Installer l’app'}
            </button>
          )}

          <div className="navbar-user-desktop">
            <button onClick={handleLogout} className="btn-logout-desktop">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
