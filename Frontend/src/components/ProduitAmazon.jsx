import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../components/SubscriptionGuard";
import { Lock } from "lucide-react";

function ProduitsAmazon() {
  const { user } = useAuth();
  const { isRestricted } = useSubscription();
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduits = async () => {
      if (!user?.id || isRestricted) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("https://motivational-mica-unfailing.ngrok-free.dev/affiche_cluster", {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status} : Vérifiez que votre serveur backend est bien lancé.`);
        const data = await response.json();

        console.log("=== DEBUG PRODUITS ===");
        console.log("ID utilisateur connecté:", user.id);
        console.log("Type de ID utilisateur:", typeof user.id);
        console.log("Données brutes reçues:", data);
        console.log("Nombre total de produits reçus:", data.length);

        if (data.length > 0) {
          console.log("Structure du premier produit:", data[0]);
          console.log("ID utilisateur du premier produit:", data[0].id_utilisateur);
          console.log("Type de ID utilisateur du premier produit:", typeof data[0].id_utilisateur);
        }

        // Filtrer les produits par id_utilisateur
        const produitsFiltres = data.filter(produit => {
          const match = String(produit.id_utilisateur) === String(user.id);
          console.log(`Produit ${produit.produit || produit.asin}: id_utilisateur=${produit.id_utilisateur} (${typeof produit.id_utilisateur}) vs user.id=${user.id} (${typeof user.id}) -> ${match}`);
          return match;
        });

        console.log("Produits filtrés:", produitsFiltres);
        console.log("Nombre de produits filtrés:", produitsFiltres.length);

        setProduits(produitsFiltres);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduits();
  }, [user?.id, isRestricted]);

  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 mt-8 max-w-2xl mx-auto">
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full flex flex-col items-center">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-5 rounded-full mb-6 relative">
            <Lock className="w-12 h-12 text-orange-600 dark:text-orange-400 relative z-10" />
            <div className="absolute inset-0 bg-orange-400 opacity-20 blur-xl rounded-full"></div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Suggestions IA <span className="text-orange-500">Premium</span></h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md font-medium">
            L'accès exclusif aux suggestions de produits rentables Amazon générées par notre Intelligence Artificielle est réservé aux abonnés actifs.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('show-subscription-modal'))}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-xl shadow-[0_10px_30px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)] transition-all transform hover:-translate-y-1 w-full max-w-sm"
          >
            ACTIVÉ MON ABONNEMENT
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="ml-3 mt-4 text-gray-600 dark:text-gray-400 font-medium">Recherche des meilleures offres Amazon...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
        <h2 className="text-lg font-bold mb-2">Oups ! Une erreur est survenue</h2>
        <p className="text-sm opacity-90">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-400 rounded-md text-sm font-semibold transition-colors">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b border-gray-300 dark:border-gray-700 pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Produits <span className="text-orange-500">Amazon</span>
          </h1>
          <span className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold px-4 py-2 rounded-lg shadow-sm">
            {produits.length} Articles trouvés
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produits.map((produit) => (
            <div key={produit.asin} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col group">
              <div className="relative h-56 bg-white dark:bg-gray-700 p-4 flex items-center justify-center">
                <img src={produit.image_url} alt={produit.title} className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-4 flex flex-col flex-grow border-t border-gray-50 dark:border-gray-700">
                <h3 className="text-gray-800 dark:text-gray-200 text-sm font-semibold line-clamp-2 h-10 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {produit.produit}
                </h3>
                <div className="flex items-center mb-3">
                  <div className="flex text-yellow-400 text-sm">
                    {"★".repeat(Math.floor(produit.note || 0))}
                    <span className="text-gray-300 dark:text-gray-600">{"★".repeat(5 - Math.floor(produit.note || 0))}</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 text-xs ml-2 hover:underline cursor-pointer">{produit.avis.toLocaleString()}</span>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1 mb-4">
                    {produit.prix !== "Prix non affiché" ? (
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{produit.prix}</span>
                    ) : (
                      <span className="text-sm italic text-gray-500 dark:text-gray-400 font-medium">Prix non disponible</span>
                    )}
                  </div>
                  <a href={produit.lien} target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-medium py-2 rounded-full shadow-sm border border-[#FCD200] transition-colors duration-200 text-sm">
                    Voir sur Amazon
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProduitsAmazon;