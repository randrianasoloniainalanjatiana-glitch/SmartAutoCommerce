import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedLivreurRoute from "./components/ProtectedLivreurRoute";
import MainLayout from "./components/MainLayout";
import Login from "./components/CRUD/login";
import Register from "./components/CRUD/inscription";
import VerifyCode from "./components/CRUD/VerifyCode";
import ForgotPassword from "./components/CRUD/ForgotPassword";
import ResetPassword from "./components/CRUD/ResetPassword";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import DataList from "./components/CRUD/DataListe";
import Catalogue from "./pages/Catalogue";
import Comparateur from "./pages/Comparateur";
import Veille from "./pages/Veille";
import Sourcing from "./pages/Sourcing";
import VeilleFacebookPage from "./pages/VeilleFacebookPage";
import ProduitsWalmart from "./components/ProduitsWalmart";
import ClientList from "./components/CRUD/Clientlist";
import CommandeList from "./components/CRUD/Commande_liste";
import Parametres from "./pages/Parametres";
import ConfigurationApiFacebookHelp from "./pages/ConfigurationApiFacebookHelp";
import Profile from "./pages/Profile";
import Securite from "./pages/Securite";
import Conversation from "./pages/Conversation";
import Publication from "./pages/Publication";
import Livreur from "./pages/Livreur";
import LivreurLogin from "./pages/LivreurLogin";
import SubscriptionGuard from "./components/SubscriptionGuard";
import Subscription from "./pages/Subscription";
import WelcomeSubscription from "./pages/WelcomeSubscription";
import TransactionHistory from "./pages/TransactionHistory";
import LivreurLayout from "./pages/livreur-space/LivreurLayout";
import CommandesALivrer from "./pages/livreur-space/CommandesALivrer";
import HistoriqueCommandes from "./pages/livreur-space/HistoriqueCommandes";
import CommandeDetail from "./pages/livreur-space/CommandeDetail";
import CommandesDisponibles from "./pages/livreur-space/CommandesDisponibles";
import CommandeDisponibleDetail from "./pages/livreur-space/CommandeDisponibleDetail";

// Composant qui redirige les utilisateurs connectés loin de /login
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Si un livreur est connecté, l'envoyer vers son espace
    try {
      const stored = localStorage.getItem("user");
      const u = stored ? JSON.parse(stored) : null;
      if (u?.role === "livreur") return <Navigate to="/espace-livreur/commandes" replace />;
    } catch {
      // ignore
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            {/* Routes publiques — redirige vers / si déjà connecté */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/login-livreur" element={
              <PublicRoute>
                <LivreurLogin />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/verify-code" element={
              <PublicRoute>
                <VerifyCode />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            } />

            {/* Espace Livreur */}
            <Route
              path="/espace-livreur"
              element={
                <ProtectedLivreurRoute>
                  <LivreurLayout />
                </ProtectedLivreurRoute>
              }
            >
              <Route index element={<Navigate to="commandes" replace />} />
              <Route path="commandes" element={<CommandesALivrer />} />
              <Route path="commandes/:commandeId" element={<CommandeDetail />} />
              <Route path="commandes-disponibles" element={<CommandesDisponibles />} />
              <Route path="commandes-disponibles/:commandeId" element={<CommandeDisponibleDetail />} />
              <Route path="historique" element={<HistoriqueCommandes />} />
            </Route>

            {/* Route de bienvenue en plein écran sans Sidebar ni Header pour les nouveaux ou expirés */}
            <Route path="/bienvenue" element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <WelcomeSubscription />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />

            <Route
              path="/aide/configuration-api-facebook"
              element={
                <ProtectedRoute>
                  <ConfigurationApiFacebookHelp />
                </ProtectedRoute>
              }
            />

            {/* Routes protégées — toutes à l'intérieur du MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <MainLayout />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="produit" element={<DataList />} />
              <Route path="catalogue" element={<Catalogue />} />
              <Route path="comparateur" element={<Comparateur />} />
              <Route path="veille" element={<Veille />} />
              <Route path="sourcing" element={<Sourcing />} />
              <Route path="veille-facebook" element={<VeilleFacebookPage />} />
              <Route path="Walmart" element={<ProduitsWalmart />} />
              <Route path="client" element={<ClientList />} />
              <Route path="commande" element={<CommandeList />} />
              <Route path="livreur" element={<Livreur />} />
              <Route path="parametres" element={<Parametres />} />
              <Route path="profil" element={<Profile />} />
              <Route path="securite" element={<Securite />} />
              <Route path="publication" element={<Publication />} />
              <Route path="conv" element={<Conversation />} />
              <Route path="abonnement" element={<Subscription />} />
              <Route path="historique-paiements" element={<TransactionHistory />} />
            </Route>

            {/* Redirection par défaut */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;