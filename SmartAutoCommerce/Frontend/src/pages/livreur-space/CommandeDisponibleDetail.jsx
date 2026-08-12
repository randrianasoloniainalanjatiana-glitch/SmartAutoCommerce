import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { DJANGO_API } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, RefreshCcw, Truck } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";

export default function CommandeDisponibleDetail() {
  const { user } = useAuth();
  const { currentSymbol } = useSettings();
  const navigate = useNavigate();
  const { commandeId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [commande, setCommande] = useState(null);
  const [details, setDetails] = useState([]);

  const userId = user?.id || user?.utilisateur_id || user?.livreur_id;

  const fetchDetail = async () => {
    if (!userId) {
      setError("Utilisateur non identifié.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${DJANGO_API}/livreur/commandes/disponibles/detail/${userId}/${commandeId}/`
      );
      setCommande(res.data?.commande || null);
      setDetails(res.data?.details || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur chargement détail commande.");
      setCommande(null);
      setDetails([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, commandeId]);

  const takeCommande = async () => {
    if (!userId) return;
    setSaving(true);
    setError("");
    try {
      await axios.put(
        `${DJANGO_API}/livreur/commandes/prendre/${userId}/${commandeId}/`,
        {}
      );
      navigate(`/espace-livreur/commandes/${commandeId}`);
    } catch (e) {
      setError(e?.response?.data?.error || "Impossible de prendre cette commande.");
    } finally {
      setSaving(false);
    }
  };

  const total = details.reduce((acc, d) => {
    const qte = Number(d?.quantite_acheter || 0);
    const pu = Number(d?.prix_unitaire || 0);
    return acc + qte * pu;
  }, 0);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Commande #{commande.id}
          </h1>
        </div>

        <button
          onClick={fetchDetail}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={saving}
        >
          <RefreshCcw size={16} /> Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">
          Informations client
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
              Nom
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {commande?.nom || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
              Téléphone
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {commande?.telephone || "—"}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
              Adresse
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {commande?.adresse || "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">
          Détails des produits
        </h2>
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/40">
              <tr className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-300 font-black">
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-center">Qté</th>
                <th className="px-4 py-3 text-right">Prix unit.</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {details.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 italic">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : (
                details.map((d) => {
                  const qte = Number(d?.quantite_acheter || 0);
                  const pu = Number(d?.prix_unitaire || 0);
                  const lineTotal = qte * pu;
                  return (
                    <tr key={d.id} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {d?.products?.name || "Produit inconnu"}
                        </div>
                        {d?.products?.category && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {d.products.category}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                        {qte}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {pu} {currentSymbol}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                        {Number.isFinite(lineTotal) ? lineTotal.toFixed(2) : "—"} {currentSymbol}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">Statut livraison:</span>{" "}
              <span className="font-black">{commande?.statut_livraison || "—"}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">Statut paiement:</span>{" "}
              <span className="font-black">{commande?.statut_paiement || "—"}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">
              Montant total
            </div>
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {Number.isFinite(total) ? total.toFixed(2) : commande?.montant_total} {currentSymbol}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={saving}
            onClick={takeCommande}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white font-black text-xs hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            <Truck size={16} /> Livrer cette commande
          </button>
        </div>
      </div>
    </div>
  );
}

