import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
// 1. IMPORT DU COMPOSANT D'INSERTION
import AddProduct from './AddProduct'; 

const DataList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // CORRECTION : On initialise la clé à null pour respecter le tri de la base de données au chargement
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/data/');
        if (response.data) setItems(response.data);
      } catch (error) {
        console.error("Erreur Django/CORS:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. FONCTION POUR AJOUTER LE NOUVEAU PRODUIT À LA LISTE SANS RECHARGER
  const handleProductAdded = (newProduct) => {
    // On l'ajoute au début pour qu'il apparaisse immédiatement en haut
    setItems((prevItems) => [newProduct, ...prevItems]);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    // La logique de tri ne s'exécute que si l'utilisateur clique sur une colonne (key !== null)
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / rowsPerPage);

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return "↕️";
    return sortConfig.direction === 'asc' ? "🔼" : "🔽";
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
        
        <div className="px-6 py-5 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">INVENTAIRE PRODUITS</h1>
            
            {/* 3. APPEL DU COMPOSANT D'INSERTION */}
            <AddProduct onProductAdded={handleProductAdded} />
          </div>

          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <span className="text-gray-500 font-medium">Lignes par page :</span>
            <select  
              value={rowsPerPage} 
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent font-bold outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b">
                <th onClick={() => requestSort('name')} className="px-6 py-4 cursor-pointer hover:text-blue-600 select-none">
                  Produit {getSortIcon('name')}
                </th>
                <th onClick={() => requestSort('category')} className="px-6 py-4 cursor-pointer hover:text-blue-600 select-none text-center">
                  Catégorie {getSortIcon('category')}
                </th>
                <th onClick={() => requestSort('price')} className="px-6 py-4 cursor-pointer hover:text-blue-600 select-none text-right">
                  Prix {getSortIcon('price')}
                </th>
                <th onClick={() => requestSort('stock_quantity')} className="px-6 py-4 cursor-pointer hover:text-blue-600 select-none text-center">
                  Stock {getSortIcon('stock_quantity')}
                </th>
                <th className="px-6 py-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 mr-4 shadow-sm">
                        {item.image_urls?.[0] ? (
                          <img src={item.image_urls[0]} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[9px] text-gray-400 font-bold uppercase">Image</div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{item.name}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[200px] italic">{item.description?.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-medium text-gray-500">{item.category || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{item.price} €</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${item.stock_quantity < 5 ? 'text-red-500' : 'text-gray-700'}`}>
                      {item.stock_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${item.is_published ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                      {item.is_published ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium italic">
            Affichage {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, items.length)} sur {items.length} entrées
          </p>
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-100 transition-all"
            >
              PRÉCÉDENT
            </button>
            <div className="flex gap-1 px-4 text-xs font-black text-gray-500">
              {currentPage} / {totalPages}
            </div>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-100 transition-all"
            >
              SUIVANT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataList;