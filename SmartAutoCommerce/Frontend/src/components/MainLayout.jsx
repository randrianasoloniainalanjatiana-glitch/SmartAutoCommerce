import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./side";
import Head from "./headbar";
import { useSubscription } from "./SubscriptionGuard";
import FirstLoginSubscription from "../pages/FirstLoginSubscription";
import WelcomeSubscription from "../pages/WelcomeSubscription";

const MainLayout = () => {
  const { isRestricted, subStatus } = useSubscription();
  const hasNoSubscription = subStatus?.status === 'no_subscription';
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  // Ferme le drawer mobile quand on change de route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent transition-colors duration-300">
      {/* Sidebar desktop */}
      <div className="hidden md:block shrink-0 h-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200/70 dark:border-gray-800 rounded-t-3xl overflow-hidden shadow-2xl">
            <div className="h-[85vh]">
              <Sidebar variant="mobile" />
            </div>
          </div>
        </div>
      )}

      {/* Zone de contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header en haut — z inférieur au contenu pour que les modales plein écran (Outlet) passent au-dessus */}
        <div className="p-3 pb-0 relative z-30">
          <Head onOpenSidebar={() => setMobileOpen(true)} />
        </div>

        {/* Contenu des pages enfants (via Outlet) — au-dessus du header en stacking pour overlays / modales */}
        <div className="flex-1 min-h-0 p-2 sm:p-3 overflow-y-auto relative z-40 flex flex-col">
          {isRestricted ? (
            hasNoSubscription ? <FirstLoginSubscription /> : <WelcomeSubscription />
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;