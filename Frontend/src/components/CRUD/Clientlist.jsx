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
  return(
    <div>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Adresse</th>
            <th>Telephone</th>
          </tr>
        </thead>
        <tbody>

          {items.map((item) =>(
            <tr key = {item.id}>
              <td>{item.nom}</td>
              <td>{item.adresse}</td> 
              <td>{item.telephone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ClientList;