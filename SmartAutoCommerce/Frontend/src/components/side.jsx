import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Package, Megaphone, Radar, MessageSquare,
  Users, ShoppingCart, ChevronDown, ChevronUp, CreditCard, History, Truck,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';


const Sidebar = ({
  variant = "default",
  className = "",
  collapsed = false,
  onToggleCollapsed,
}) => {
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [hovering, setHovering] = useState(false);

  const isDesktop = variant === "default";
  const isMobile = variant === "mobile";
  const isCollapsed = isDesktop && collapsed && !hovering;
  const showLabels = !isCollapsed && !isMobile;

  const menuItems = [
    { name: 'Tableau de bord', icon: <LayoutGrid size={20} />, path: '/' },
    { name: 'Produit', icon: <Package size={20} />, path: '/produit' },
    { name: 'Publication', icon: <Megaphone size={20} />, path: '/publication' },
    {
      name: 'SmartMarketWatch',
      icon: <Radar size={20} />,
      subItems: [
        { name: 'Catalogue', path: '/catalogue' },
        { name: 'Comparateur', path: '/comparateur' },
        { name: 'Veille', path: '/veille' },
        { name: 'Veille Facebook', path: '/veille-facebook' },
        { name: 'Sourcing', path: '/sourcing' },
        
      ]
    },
    { name: 'Affiche client', icon: <Users size={20} />, path: '/client' },
    { name: 'Conversation', icon: <MessageSquare size={20} />, path: '/conv' },
    { name: 'Commande', icon: <ShoppingCart size={20} />, path: '/commande' },
    { name: 'Livreur', icon: <Truck size={20} />, path: '/livreur' },
    { name: 'Abonnement', icon: <CreditCard size={20} />, path: '/abonnement' },
    { name: 'Historique des paiements', icon: <History size={20} />, path: '/historique-paiements' },
  ];

  const toggleSubMenu = (name) => {
    setOpenSubMenu(openSubMenu === name ? null : name);
  };

  useEffect(() => {
    // Quand on replie, on ferme les sous-menus pour éviter un état “ouvert” invisible.
    if (isCollapsed) setOpenSubMenu(null);
  }, [isCollapsed]);

  const widthClass = useMemo(() => {
    if (isMobile) return "w-full";
    return isCollapsed ? "w-20" : "w-64";
  }, [isCollapsed, isMobile]);

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`${widthClass} ${
        isMobile
          ? "py-6 px-4 border-r-0"
          : "py-6 px-3 border-r border-gray-100 dark:border-gray-700 shadow-sm"
      } bg-white/90 dark:bg-gray-800/85 backdrop-blur-md h-full flex flex-col overflow-y-auto shrink-0 transition-all duration-300 ease-out ${className}`}
    >

      {/* Logo Section */}
      <div className={`relative flex items-center px-2 mb-8 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? "justify-center mx-auto" : ""}`}>
          <div
            className={`w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center transition-all duration-300 ${
              isCollapsed ? "scale-110 shadow-md shadow-cyan-300/50" : "scale-100"
            }`}
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          {showLabels && (
            <span className="font-bold text-xl text-gray-800 dark:text-white transition-all duration-300 opacity-100 translate-x-0">
              SA-Commerce
            </span>
          )}
        </div>

        {isDesktop && !isCollapsed && typeof onToggleCollapsed === "function" && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden md:inline-flex items-center justify-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            aria-label={collapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
            title={collapsed ? "Agrandir" : "Réduire"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 pr-1">
        {menuItems.map((item) => (

          <div key={item.name}>
            {item.subItems ? (
              <>
                <button
                  onClick={() => toggleSubMenu(item.name)}
                  title={isCollapsed ? item.name : undefined}
                  className={`w-full flex items-center justify-between gap-4 py-3 rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
                    isCollapsed ? "px-3 justify-center text-gray-600 dark:text-gray-300 scale-95" : "px-4 text-gray-600 dark:text-gray-300 scale-100"
                  } hover:bg-cyan-50/70 dark:hover:bg-gray-700/80`}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : ""} gap-4`}>
                    {item.icon}
                    {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                  </div>
                  {!isCollapsed && (openSubMenu === item.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </button>

                {!isCollapsed && openSubMenu === item.name && (
                  <div className="ml-10 mt-1 space-y-1">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.name}
                        to={sub.path}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm rounded-lg transition-colors ${isActive ? 'text-cyan-500 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`
                        }
                      >
                        {sub.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-4 py-3 rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${isCollapsed ? "px-3 justify-center scale-95" : "px-4 scale-100"} ${isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white shadow-lg shadow-cyan-100 dark:shadow-cyan-900/30'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-cyan-50/70 dark:hover:bg-gray-700/80 hover:text-gray-700 dark:hover:text-gray-200'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                {item.icon}
                {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;