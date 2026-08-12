import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, CheckCircle2, Coins, RefreshCcw, Truck } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { DJANGO_API } from "../../config/apiConfig";

export default function CommandeDetail() {
  const { user } = useAuth();
  const { currentSymbol } = useSettings();
  const navigate = useNavigate();
  const { commandeId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [commande, setCommande] = useState(null);
  const [details, setDetails] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingPatch, setPendingPatch] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
        `${DJANGO_API}/livreur/commandes/detail/${userId}/${commandeId}/`
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

  const total = useMemo(() => {
    if (typeof commande?.montant_total === "number") return commande.montant_total;
    const sum = details.reduce((acc, d) => acc + Number(d?.quantite_acheter || 0) * Number(d?.prix_unitaire || 0), 0);
    return Number.isFinite(sum) ? sum : null;
  }, [commande?.montant_total, details]);

  const updateStatus = async (patch) => {
    if (!userId) return;
    setSaving(true);
    setError("");
    try {
      const res = await axios.put(
        `${DJANGO_API}/livreur/commandes/${userId}/${commandeId}/`,
        patch
      );
      // L'endpoint retourne la commande mise à jour (sans jointure client),
      // on conserve la commande existante et on remplace les champs statut.
      setCommande((prev) => ({ ...(prev || {}), ...(res.data || {}) }));
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur mise à jour statut.");
    } finally {
      setSaving(false);
    }
  };

  const requestProtectedUpdate = (patch) => {
    setPendingPatch(patch);
    setPassword("");
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const verifyAndSubmit = async () => {
    if (!pendingPatch) return;
    if (!password) {
      setPasswordError("Veuillez entrer votre mot de passe.");
      return;
    }
    setSaving(true);
    setPasswordError("");
    try {
      const res = await axios.post(`${DJANGO_API}/verify-password-livreur/`, {
        email: user?.email,
        password,
        user_id: userId,
      });
      if (!res.data?.valid) {
        setPasswordError("Mot de passe incorrect.");
        return;
      }
      setShowPasswordModal(false);
      const patch = pendingPatch;
      setPendingPatch(null);
      await updateStatus(patch);
    } catch (e) {
      setPasswordError(e?.response?.data?.error || "Erreur lors de la vérification du mot de passe.");
    } finally {
      setSaving(false);
    }
  };

  const statutLivraison = commande?.statut_livraison;
  const statutPaiement = commande?.statut_paiement;
  const canStart = statutLivraison !== "en_cours" && statutLivraison !== "livre";
  const isInProgress = statutLivraison === "en_cours";
  const isPaid = statutPaiement === "paye";

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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Commande #{commande.id}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {commande?.created_at ? new Date(commande.created_at).toLocaleString("fr-FR") : ""}
          </p>
        </div>

        <button
          onClick={fetchDetail}
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

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">Informations client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Nom</div>
            <div className="font-bold text-gray-900 dark:text-white">{commande?.nom || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Téléphone</div>
            <div className="font-bold text-gray-900 dark:text-white">{commande?.telephone || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Adresse</div>
            <div className="font-bold text-gray-900 dark:text-white">{commande?.adresse || "—"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">Détails des produits</h2>
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
                    Aucun produit trouvé pour cette commande.
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
                          <div className="text-xs text-gray-500 dark:text-gray-400">{d.products.category}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{qte}</td>
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
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">Statut livraison:</span>{" "}
              <span className="font-black">{statutLivraison || "—"}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">Statut paiement:</span>{" "}
              <span className="font-black">{statutPaiement || "—"}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Montant total</div>
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {total ?? commande?.montant_total ?? "—"} {currentSymbol}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canStart ? (
            <button
              disabled={saving}
              onClick={() => updateStatus({ statut_livraison: "en_cours" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white font-black text-xs hover:bg-cyan-700 disabled:opacity-50 transition-colors"
            >
              <Truck size={16} /> Commencer la livraison
            </button>
          ) : (
            <>
              <button
                disabled={saving || statutLivraison === "livre"}
                onClick={() =>
                  requestProtectedUpdate(
                    isPaid ? { statut_livraison: "livre" } : { statut_livraison: "livre", statut_paiement: "paye" }
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-black text-xs hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 size={16} /> Confirmer livraison
              </button>
              {!isPaid && (
                <button
                  disabled={saving}
                  onClick={() => requestProtectedUpdate({ statut_paiement: "paye" })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-gray-900 font-black text-xs hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                >
                  <Coins size={16} /> Confirmer paiement
                </button>
              )}
              {isInProgress && isPaid && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold self-center">
                  Paiement confirmé. Vous pouvez terminer la livraison.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal mot de passe pour validation */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/40 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-black text-gray-900 dark:text-white">Confirmation</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Entrez votre mot de passe pour valider cette action.
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingPatch(null);
                }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <ArrowLeft size={16} />
              </button>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyAndSubmit()}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-800 focus:ring-2 outline-none transition-all"
              placeholder="Votre mot de passe"
              autoFocus
            />
            {passwordError && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                {passwordError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingPatch(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                disabled={saving}
                onClick={verifyAndSubmit}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-black text-sm hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

