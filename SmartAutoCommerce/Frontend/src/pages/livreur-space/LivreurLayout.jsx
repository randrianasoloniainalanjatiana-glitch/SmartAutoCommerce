import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ClipboardList, History, LogOut, Menu, X, PackageSearch } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export default function LivreurLayout() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Double garde (au cas où on tape l'URL directement)
  useEffect(() => {
    if (user && user.role !== "livreur") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const itemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive
        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-100 dark:shadow-cyan-900/30"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:block w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-5 shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <div>
            <div className="font-black text-gray-800 dark:text-white leading-tight">Espace Livreur</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user?.prenom} {user?.nom}
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          <NavLink to="/espace-livreur/commandes-disponibles" className={itemClass}>
            <PackageSearch size={18} />
            <span className="font-semibold text-sm">Commandes disponibles</span>
          </NavLink>
          <NavLink to="/espace-livreur/commandes" className={itemClass}>
            <ClipboardList size={18} />
            <span className="font-semibold text-sm">Commandes à livrer</span>
          </NavLink>
          <NavLink to="/espace-livreur/historique" className={itemClass}>
            <History size={18} />
            <span className="font-semibold text-sm">Historique</span>
          </NavLink>
        </nav>

        <div className="mt-6">
          <button
            onClick={toggleDarkMode}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? "Mode clair" : "Mode sombre"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="font-black text-gray-800 dark:text-white">Espace Livreur</div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-2">
              <NavLink to="/espace-livreur/commandes-disponibles" className={itemClass} onClick={() => setMobileOpen(false)}>
                <PackageSearch size={18} />
                <span className="font-semibold text-sm">Commandes disponibles</span>
              </NavLink>
              <NavLink to="/espace-livreur/commandes" className={itemClass} onClick={() => setMobileOpen(false)}>
                <ClipboardList size={18} />
                <span className="font-semibold text-sm">Commandes à livrer</span>
              </NavLink>
              <NavLink to="/espace-livreur/historique" className={itemClass} onClick={() => setMobileOpen(false)}>
                <History size={18} />
                <span className="font-semibold text-sm">Historique</span>
              </NavLink>
            </nav>

            <div className="mt-6">
              <button
                onClick={toggleDarkMode}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? "Mode clair" : "Mode sombre"}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-8 pb-20 md:pb-8">
        {/* Barre top mobile */}
        <div className="md:hidden mb-4 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm"
          >
            <Menu size={16} /> Menu
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">
            {user?.prenom} {user?.nom}
          </div>
        </div>

        <Outlet />
      </main>

      {/* Navigation bas mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center justify-around">
          <NavLink to="/espace-livreur/commandes-disponibles" className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${isActive ? "text-cyan-600 dark:text-cyan-400" : "text-gray-600 dark:text-gray-300"}`}>
            <PackageSearch size={18} />
            <span className="text-[11px] font-bold">Disponibles</span>
          </NavLink>
          <NavLink to="/espace-livreur/commandes" className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${isActive ? "text-cyan-600 dark:text-cyan-400" : "text-gray-600 dark:text-gray-300"}`}>
            <ClipboardList size={18} />
            <span className="text-[11px] font-bold">Commandes</span>
          </NavLink>
          <NavLink to="/espace-livreur/historique" className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${isActive ? "text-cyan-600 dark:text-cyan-400" : "text-gray-600 dark:text-gray-300"}`}>
            <History size={18} />
            <span className="text-[11px] font-bold">Historique</span>
          </NavLink>
          <button onClick={logout} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300">
            <LogOut size={18} />
            <span className="text-[11px] font-bold">Quitter</span>
          </button>
        </div>
      </div>
    </div>
  );
}

