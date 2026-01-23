import React, { useState } from 'react';
import Head from './headbar';
import { NavLink } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import ProduitsAmazon from './ProduitAmazon';
import ProduitsWalmart from './ProduitsWalmart';
import DataList from './CRUD/DataListe';
import ClientList from './CRUD/Clientlist';
import { 
  LayoutGrid, Calendar, FileText, MessageSquare, 
  Users, Settings, Puzzle, Map, LogOut, ChevronDown, ChevronUp 
} from 'lucide-react';



const Sidebar = () => {
  // État pour savoir quel menu parent est ouvert
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const menuItems = [

    { name: 'Tableau de bord', icon: <LayoutGrid size={20} />, path: '/' },
    { name: 'Produit', icon: <Calendar size={20} />, path: '/produit' },
    { name: 'Publication', icon: <FileText size={20} />, path: '/publication' },
    { 
      name: 'Suggestion de produit', 
      icon: <FileText size={20} />, 
      subItems: [ // Correction du nom : subItems
        { name: 'Produit Amazon', path: '/Amazon' },
        { name: 'Produit Walmart', path: '/Walmart' }
      ]
    },
    { name: 'Affiche client', icon: <MessageSquare size={20} />, path: '/client' },
    { name: 'Conversations', icon: <Users size={20} />, path: '/conv' },
    { name: 'Ventes', icon: <Puzzle size={20} />, path: '/ventes' },
    { name: 'Rapports', icon: <Map size={20} />, path: '/rapports' },
    { name: 'Paramètre', icon: <Settings size={20} />, path: '/settings' },
  ];

  const toggleSubMenu = (name) => {
    setOpenSubMenu(openSubMenu === name ? null : name);
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5]">
      <aside className="w-64 bg-white flex flex-col py-8 px-4 border-r border-gray-100 overflow-y-auto">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-4 mb-12">
          <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="font-bold text-xl text-gray-800">Boardto</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            
            <div key={item.name}>
              {item.subItems ? (
                // SI LE MENU A DES SOUS-ITEMS (Bouton pour déplier)
                <>
                  <button
                    onClick={() => toggleSubMenu(item.name)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {item.icon}
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    {openSubMenu === item.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {/* Affichage des sous-menus si ouvert */}
                  {openSubMenu === item.name && (
                    <div className="ml-10 mt-1 space-y-1">
                      {item.subItems.map((sub) => (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          className={({ isActive }) => 
                            `block px-4 py-2 text-sm rounded-lg transition-colors ${
                              isActive ? 'text-cyan-500 font-bold' : 'text-gray-400 hover:text-gray-600'
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
                // SI LE MENU EST SIMPLE (Lien direct)
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                      ? 'bg-cyan-400 text-white shadow-lg shadow-cyan-100' 
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
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

        {/* Logout */}
        <div className="pt-8 border-t border-gray-100">
          <button className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 overflow-y-auto">
        <Head />
        
        <Routes>
        <Route path='/Walmart' element={<ProduitsWalmart/>}/>
        <Route path='/Amazon' element={<ProduitsAmazon/>}/>
        <Route path='/produit' element={<DataList/>}/>
        <Route path='/client' element={<ClientList/>}/>

       
       </Routes>
        {/* Note : Assurez-vous d'avoir vos <Routes> ici ou dans App.js */}
      </main>
    </div>
  );
};

export default Sidebar;