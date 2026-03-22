import { Outlet } from "react-router-dom";
import Sidebar from "./side";
import Head from "./headbar";
import { useSubscription } from "./SubscriptionGuard";
import FirstLoginSubscription from "../pages/FirstLoginSubscription";
import WelcomeSubscription from "../pages/WelcomeSubscription";

const MainLayout = () => {
  const { isRestricted, subStatus } = useSubscription();
  const hasNoSubscription = subStatus?.status === 'no_subscription';

  return (
    <div className="flex h-screen bg-[#F0F2F5] dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar fixe à gauche */}
      <Sidebar />

      {/* Zone de contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header en haut */}
        <div className="p-3 pb-0">
          <Head />
        </div>

        {/* Contenu des pages enfants (via Outlet) */}
        <div className="flex-1 p-3 overflow-y-auto">
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