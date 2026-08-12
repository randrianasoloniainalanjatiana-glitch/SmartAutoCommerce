import React, { useEffect, useState } from "react";
import axios from "axios";
import { DJANGO_API } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { RefreshCcw } from "lucide-react";

export default function HistoriqueCommandes() {
  const { user } = useAuth();
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
      const res = await axios.get(`${DJANGO_API}/livreur/commandes/historique/${userId}/`);
      setItems(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur chargement historique.");
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Historique</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} commande(s) livrée(s)</p>
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
          Aucun historique.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400">Commande #{c.id}</div>
              <div className="text-lg font-black text-gray-900 dark:text-white">
                {c?.nom || c?.client?.nom || "Client"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <span className="font-semibold">Montant:</span>{" "}
                <span className="font-black text-cyan-600 dark:text-cyan-400">{c.montant_total ?? "—"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                  Livraison: {c.statut_livraison || "—"}
                </span>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                  Paiement: {c.statut_paiement || "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

