import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';

const Head = () => {
  return (
    <header className="h-20 bg-white rounded-xl border-b border-gray-100 px-8 flex items-center justify-between">
      
      {/* Barre de Recherche (Gauche) */}
      <div className="relative w-96">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          className="block w-full py-2.5 pl-10 pr-3 bg-gray-50 border-none rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-cyan-100 focus:bg-white transition-all outline-none"
          placeholder="Search..."
        />
      </div>

      {/* Actions et Profil (Droite) */}
      <div className="flex items-center gap-6">
        
        {/* Notification */}
        <button className="relative p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell size={20} />
          {/* Badge rouge de notification */}
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
        </button>

        {/* Séparateur vertical */}
        <div className="h-8 w-[1px] bg-gray-100"></div>

        {/* Profil Utilisateur */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800 leading-none">Augusta Ryan</p>
            <p className="text-[11px] text-gray-400 font-medium mt-1">Director</p>
          </div>
          
          <div className="relative">
            <img
              src="https://ui-avatars.com/api/?name=Augusta+Ryan&background=0D8ABC&color=fff"
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-cyan-400 transition-all"
            />
          </div>
          
          <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>
    </header>
  );
};

export default Head;