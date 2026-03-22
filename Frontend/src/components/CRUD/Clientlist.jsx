import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const ClientList = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = user?.id
          ? `http://localhost:8000/api/client/?user_id=${user.id}`
          : 'http://localhost:8000/api/client/';
        const response = await axios.get(url);
        if (response.data) setItems(response.data);
      } catch (error) {
        console.error("Erreur Django/CORS:", error);
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
        item.telephone?.toLowerCase().includes(searchQuery.toLowerCase())
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

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">

        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">LISTE CLIENTS</h1>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Rechercher par nom, adresse ou téléphone..."
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-80 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Lignes :</span>
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-transparent font-bold outline-none cursor-pointer dark:text-white">
                <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 dark:border-gray-800">
                <th onClick={() => requestSort('nom')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none font-medium">Nom du Contact {getSortIcon('nom')}</th>
                <th onClick={() => requestSort('adresse')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none font-medium">Localisation {getSortIcon('adresse')}</th>
                <th onClick={() => requestSort('telephone')} className="px-6 py-4 cursor-pointer hover:text-cyan-600 select-none font-medium text-right">Coordonnées {getSortIcon('telephone')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {currentItems.length > 0 ? currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 mr-4 flex items-center justify-center shadow-sm">
                        <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{item.nom?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-300">{item.nom}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm truncate max-w-[250px]">{item.adresse || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-500/20">{item.telephone}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-500">{searchQuery ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium italic">Affichage {filteredAndSortedItems.length > 0 ? indexOfFirstItem + 1 : 0} à {Math.min(indexOfLastItem, filteredAndSortedItems.length)} sur {filteredAndSortedItems.length} entrées</p>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-all">PRÉCÉDENT</button>
            <div className="flex gap-1 px-4 text-xs font-black text-gray-500 dark:text-gray-400">{currentPage} / {totalPages || 1}</div>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold shadow-sm disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-all">SUIVANT</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;