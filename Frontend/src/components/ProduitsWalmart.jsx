import React, { useState, useEffect } from "react";

function ProduitsWalmart() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduits = async () => {
      try {
        // Adaptation vers l'URL Walmart
        const response = await fetch("https://product-scraper-ftnb.onrender.com/Walmart");
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
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-600 font-medium">Chargement des offres Walmart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-lg m-10 border border-red-200">
        <span className="font-bold">Erreur :</span> {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec style Walmart (Bleu) */}
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <h1 className="text-3xl font-extrabold text-blue-600">
            Produits <span className="text-yellow-400">Walmart</span>
          </h1>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            {produits.length} produits trouvés
          </span>
        </div>

        {/* Grille de produits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {produits.map((produit, index) => (
            <div 
              key={produit.id || index} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col"
            >
              {/* Image du produit */}
              <div className="relative h-56 bg-white p-4">
                <img 
                  src={produit.image} 
                  alt={produit.titre} 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Contenu */}
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-gray-800 font-semibold text-sm line-clamp-2 h-10 mb-2">
                  {produit.titre}
                </h3>
                
                {/* Note et Avis */}
                <div className="flex items-center mb-2">
                  <span className="text-yellow-400 text-sm">★</span>
                  <span className="text-gray-600 text-xs ml-1">
                    {produit.note || "N/A"} ({produit.avis || 0} avis)
                  </span>
                </div>

                {/* Prix */}
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 mb-3">
                    {produit.prix}
                  </p>
                  
                  <a 
                    href={produit.lien} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 text-sm"
                  >
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