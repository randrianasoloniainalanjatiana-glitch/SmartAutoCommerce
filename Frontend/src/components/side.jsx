import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Calendar, FileText, MessageSquare,
  Users, Puzzle, Map, ChevronDown, ChevronUp, CreditCard, History
} from 'lucide-react';


const Sidebar = () => {
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const menuItems = [
    { name: 'Tableau de bord', icon: <LayoutGrid size={20} />, path: '/' },
    { name: 'Produit', icon: <Calendar size={20} />, path: '/produit' },
    { name: 'Publication', icon: <FileText size={20} />, path: '/publication' },
    {
      name: 'Suggestion de produit',
      icon: <FileText size={20} />,
      subItems: [
        { name: 'Produit Amazon', path: '/affiche_cluster' },
        { name: 'Produit Walmart', path: '/Walmart' }
      ]
    },
    { name: 'Affiche client', icon: <MessageSquare size={20} />, path: '/client' },
    { name: 'Conversations', icon: <Users size={20} />, path: '/conv' },
    { name: 'Commande', icon: <Puzzle size={20} />, path: '/commande' },
    { name: 'Rapports', icon: <Map size={20} />, path: '/rapports' },
    { name: 'Abonnement', icon: <CreditCard size={20} />, path: '/abonnement' },
    { name: 'Historique des paiements', icon: <History size={20} />, path: '/historique-paiements' },
  ];

  const toggleSubMenu = (name) => {
    setOpenSubMenu(openSubMenu === name ? null : name);
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 flex flex-col py-8 px-4 border-r border-gray-100 dark:border-gray-700 overflow-y-auto shrink-0 transition-colors duration-200">

      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 mb-12">
        <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full"></div>
        </div>
        <span className="font-bold text-xl text-gray-800 dark:text-white">Boardto</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (

          <div key={item.name}>
            {item.subItems ? (
              <>
                <button
                  onClick={() => toggleSubMenu(item.name)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {item.icon}
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  {openSubMenu === item.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {openSubMenu === item.name && (
                  <div className="ml-10 mt-1 space-y-1">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.name}
                        to={sub.path}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm rounded-lg transition-colors ${isActive ? 'text-cyan-500 font-bold' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
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
                  `flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'bg-cyan-400 text-white shadow-lg shadow-cyan-100 dark:shadow-cyan-900/30'
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                  }`
                }
              >
                {item.icon}
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;