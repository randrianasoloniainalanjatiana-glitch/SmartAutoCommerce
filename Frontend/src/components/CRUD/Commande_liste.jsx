import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';

const CommandeList = () => {
  const { currentSymbol } = useSettings();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [commandeDetails, setCommandeDetails] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:8000/api/commandes/');
        if (response.data) {
          const userOrders = response.data.filter(item => item.id_utilisateur === user.id);
          setItems(userOrders);
        }
      } catch (error) {
        console.error("Erreur Django/Supabase:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedItems = useMemo(() => {
    let filteredItems = [...items];
    if (searchQuery) {
      filteredItems = filteredItems.filter(item =>
        item.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.adresse?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.telephone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.id)?.includes(searchQuery) ||
        item.statut_paiement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.statut_livraison?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleCommandeClick = async (commande) => {
    setSelectedCommande(commande);
    setShowDetails(true);
    
    // Récupérer les détails de la commande
    try {
      const response = await axios.get(`http://localhost:8000/api/commandes/${commande.id}/`);
      if (response.data) {
        setCommandeDetails(response.data);
      }
    } catch (error) {
      console.error("Erreur récupération détails commande:", error);
      setCommandeDetails([]);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedCommande(null);
    setCommandeDetails([]);
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">

        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">SUIVI DES COMMANDES</h1>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Rechercher par client, adresse, ID..."
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Lignes :</span>
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent font-bold outline-none cursor-pointer dark:text-white">
                <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b dark:border-gray-700">
                <th onClick={() => requestSort('id')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none">ID {getSortIcon('id')}</th>
                <th onClick={() => requestSort('nom')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none">Client {getSortIcon('nom')}</th>
                <th onClick={() => requestSort('telephone')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Contact {getSortIcon('telephone')}</th>
                <th onClick={() => requestSort('montant_total')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-right">Montant {getSortIcon('montant_total')}</th>
                <th onClick={() => requestSort('statut_livraison')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none text-center">Livraison {getSortIcon('statut_livraison')}</th>
                <th className="px-6 py-4 text-center">Statut Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {currentItems.length > 0 ? currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-cyan-50/50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer" onClick={() => handleCommandeClick(item)}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">#{item.id}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{new Date(item.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 mr-4 flex items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{item.nom?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{item.nom}</div>
                        <div className="text-[11px] text-gray-400 italic truncate max-w-[180px]">{item.adresse}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300">{item.telephone}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">{item.montant_total} {currentSymbol}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border capitalize ${
                      item.statut_livraison === 'livre' 
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : item.statut_livraison === 'en_cours' 
                        ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                    }`}>
                      {item.statut_livraison?.replace('_', ' ')?.toUpperCase() || 'EN ATTENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border capitalize ${
                      item.statut_paiement === 'paye' 
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                    }`}>
                      {item.statut_paiement?.replace('_', ' ')?.toUpperCase() || 'NON PAYE'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">{searchQuery ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium italic">Affichage {filteredAndSortedItems.length > 0 ? indexOfFirstItem + 1 : 0} à {Math.min(indexOfLastItem, filteredAndSortedItems.length)} sur {filteredAndSortedItems.length} entrées</p>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white transition-all">PRÉCÉDENT</button>
            <div className="flex gap-1 px-4 text-xs font-black text-gray-500 dark:text-gray-400">{currentPage} / {totalPages || 1}</div>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white transition-all">SUIVANT</button>
          </div>
        </div>
      </div>

      {/* Popup Facture Commande */}
      {showDetails && selectedCommande && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center p-4 z-50" onClick={closeDetails}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FACTURE</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Commande #{selectedCommande.id}</p>
                </div>
                <button 
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Informations Client */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Informations Client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Nom</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCommande.nom}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Téléphone</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCommande.telephone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Adresse</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCommande.adresse}</p>
                  </div>
                </div>
              </div>

              {/* Détails Produits */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Détails des Produits</h3>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Produit</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Quantité</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Prix Unit.</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {commandeDetails.map((detail, index) => (
                        <tr key={detail.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {detail.products?.name || 'Produit inconnu'}
                              </p>
                              {detail.products?.category && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {detail.products.category}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">
                            {detail.quantite_acheter}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                            {detail.prix_unitaire} {currentSymbol}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                            {(detail.quantite_acheter * detail.prix_unitaire).toFixed(2)} {currentSymbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Statut Livraison:</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border capitalize ${
                        selectedCommande.statut_livraison === 'livre' 
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                          : selectedCommande.statut_livraison === 'en_cours' 
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                      }`}>
                        {selectedCommande.statut_livraison?.replace('_', ' ')?.toUpperCase() || 'EN ATTENTE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Statut Paiement:</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border capitalize ${
                        selectedCommande.statut_paiement === 'paye' 
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                      }`}>
                        {selectedCommande.statut_paiement?.replace('_', ' ')?.toUpperCase() || 'NON PAYE'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Montant Total</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedCommande.montant_total} {currentSymbol}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Date de commande:</span>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(selectedCommande.created_at).toLocaleDateString('fr-FR', {
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

export default CommandeList;