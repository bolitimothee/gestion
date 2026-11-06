import React, { useState, useEffect, useRef } from 'react';
import logger from '../utils/logger';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { useIOSLayout } from '../hooks/useIOSLayout';
import { showToast } from '../utils/toastService';
import './Navbar.css';

export default function Navbar() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, account, signOut } = useAuth();
  const navigate = useNavigate();
  const { isIOS, isStandalone, deviceType } = useIOSLayout();
  // Ensure class presence for legacy iOS detection when running as PWA
  useEffect(() => {
    try {
      const nav = document.querySelector('.navbar');
      if (!nav) return;
      if (isIOS && isStandalone) nav.classList.add('ios-pwa');
      else nav.classList.remove('ios-pwa');
    } catch {
      // ignore DOM errors
    }
  }, [isIOS, isStandalone]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const isAndroidDevice = (typeof navigator !== 'undefined') ? /Android/i.test(window.navigator?.userAgent || '') : false;
  const profileName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || account?.account_name
    || 'Utilisateur';
  const profileNameLabel = user?.user_metadata?.full_name || user?.user_metadata?.name
    ? 'Nom'
    : 'Nom du commerce';

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

  useEffect(() => {
    if (!isProfileOpen) return undefined;

    function handleOutsideClick(event) {
      if (!profileRef.current?.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  async function handleInstallPWA() {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        logger.debug('PWA installation accepted');
      } else {
        logger.debug('PWA installation dismissed');
      }
    } catch (error) {
      logger.error('Erreur lors de l’installation de la PWA:', error);
      showToast('Impossible de lancer l’installation. Réessayez depuis le menu de votre navigateur.', 'error');
    } finally {
      setDeferredPrompt(null);
      setIsInstallAvailable(false);
    }
  }

  function handleInstallClick() {
    if (deferredPrompt) {
      handleInstallPWA();
      return;
    }

    showToast(
      'Dans Safari, touchez Partager puis « Sur l’écran d’accueil » pour installer l’application.',
      'info',
      9000
    );
  }

  async function handleLogout() {
    setIsProfileOpen(false);
    try {
      const result = await signOut();
      if (result?.error) throw result.error;
      navigate('/login', { replace: true });
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
      showToast('La déconnexion a échoué. Veuillez réessayer.', 'error');
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
          {(isInstallAvailable || (isIOS && !isStandalone)) && (
            <button type="button" onClick={handleInstallClick} className="btn-install-pwa">
              {isAndroidDevice ? 'Installer l’application' : 'Installer l’app'}
            </button>
          )}
          {user && (
            <div className="navbar-profile" ref={profileRef}>
              <button
                type="button"
                className="navbar-profile-trigger"
                onClick={() => setIsProfileOpen((open) => !open)}
                aria-label={`Profil de ${profileName}`}
                aria-expanded={isProfileOpen}
                title="Profil"
              >
                <UserRound size={20} />
              </button>
              {isProfileOpen && (
                <div className="navbar-profile-menu">
                  <div className="navbar-profile-details">
                    <div className="navbar-profile-name">
                      <span>{profileNameLabel}</span>
                      <strong>{profileName}</strong>
                    </div>
                    <div className="navbar-profile-field">
                      <span>E-mail</span>
                      <strong>{user.email || 'Non renseigné'}</strong>
                    </div>
                    <div className="navbar-profile-field">
                      <span>Identifiant</span>
                      <strong>{user.id}</strong>
                    </div>
                  </div>
                  <button type="button" className="navbar-profile-logout" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
