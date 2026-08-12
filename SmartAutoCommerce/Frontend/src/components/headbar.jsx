import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { DJANGO_API } from '../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, ChevronDown, MessageSquare, Menu,
  User, Settings, LogOut, Shield, Sun, Moon, CreditCard, ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from './SubscriptionGuard';
import { useSettings } from '../contexts/SettingsContext';
import { getOrderReference } from '../utils/orderUtils';

const Head = ({ onOpenSidebar } = {}) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { subStatus } = useSubscription();
  const { parametres } = useSettings();
  const navigate = useNavigate();

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const notifWrapRef = useRef(null);
  const notifBtnRef = useRef(null);
  const notifMenuRef = useRef(null);
  const profileWrapRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [notifMenuRect, setNotifMenuRect] = useState(null);
  const [profileMenuRect, setProfileMenuRect] = useState(null);

  const MENU_Z = 200;
  const NOTIF_MENU_W = 320;
  const PROFILE_MENU_W = 224;

  const updateNotifMenuPosition = useCallback(() => {
    const el = notifBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(NOTIF_MENU_W, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    setNotifMenuRect({ top: r.bottom + 12, left, width: w });
  }, []);

  const updateProfileMenuPosition = useCallback(() => {
    const el = profileTriggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(PROFILE_MENU_W, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    setProfileMenuRect({ top: r.bottom + 12, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!showNotifs) {
      setNotifMenuRect(null);
      return;
    }
    updateNotifMenuPosition();
    const onResize = () => updateNotifMenuPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [showNotifs, updateNotifMenuPosition]);

  useLayoutEffect(() => {
    if (!showProfile) {
      setProfileMenuRect(null);
      return;
    }
    updateProfileMenuPosition();
    const onResize = () => updateProfileMenuPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [showProfile, updateProfileMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      const inNotif =
        (notifWrapRef.current && notifWrapRef.current.contains(t)) ||
        (notifMenuRef.current && notifMenuRef.current.contains(t));
      const inProfile =
        (profileWrapRef.current && profileWrapRef.current.contains(t)) ||
        (profileMenuRef.current && profileMenuRef.current.contains(t));
      if (!inNotif) setShowNotifs(false);
      if (!inProfile) setShowProfile(false);
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

  const parseNotifPayload = (notif) => {
    const raw = notif?.message;
    if (!raw) {
      return { title: 'Notification', desc: '', target: null, permalink_url: null, historique_id: null };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        title: parsed?.title || 'Notification',
        desc: parsed?.desc || '',
        target: parsed?.target || null,
        permalink_url: parsed?.permalink_url || null,
        historique_id: parsed?.historique_id || parsed?.historiqueId || parsed?.comparaison_id || null,
      };
    } catch {
      return { title: 'Notification', desc: String(raw), target: null, permalink_url: null, historique_id: null };
    }
  };

  const isPriceDifferenceNotification = (notif, payload) => (
    payload?.target === 'veille_facebook_difference'
    || payload?.target === 'veille_facebook'
    || notif?.type === 'price_difference_alert'
    || notif?.type === 'alerte_prix'
    || notif?.type === 'alerte_difference_prix'
  );

  const notifColorByType = (type) => {
    if (type === 'publication_comment') return 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400';
    if (type === 'conversation_message') return 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400';
    if (type === 'new_order') return 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400';
    if (type === 'price_difference_alert' || type === 'alerte_prix' || type === 'alerte_difference_prix') {
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400';
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  };

  const notifIconByType = (type) => {
    if (type === 'price_difference_alert' || type === 'alerte_prix' || type === 'alerte_difference_prix') {
      return <ArrowLeftRight size={16} />;
    }
    return <MessageSquare size={16} />;
  };

  const fetchNotifications = async () => {
    if (!user?.id) return [];
    const res = await axios.get(`${DJANGO_API}/notifications/?only_unread=true&user_id=${user.id}`);
    setNotifications(res.data || []);
    return res.data || [];
  };

  const ensureNotification = async ({ type, payload }) => {
    const current = await fetchNotifications();
    const payloadText = JSON.stringify(payload);
    const exists = current.some((n) => n.type === type && n.message === payloadText && !n.is_read);
    if (exists) return;
    await axios.post(`${DJANGO_API}/notifications/`, {
      user_id: user.id,
      type,
      message: payloadText,
    });
  };

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const key = `notif_state_${user.id}`;
    const pollNotifications = async () => {
      try {
        const raw = localStorage.getItem(key);
        const initialState = raw ? JSON.parse(raw) : {
          lastSeenCommentsByPost: {},
          lastSeenMessageAt: null,
          lastSeenOrderAt: null,
          lastSeenHistoriqueId: null,
        };
        const [pubRes, convRes, orderRes, histRes] = await Promise.all([
          axios.get(`${DJANGO_API}/publications/${user.id}/dashboard/`),
          axios.get(`${DJANGO_API}/conversations/${user.id}/`),
          axios.get(`${DJANGO_API}/commandes/`),
          axios.get(`${DJANGO_API}/veille-facebook/historique/comparaisons/`, {
            params: { user_id: user.id },
          }),
        ]);

        const nextState = { ...initialState, lastSeenCommentsByPost: { ...(initialState.lastSeenCommentsByPost || {}) } };
        const posts = pubRes?.data?.posts || [];

        for (const post of posts) {
          const postId = String(post.id || '');
          if (!postId) continue;
          const currentComments = Number(post.comments_count || 0);
          const previousComments = Number(initialState.lastSeenCommentsByPost?.[postId] ?? currentComments);

          if (currentComments > previousComments) {
            await ensureNotification({
              type: 'publication_comment',
              payload: {
                title: 'Nouveau commentaire',
                desc: `+${currentComments - previousComments} commentaire(s) sur une publication`,
                target: 'publication',
                permalink_url: post?.permalink_url || null,
              }
            });
          }
          nextState.lastSeenCommentsByPost[postId] = currentComments;
        }

        const conversations = convRes?.data || [];
        const messengerId = String(parametres?.messenger_id || '');
        if (messengerId) {
          const incoming = conversations.filter((c) => String(c?.id_sender) !== messengerId);
          incoming.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
          const latestIncoming = incoming[0];
          const latestIncomingAt = latestIncoming?.created_at || null;
          const previousSeenMsg = initialState.lastSeenMessageAt ? new Date(initialState.lastSeenMessageAt).getTime() : 0;
          const latestMsgTs = latestIncomingAt ? new Date(latestIncomingAt).getTime() : 0;

          if (latestMsgTs > previousSeenMsg) {
            await ensureNotification({
              type: 'conversation_message',
              payload: {
                title: 'Nouveau message',
                desc: `Nouveau message de ${latestIncoming?.id_sender || 'client'}`,
                target: 'conversation',
              }
            });
            nextState.lastSeenMessageAt = latestIncomingAt;
          }
        }

        const orders = (orderRes?.data || []).filter((o) => String(o?.id_utilisateur) === String(user.id));
        orders.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
        const latestOrder = orders[0];
        const latestOrderAt = latestOrder?.created_at || null;
        const latestOrderTs = latestOrderAt ? new Date(latestOrderAt).getTime() : 0;
        const previousOrderTs = initialState.lastSeenOrderAt ? new Date(initialState.lastSeenOrderAt).getTime() : 0;
        if (latestOrderTs > previousOrderTs) {
          await ensureNotification({
            type: 'new_order',
            payload: {
              title: 'Nouvelle commande',
              desc: `Commande ${getOrderReference(latestOrder)} reçue`,
              target: 'commande',
            }
          });
          nextState.lastSeenOrderAt = latestOrderAt;
        }

        const historique = Array.isArray(histRes?.data) ? histRes.data : [];
        historique.sort(
          (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
        );
        const latestHist = historique[0];
        const latestHistId = latestHist?.id != null ? String(latestHist.id) : null;
        const previousHistId = initialState.lastSeenHistoriqueId
          ? String(initialState.lastSeenHistoriqueId)
          : null;

        if (latestHistId && previousHistId && latestHistId !== previousHistId) {
          const nomUtil = latestHist?.produit_utilisateur?.name || 'Votre produit';
          const nomConc = latestHist?.produit_concurrent?.produit_nom || 'concurrent';
          await ensureNotification({
            type: 'price_difference_alert',
            payload: {
              title: 'Alerte différence de prix',
              desc: `${nomUtil} vs ${nomConc}`,
              target: 'veille_facebook_difference',
              historique_id: latestHistId,
            },
          });
        }
        if (latestHistId) {
          nextState.lastSeenHistoriqueId = latestHistId;
        }

        localStorage.setItem(key, JSON.stringify(nextState));
        await fetchNotifications();
      } catch (e) {
        console.error('Erreur notifications:', e);
      }
    };

    pollNotifications();
    const timer = setInterval(pollNotifications, 8000);
    return () => clearInterval(timer);
  }, [user?.id, parametres?.messenger_id]);

  const handleNotificationClick = async (notif) => {
    const payload = parseNotifPayload(notif);
    try {
      await axios.put(`${DJANGO_API}/notifications/${notif.id}/read/`, {
        user_id: user.id,
      });
    } catch (e) {
      console.error('Erreur marquage notification lue:', e);
    }

    setShowNotifs(false);

    if (payload.target === 'conversation') {
      navigate('/conv');
    } else if (payload.target === 'commande') {
      navigate('/commande');
    } else if (payload.target === 'publication') {
      navigate('/publication');
      if (payload.permalink_url) {
        window.open(payload.permalink_url, '_blank');
      }
    } else if (isPriceDifferenceNotification(notif, payload)) {
      const historiqueId = payload.historique_id;
      if (historiqueId) {
        navigate(`/veille-facebook?tab=differences&historique=${encodeURIComponent(historiqueId)}`);
      } else {
        navigate('/veille-facebook?tab=differences');
      }
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
  };

  return (
    <>
      <header className="h-20 bg-white/90 dark:bg-gray-800/85 backdrop-blur-md rounded-2xl border border-white/70 dark:border-gray-700/80 px-3 sm:px-5 md:px-8 flex items-center justify-between relative z-50 shadow-lg shadow-slate-200/40 dark:shadow-black/20">

        {/* Statut Abonnement à la place de la recherche */}
        <div className="flex items-center">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="mr-3 inline-flex md:hidden items-center justify-center p-2 rounded-xl bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition-all hover:scale-105"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
          )}
          {subStatus ? (
            <div className="flex items-center gap-3 bg-white/70 dark:bg-gray-700/50 py-1.5 px-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="hidden sm:block">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Plan Actuel</p>
                <p className="text-sm font-bold text-gray-800 dark:text-white capitalize leading-none">{subStatus.type_plan?.replace('_', ' ') || 'Aucun'}</p>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${subStatus.statut === 'actif' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                {subStatus.statut || 'Inactif'}
              </span>
            </div>
          ) : (
            <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
          )}
        </div>

        <div className="flex items-center gap-4">

          {/* Bouton Mode Sombre */}
          <button
            onClick={toggleDarkMode}
            className={`relative p-2 rounded-xl transition-all duration-300 hover:scale-105 ${darkMode
              ? 'bg-yellow-50 text-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Menu Notifications */}
          <div className="relative" ref={notifWrapRef}>
            <button
              type="button"
              ref={notifBtnRef}
              onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
              className={`relative p-2 rounded-xl transition-all duration-300 hover:scale-105 ${showNotifs ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
          </div>

          <div className="h-8 w-[1px] bg-gray-100 dark:bg-gray-700"></div>

          {/* Menu Profil */}
          <div className="relative" ref={profileWrapRef}>
            <div
              ref={profileTriggerRef}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowProfile((v) => !v);
                  setShowNotifs(false);
                }
              }}
              onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">{getUserName()}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-1 text-right">Administrateur</p>
              </div>
              <div className={`relative p-0.5 rounded-full border-2 transition-all ${showProfile ? 'border-cyan-400 shadow-md shadow-cyan-200/50 dark:shadow-cyan-900/40' : 'border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-600'}`}>
                <img
                  src={getUserAvatar()}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
            </div>
          </div>

        </div>
      </header>

      {showNotifs && notifMenuRect && typeof document !== 'undefined' && createPortal(
        <div
          ref={notifMenuRef}
          className="fixed bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-4"
          style={{
            top: notifMenuRect.top,
            left: notifMenuRect.left,
            width: notifMenuRect.width,
            zIndex: MENU_Z,
          }}
        >
          <div className="px-4 pb-3 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-white">Notifications</h3>
            <span className="text-[10px] bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">{notifications.length} Nouvelle(s)</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                Aucune nouvelle notification.
              </div>
            )}
            {notifications.map((notif) => {
              const payload = parseNotifPayload(notif);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex gap-3 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notifColorByType(notif.type)}`}>
                    {notifIconByType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{payload.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{payload.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 pt-3 border-t border-gray-50 dark:border-gray-700">
            <button
              type="button"
              className="w-full text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
              onClick={async () => {
                for (const notif of notifications) {
                  try {
                    await axios.put(`${DJANGO_API}/notifications/${notif.id}/read/`, {
                      user_id: user.id,
                    });
                  } catch {
                    // ignore
                  }
                }
                setNotifications([]);
              }}
            >
              Tout marquer comme lu
            </button>
          </div>
        </div>,
        document.body
      )}

      {showProfile && profileMenuRect && typeof document !== 'undefined' && createPortal(
        <div
          ref={profileMenuRef}
          className="fixed bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2"
          style={{
            top: profileMenuRect.top,
            left: profileMenuRect.left,
            width: profileMenuRect.width,
            zIndex: MENU_Z,
          }}
        >
          <div className="px-4 py-2 mb-2 border-b border-gray-50 dark:border-gray-700 sm:hidden">
            <p className="text-sm font-bold text-gray-800 dark:text-white">{getUserName()}</p>
            <p className="text-xs text-gray-400">Administrateur</p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate('/profil')}
            className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
          >
            <User size={16} className="text-gray-400" /> Mon Profil
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/abonnement')}
            className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
          >
            <CreditCard size={16} className="text-gray-400" /> Mon Abonnement
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/parametres')}
            className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
          >
            <Settings size={16} className="text-gray-400" /> Paramètres
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/securite')}
            className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
          >
            <Shield size={16} className="text-gray-400" /> Sécurité
          </button>
          <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2"></div>
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 font-medium transition-colors"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>,
        document.body
      )}

      {/* Modal de confirmation de déconnexion (portail : au-dessus de tout le contenu / modales page) */}
      {showLogoutConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleLogoutCancel}
            aria-hidden
          />
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
                type="button"
                onClick={handleLogoutCancel}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-100 dark:shadow-none"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Head;