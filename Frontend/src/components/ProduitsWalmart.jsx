import React, { useState, useEffect } from "react";
import { useSubscription } from "../components/SubscriptionGuard";
import { Lock } from "lucide-react";

function ProduitsWalmart() {
  const { isRestricted } = useSubscription();
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduits = async () => {
      if (isRestricted) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("https://legendary-francene-unegregiously.ngrok-free.dev/walmart", {
          headers: { "ngrok-skip-browser-warning": "69420" }
        });
        if (!response.ok) throw new Error("Erreur lors de la récupération des données");
        const data = await response.json();
        setProduits(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduits();
  }, [isRestricted]);

  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 mt-8 max-w-2xl mx-auto">
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full flex flex-col items-center">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-5 rounded-full mb-6 relative">
            <Lock className="w-12 h-12 text-blue-600 dark:text-blue-400 relative z-10" />
            <div className="absolute inset-0 bg-blue-400 opacity-20 blur-xl rounded-full"></div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Suggestions IA <span className="text-blue-500">Premium</span></h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md font-medium">
            L'accès exclusif aux suggestions de produits rentables Walmart générées par notre Intelligence Artificielle est réservé aux abonnés actifs.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('show-subscription-modal'))}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1 w-full max-w-sm"
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 mt-4 text-gray-600 dark:text-gray-400 font-medium">Chargement des offres Walmart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
        <h2 className="text-lg font-bold mb-2">Erreur</h2>
        <p className="text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-400 rounded-md text-sm font-semibold transition-colors">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b border-gray-300 dark:border-gray-700 pb-4">
          <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            Produits <span className="text-yellow-400">Walmart</span>
          </h1>
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded">
            {produits.length} produits trouvés
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {produits.map((produit, index) => (
            <div key={produit.id || index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col group">
              <div className="relative h-56 bg-white dark:bg-gray-700 p-4">
                <img src={produit.image_url} alt={produit.Produit} className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-4 flex flex-col flex-grow border-t border-gray-50 dark:border-gray-700">
                <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-sm line-clamp-2 h-10 mb-2">{produit.Produit}</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400 text-sm">
                    {"★".repeat(Math.floor(produit.Note || 0))}
                    <span className="text-gray-300 dark:text-gray-600">{"★".repeat(5 - Math.floor(produit.Note || 0))}{produit.avis || 0} avis</span>
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{produit.prix}</p>
                  <a href={produit.lien} target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 text-sm">
                    Voir sur Walmart
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

export default ProduitsWalmart;