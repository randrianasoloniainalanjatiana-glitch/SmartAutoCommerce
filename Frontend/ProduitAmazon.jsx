import React, { useState, useEffect } from "react";

function ProduitsAmazon() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduits = async () => {
      try {
        // Ajout de l'en-tête pour bypasser la page d'avertissement ngrok
        const response = await fetch("https://motivational-mica-unfailing.ngrok-free.dev/cluster/start", {
          headers: {                  
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status} : Vérifiez que votre serveur backend est bien lancé.`);
        }

        const data = await response.json();
        console.log("Réponse API:", data); // ← ici

        setProduits(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduits();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="ml-3 mt-4 text-gray-600 font-medium">Recherche des meilleures offres Amazon...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 text-red-800 bg-red-50 rounded-xl border border-red-200 shadow-sm">
        <h2 className="text-lg font-bold mb-2">Oups ! Une erreur est survenue</h2>
        <p className="text-sm opacity-90">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm font-semibold transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête style Amazon */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Produits <span className="text-orange-500">Amazon</span>
          </h1>
          <div className="text-right">
            <span className="bg-white border border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg shadow-sm">
              {produits.length} Articles trouvés
            </span>
          </div>
        </div>

        {/* Grille de produits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produits.map((produit) => (
            <div 
              key={produit.asin} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col group"
            >
              {/* Conteneur Image */}
              <div className="relative h-56 bg-white p-4 flex items-center justify-center">
                <img 
                  src={produit.image_url} 
                  alt={produit.titre} 
                  className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Détails du produit */}
              <div className="p-4 flex flex-col flex-grow border-t border-gray-50">
                <h3 className="text-gray-800 text-sm font-semibold line-clamp-2 h-10 mb-2 group-hover:text-orange-600 transition-colors">
                  {produit.Produit}
                </h3>
                
                {/* Note et Avis */}
                <div className="flex items-center mb-3">
                  <div className="flex text-yellow-400 text-sm">
                    {"★".repeat(Math.floor(produit.Note || 0))}
                    <span className="text-gray-300">{"★".repeat(5 - Math.floor(produit.Note || 0))}</span>
                  </div>
                  <span className="text-blue-600 text-xs ml-2 hover:underline cursor-pointer">
                    {produit.avis.toLocaleString()}
                  </span>
                </div>

                {/* Prix et Action */}
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1 mb-4">
                    {produit.prix !== "Prix non affiché" ? (
                      <span className="text-2xl font-bold text-gray-900">{produit.prix}</span>
                    ) : (
                      <span className="text-sm italic text-gray-500 font-medium">Prix non disponible</span>
                    )}
                  </div>
                  
                  <a 
                    href={produit.lien} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 font-medium py-2 rounded-full shadow-sm border border-[#FCD200] transition-colors duration-200 text-sm"
                  >
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