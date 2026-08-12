import React, { useEffect, useState } from "react";
import axios from "axios";
import { DJANGO_API } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { RefreshCcw, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CommandesALivrer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const userId = user?.id || user?.utilisateur_id || user?.livreur_id;
    if (!userId) {
      setError("Utilisateur non identifié.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const userId = user?.id || user?.utilisateur_id || user?.livreur_id;
      const res = await axios.get(`${DJANGO_API}/livreur/commandes/en-cours/${userId}/`);
      setItems(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur chargement commandes.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.utilisateur_id, user?.livreur_id]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Commandes à livrer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} commande(s)</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 italic">
          Aucune commande en cours.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Commande #{c.id}</div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {c?.nom || c?.client?.nom || "Client"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    <span className="font-semibold">Adresse:</span> {c?.adresse || c?.client?.adresse || "—"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">Téléphone:</span> {c?.telephone || c?.client?.telephone || "—"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    <span className="font-semibold">Montant:</span>{" "}
                    <span className="font-black text-cyan-600 dark:text-cyan-400">
                      {c.montant_total ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-col sm:items-end">
                  <button
                    onClick={() => navigate(`/espace-livreur/commandes/${c.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white font-black text-xs hover:bg-cyan-700 transition-colors"
                  >
                    <Eye size={16} /> Détails
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

