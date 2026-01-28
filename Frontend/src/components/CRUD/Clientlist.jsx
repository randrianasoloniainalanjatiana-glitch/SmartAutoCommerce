import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';



const ClientList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // CORRECTION : On initialise la clé à null pour respecter le tri de la base de données au chargement
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/client/');
        if (response.data) setItems(response.data);
      } catch (error) {
        console.error("Erreur Django/CORS:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  return (
    
    
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider text-[11px]">
                Nom du Contact
              </th>
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider text-[11px]">
                Localisation
              </th>
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider text-[11px] text-right">
                Coordonnées
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length > 0 ? (
              items.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50 transition-all duration-200 group"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 group-hover:text-blue-600">
                      {item.nom}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{item.adresse}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {item.telephone}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">
                  Aucune donnée disponible
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export default ClientList;