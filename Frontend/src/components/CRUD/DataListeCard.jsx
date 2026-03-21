import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DataListC = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/data/');
        if (response.data) setItems(response.data);
      } catch (error) {
        console.error("Erreur lors de la connexion à Django:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Connexion à Django en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          Liste des éléments <span className="text-cyan-600 dark:text-cyan-400">(Supabase + Django)</span>
        </h1>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
                <div className="h-48 bg-gray-200 dark:bg-gray-700">
                  {item.image_urls && item.image_urls.length > 0 ? (
                    <img src={item.image_urls[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">Pas d'image</div>
                  )}
                </div>
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{item.name}</h2>
                    <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400 text-xs px-2 py-1 rounded font-mono">
                      {item.stock_quantity > 0 ? `Stock: ${item.stock_quantity}` : "Rupture"}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                    {item.description || "Aucune description fournie."}
                  </p>
                </div>
                <div className="p-5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{item.price} €</span>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">Détails</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-inner border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">Aucune donnée trouvée</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Django est connecté, mais la liste renvoyée est vide.</p>
            <button onClick={() => window.location.reload()} className="mt-6 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold">Réessayer la synchronisation</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataListC;