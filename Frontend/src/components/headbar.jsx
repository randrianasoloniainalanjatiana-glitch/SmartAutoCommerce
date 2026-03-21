import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, ChevronDown, MessageSquare,
  UserPlus, User, Settings, LogOut, Shield, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Head = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserName = () => {
    if (!user) return "Invité";
    return user.nom + ' ' + user.prenom;
  };

  const getUserAvatar = () => {
    const userName = getUserName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;
  };

  const handleNavigate = (path) => {
    setShowProfile(false);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setShowProfile(false);
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const notifications = [
    { id: 1, title: 'Nouveau message', desc: 'Augusta vous a envoyé un message', icon: <MessageSquare size={16} />, time: '2m ago', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' },
    { id: 2, title: 'Nouvelle inscription', desc: 'Un nouveau membre a rejoint', icon: <UserPlus size={16} />, time: '1h ago', color: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' },
  ];

  return (
    <>
      <header className="h-20 bg-white dark:bg-gray-800 rounded-xl border-b border-gray-100 dark:border-gray-700 px-8 flex items-center justify-between relative">

        {/* Barre de Recherche */}
        <div className="relative w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="block w-full py-2.5 pl-10 pr-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-sm placeholder-gray-400 dark:text-white focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-800 focus:bg-white dark:focus:bg-gray-600 transition-all outline-none"
            placeholder="Rechercher..."
          />
        </div>

        <div className="flex items-center gap-4">

          {/* Bouton Mode Sombre */}
          <button
            onClick={toggleDarkMode}
            className={`relative p-2 rounded-lg transition-all ${darkMode
                ? 'bg-yellow-50 text-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Menu Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
              className={`relative p-2 rounded-lg transition-all ${showNotifs ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-4 z-50">
                <div className="px-4 pb-3 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-white">Notifications</h3>
                  <span className="text-[10px] bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">2 Nouvelles</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex gap-3 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.color}`}>{notif.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{notif.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notif.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pt-3 border-t border-gray-50 dark:border-gray-700">
                  <button className="w-full text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">Tout marquer comme lu</button>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-gray-100 dark:bg-gray-700"></div>

          {/* Menu Profil */}
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">{getUserName()}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-1 text-right">Administrateur</p>
              </div>
              <div className={`relative p-0.5 rounded-full border-2 transition-all ${showProfile ? 'border-cyan-400' : 'border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-600'}`}>
                <img
                  src={getUserAvatar()}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
            </div>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                <div className="px-4 py-2 mb-2 border-b border-gray-50 dark:border-gray-700 sm:hidden">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{getUserName()}</p>
                  <p className="text-xs text-gray-400">Administrateur</p>
                </div>
                <button
                  onClick={() => handleNavigate('/profil')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <User size={16} className="text-gray-400" /> Mon Profil
                </button>
                <button
                  onClick={() => handleNavigate('/parametres')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <Settings size={16} className="text-gray-400" /> Paramètres
                </button>
                <button
                  onClick={() => handleNavigate('/securite')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <Shield size={16} className="text-gray-400" /> Sécurité
                </button>
                <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2"></div>
                <button
                  onClick={handleLogoutClick}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 font-medium transition-colors"
                >
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleLogoutCancel}
          ></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <LogOut size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Déconnexion</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre espace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLogoutCancel}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-100 dark:shadow-none"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Head;