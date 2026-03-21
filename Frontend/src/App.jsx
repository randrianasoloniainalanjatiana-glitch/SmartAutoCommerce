import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Login from "./components/CRUD/login";
import Register from "./components/CRUD/inscription";
import Home from "./pages/Home";
import About from "./pages/About";
import DataList from "./components/CRUD/DataListe";
import ProduitsAmazon from "./components/ProduitAmazon";
import ProduitsWalmart from "./components/ProduitsWalmart";
import ClientList from "./components/CRUD/Clientlist";
import CommandeList from "./components/CRUD/Commande_liste";
import Parametres from "./pages/Parametres";
import Profile from "./pages/Profile";
import Securite from "./pages/Securite";

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
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />

            {/* Routes protégées — toutes à l'intérieur du MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DataList />} />
              <Route path="produit" element={<DataList />} />
              <Route path="affiche_cluster" element={<ProduitsAmazon />} />
              <Route path="Walmart" element={<ProduitsWalmart />} />
              <Route path="client" element={<ClientList />} />
              <Route path="commande" element={<CommandeList />} />
              <Route path="parametres" element={<Parametres />} />
              <Route path="profil" element={<Profile />} />
              <Route path="securite" element={<Securite />} />
              <Route path="publication" element={<div className="p-6"><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Page Publication</h2><p className="text-gray-500 mt-2">Cette page est en cours de développement.</p></div>} />
              <Route path="conv" element={<div className="p-6"><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Page Conversations</h2><p className="text-gray-500 mt-2">Cette page est en cours de développement.</p></div>} />
              <Route path="rapports" element={<div className="p-6"><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Page Rapports</h2><p className="text-gray-500 mt-2">Cette page est en cours de développement.</p></div>} />
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