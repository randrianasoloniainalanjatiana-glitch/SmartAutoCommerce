import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import AddProduct from './AddProduct';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

const DataList = () => {
  const { user } = useAuth();
  const { currentSymbol } = useSettings();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:8000/api/data/');
        if (response.data) {
          const userProducts = response.data.filter(item => item.id_utilisateur === user.id);
          setItems(userProducts);
        }
      } catch (error) {
        console.error("Erreur Django/CORS:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleProductAdded = (newProduct) => {
    const productWithUser = {
      id: newProduct.id || Date.now(),
      name: newProduct.name,
      price: newProduct.price,
      stock_quantity: newProduct.stock_quantity,
      description: newProduct.description,
      category: newProduct.category || null,
      image_urls: newProduct.image_urls || null,
      is_published: newProduct.is_published || true,
      id_utilisateur: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (productWithUser.id_utilisateur === user.id) {
      setItems((prevItems) => [productWithUser, ...prevItems]);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedItems = useMemo(() => {
    let filteredItems = [...items];
    if (searchQuery) {
      filteredItems = filteredItems.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortConfig.key !== null) {
      filteredItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filteredItems;
  }, [items, sortConfig, searchQuery]);

  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredAndSortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedItems.length / rowsPerPage);

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return "↕️";
    return sortConfig.direction === 'asc' ? "🔼" : "🔽";
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedProduct(null);
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">

        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">INVENTAIRE PRODUITS</h1>
            <AddProduct onProductAdded={handleProductAdded} />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Rechercher par nom, description ou catégorie..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Lignes :</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent font-bold outline-none cursor-pointer dark:text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b dark:border-gray-700">
                <th onClick={() => requestSort('name')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none">Produit {getSortIcon('name')}</th>
                <th onClick={() => requestSort('category')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Catégorie {getSortIcon('category')}</th>
                <th onClick={() => requestSort('price')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-right">Prix {getSortIcon('price')}</th>
                <th onClick={() => requestSort('stock_quantity')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Stock {getSortIcon('stock_quantity')}</th>
                <th onClick={() => requestSort('is_published')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Statut {getSortIcon('is_published')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {currentItems.length > 0 ? currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-cyan-50/50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer" onClick={() => handleProductClick(item)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600 mr-4 shadow-sm">
                        {item.image_urls ? (
                          <img src={item.image_urls} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[9px] text-gray-400 font-bold uppercase">Image</div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-50 italic">{item.description?.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{item.category || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">{item.price} {currentSymbol}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${item.stock_quantity < 5 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{item.stock_quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${item.is_published ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'}`}>
                      {item.is_published ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">{searchQuery ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium italic">
            Affichage {filteredAndSortedItems.length > 0 ? indexOfFirstItem + 1 : 0} à {Math.min(indexOfLastItem, filteredAndSortedItems.length)} sur {filteredAndSortedItems.length} entrées
          </p>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white transition-all">PRÉCÉDENT</button>
            <div className="flex gap-1 px-4 text-xs font-black text-gray-500 dark:text-gray-400">{currentPage} / {totalPages || 1}</div>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white transition-all">SUIVANT</button>
          </div>
        </div>
      </div>

      {/* Popup Détails Produit */}
      {showDetails && selectedProduct && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center p-4 z-50" onClick={closeDetails}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Détails du Produit</h2>
                <button 
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Image du produit */}
                <div className="flex justify-center">
                  <div className="w-48 h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    {selectedProduct.image_urls ? (
                      <img src={selectedProduct.image_urls} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Aucune image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Nom du produit</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Catégorie</label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.category || 'Non définie'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Prix</label>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{selectedProduct.price} {currentSymbol}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Stock</label>
                    <p className={`text-lg font-bold ${selectedProduct.stock_quantity < 5 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {selectedProduct.stock_quantity} unités
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Description</label>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {selectedProduct.description || 'Aucune description disponible'}
                  </p>
                </div>

                {/* Statut */}
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Statut</label>
                  <div className="mt-1">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      selectedProduct.is_published 
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'
                    }`}>
                      {selectedProduct.is_published ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500 dark:text-gray-400">Créé le</label>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(selectedProduct.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500 dark:text-gray-400">Modifié le</label>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(selectedProduct.updated_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric', 
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataList;